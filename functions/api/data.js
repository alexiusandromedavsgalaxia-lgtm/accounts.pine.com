const json = (data, status = 200) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

const getUser = async (c) => {
  const cookie = c.request.headers.get("Cookie") || "";
  const match = cookie.match(/pine_session=([^;]+)/);
  if (!match) return null;

  const e = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", e.encode(match[1]), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: e.encode("pine-session"), iterations: 100000, hash: "SHA-256" },
    k,
    256
  );
  const hash = btoa(String.fromCharCode(...new Uint8Array(bits)));

  return c.env.accounts
    .prepare(
      "SELECT u.id,u.name,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>datetime('now')"
    )
    .bind(hash)
    .first();
};

const developerColumns =
  "id,user_id,name,email,company,website,description,plan,status,api_key,api_key_created_at,created_at,updated_at";

const ensureDeveloperTable = async (db) => {
  await db.prepare(`CREATE TABLE IF NOT EXISTS developer_accounts(
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    website TEXT,
    description TEXT,
    plan TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    api_key TEXT,
    api_key_created_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`).run();
};

const ensureDataTable = async (db) => {
  await db.prepare(`CREATE TABLE IF NOT EXISTS account_data(
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id,key)
  )`).run();
};

const getScope = (url) => {
  const scope = new URL(url).searchParams.get("scope");
  return ["account", "developer", "data"].includes(scope) ? scope : null;
};

export async function onRequest(c) {
  try {
    const user = await getUser(c);
    if (!user) return json({ error: "Sign in to continue." }, 401);

    const scope = getScope(c.request.url);
    if (!scope) {
      return json({
        error: "Missing or invalid scope.",
        scopes: ["account", "developer", "data"],
      }, 400);
    }

    if (c.request.method === "GET") {
      if (scope === "account") {
        const account = await c.env.accounts
          .prepare("SELECT id,name,email,created_at FROM users WHERE id=?")
          .bind(user.id)
          .first();
        return json({ scope, account });
      }

      if (scope === "developer") {
        await ensureDeveloperTable(c.env.developeraccounts);
        const account = await c.env.developeraccounts
          .prepare(`SELECT ${developerColumns} FROM developer_accounts WHERE user_id=?`)
          .bind(user.id)
          .first();
        return json({ scope, account: account || null });
      }

      await ensureDataTable(c.env.dataacc);
      const rows = await c.env.dataacc
        .prepare("SELECT id,key,value,created_at,updated_at FROM account_data WHERE user_id=? ORDER BY key")
        .bind(user.id)
        .all();
      return json({ scope, data: rows.results || [] });
    }

    if (c.request.method !== "PUT" && c.request.method !== "POST") {
      return json({ error: "Method not allowed." }, 405);
    }

    const body = await c.request.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "A JSON object is required." }, 400);

    if (scope === "account") {
      const name = body.name === undefined ? user.name : String(body.name).trim().slice(0, 80);
      const email = body.email === undefined ? user.email : String(body.email).trim().toLowerCase();

      if (!name || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
        return json({ error: "Enter a valid name and email." }, 400);
      }

      const duplicate = await c.env.accounts
        .prepare("SELECT id FROM users WHERE email=? AND id<>?")
        .bind(email, user.id)
        .first();
      if (duplicate) return json({ error: "That email is already in use." }, 409);

      await c.env.accounts
        .prepare("UPDATE users SET name=?,email=? WHERE id=?")
        .bind(name, email, user.id)
        .run();

      const account = await c.env.accounts
        .prepare("SELECT id,name,email,created_at FROM users WHERE id=?")
        .bind(user.id)
        .first();

      return json({ ok: true, scope, account });
    }

    if (scope === "developer") {
      await ensureDeveloperTable(c.env.developeraccounts);

      const allowed = ["name", "email", "company", "website", "description"];
      const sets = [];
      const values = [];

      for (const key of allowed) {
        if (body[key] !== undefined) {
          sets.push(`${key}=?`);
          values.push(String(body[key]).trim().slice(0, key === "description" ? 2000 : 300));
        }
      }

      if (!sets.length) return json({ error: "No editable developer fields supplied." }, 400);

      if (body.email !== undefined) {
        const email = String(body.email).trim().toLowerCase();
        if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
          return json({ error: "Enter a valid email." }, 400);
        }
        const index = values.findIndex((v, i) => sets[i] === "email=?");
        if (index >= 0) values[index] = email;
      }

      sets.push("updated_at=?");
      values.push(new Date().toISOString(), user.id);

      await c.env.developeraccounts
        .prepare(`UPDATE developer_accounts SET ${sets.join(",")} WHERE user_id=?`)
        .bind(...values)
        .run();

      const account = await c.env.developeraccounts
        .prepare(`SELECT ${developerColumns} FROM developer_accounts WHERE user_id=?`)
        .bind(user.id)
        .first();

      return json({ ok: true, scope, account });
    }

    await ensureDataTable(c.env.dataacc);

    const key = String(body.key || "").trim().slice(0, 120);
    if (!key) return json({ error: "A data key is required." }, 400);

    const value = body.value === undefined ? null :
      typeof body.value === "string" ? body.value :
      JSON.stringify(body.value);

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await c.env.dataacc
      .prepare(`INSERT INTO account_data(id,user_id,key,value,created_at,updated_at)
        VALUES(?,?,?,?,?,?)
        ON CONFLICT(user_id,key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`)
      .bind(id, user.id, key, value, now, now)
      .run();

    const item = await c.env.dataacc
      .prepare("SELECT id,key,value,created_at,updated_at FROM account_data WHERE user_id=? AND key=?")
      .bind(user.id, key)
      .first();

    return json({ ok: true, scope, data: item }, 201);
  } catch (e) {
    return json({ error: e?.message || "Data operation failed." }, 500);
  }
}
