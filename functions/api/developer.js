const getUser = async (c) => {
  const cookie = c.request.headers.get("Cookie") || "";
  const match = cookie.match(/pine_session=([^;]+)/);
  if (!match) return null;

  const e = new TextEncoder();
  const k = await crypto.subtle.importKey(
    "raw",
    e.encode(match[1]),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: e.encode("pine-session"),
      iterations: 100000,
      hash: "SHA-256",
    },
    k,
    256
  );
  const hash = btoa(String.fromCharCode(...new Uint8Array(bits)));

  return c.env.accounts
    .prepare(
      "SELECT u.id, u.name, u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>datetime('now')"
    )
    .bind(hash)
    .first();
};

const ensureTable = async (db) => {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS developer_accounts(
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
      )`
    )
    .run();
};

export async function onRequestGet(c) {
  try {
    const user = await getUser(c);
    if (!user) return Response.json({ error: "Sign in to continue." }, { status: 401 });

    const db = c.env.developeraccounts;
    await ensureTable(db);

    const account = await db
      .prepare(
        "SELECT id,user_id,name,email,company,website,description,plan,status,api_key,api_key_created_at,created_at,updated_at FROM developer_accounts WHERE user_id=?"
      )
      .bind(user.id)
      .first();

    return Response.json({ account: account || null });
  } catch (e) {
    return Response.json({ error: e?.message || "Developer account failed" }, { status: 500 });
  }
}

export async function onRequestPost(c) {
  try {
    const user = await getUser(c);
    if (!user) return Response.json({ error: "Sign in to continue." }, { status: 401 });

    const db = c.env.developeraccounts;
    await ensureTable(db);

    const existing = await db
      .prepare("SELECT id,user_id,name,email,company,website,description,plan,status,api_key,api_key_created_at,created_at,updated_at FROM developer_accounts WHERE user_id=?")
      .bind(user.id)
      .first();

    if (existing) return Response.json({ ok: true, existing: true, account: existing });

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const apiKey = `pine_${crypto.randomUUID().replaceAll("-", "")}`;

    await db
      .prepare(
        "INSERT INTO developer_accounts(id,user_id,name,email,company,website,description,plan,status,api_key,api_key_created_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)"
      )
      .bind(
        id,
        user.id,
        user.name || "",
        user.email,
        null,
        null,
        null,
        "free",
        "active",
        apiKey,
        now,
        now,
        now
      )
      .run();

    const account = await db
      .prepare("SELECT id,user_id,name,email,company,website,description,plan,status,api_key,api_key_created_at,created_at,updated_at FROM developer_accounts WHERE id=?")
      .bind(id)
      .first();

    return Response.json({ ok: true, account }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e?.message || "Developer account failed" }, { status: 500 });
  }
}
