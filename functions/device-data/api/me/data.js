const json=(data,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
async function user(c){
  const m=(c.request.headers.get("Cookie")||"").match(/pine_session=([^;]+)/); if(!m)return null;
  const e=new TextEncoder(),k=await crypto.subtle.importKey("raw",e.encode(m[1]),"PBKDF2",false,["deriveBits"]);
  const b=await crypto.subtle.deriveBits({name:"PBKDF2",salt:e.encode("pine-session"),iterations:100000,hash:"SHA-256"},k,256);
  return c.env.accounts.prepare("SELECT u.id,u.name,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>datetime('now')").bind(btoa(String.fromCharCode(...new Uint8Array(b)))).first();
}
async function table(db){await db.prepare(`CREATE TABLE IF NOT EXISTS account_data(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,key TEXT NOT NULL,value TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(user_id,key))`).run();}
export async function onRequest(c){
  try{
    const u=await user(c); if(!u)return json({error:"Sign in to continue."},401);
    const q=new URL(c.request.url).searchParams.get("user_id")||u.id;
    if(q!==u.id)return json({error:"You can only access your own synchronized data."},403);
    await table(c.env.dataacc);
    if(c.request.method==="GET"){
      const r=await c.env.dataacc.prepare("SELECT id,user_id,key,value,created_at,updated_at FROM account_data WHERE user_id=? ORDER BY key").bind(u.id).all();
      return json({user_id:u.id,data:r.results||[]});
    }
    if(c.request.method!=="POST"&&c.request.method!=="PUT")return json({error:"Method not allowed."},405);
    const body=await c.request.json().catch(()=>null); if(!body||typeof body!=="object")return json({error:"A JSON object is required."},400);
    const key=String(body.key||"").trim().slice(0,120); if(!key)return json({error:"A data key is required."},400);
    const value=body.value===undefined?null:typeof body.value==="string"?body.value:JSON.stringify(body.value),now=new Date().toISOString(),id=crypto.randomUUID();
    await c.env.dataacc.prepare(`INSERT INTO account_data(id,user_id,key,value,created_at,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).bind(id,u.id,key,value,now,now).run();
    const item=await c.env.dataacc.prepare("SELECT id,user_id,key,value,created_at,updated_at FROM account_data WHERE user_id=? AND key=?").bind(u.id,key).first();
    return json({ok:true,user_id:u.id,data:item},201);
  }catch(e){return json({error:e?.message||"Device data operation failed."},500);}
}