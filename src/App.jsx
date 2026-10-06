import { useEffect, useState } from "react";

const api = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
};

const Logo = () => <div className="logo"><span className="logo-mark">P</span><span>Pine</span></div>;

function Field({ label, ...props }) {
  return <label className="field"><span>{label}</span><input {...props} /></label>;
}

function Auth({ register, setRegister, setUser }) {
  const [name,setName]=useState(""),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const submit=async e=>{e.preventDefault();setBusy(true);setError("");try{const d=await api(register?"/api/auth/register":"/api/auth/login",{method:"POST",body:JSON.stringify(register?{name,email,password}:{email,password})});setUser(d.user)}catch(e){setError(e.message)}finally{setBusy(false)}};
  return <div className="auth-page">
    <section className="auth-intro"><div className="eyebrow">PINE ACCOUNT</div><h1>Everything Pine.<br/><em>One account.</em></h1><p>Una identidad para tus servicios Pine, tus datos y tus herramientas de desarrollo.</p><div className="intro-points"><span>◉ Tus datos, sincronizados</span><span>◉ Una cuenta para Pine</span><span>◉ Developer tools cuando las necesites</span></div></section>
    <section className="auth-card"><Logo/><div className="auth-title"><h2>{register?"Crea tu Pine Account":"Inicia sesión"}</h2><p>{register?"Empieza con una sola cuenta.":"Continúa con tu cuenta Pine."}</p></div>
      <form onSubmit={submit}>{register&&<Field label="Nombre" value={name} onChange={e=>setName(e.target.value)} autoComplete="name" autoFocus/>}<Field label="Correo electrónico" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" autoFocus={!register}/><Field label="Contraseña" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={register?"new-password":"current-password"}/>{error&&<div className="error-message">{error}</div>}<button className="primary-button" disabled={busy}>{busy?(register?"Creando…":"Entrando…"):(register?"Crear cuenta":"Continuar")}<b>→</b></button></form>
      <div className="switch">{register?"¿Ya tienes una cuenta?":"¿No tienes Pine Account?"} <button onClick={()=>setRegister(!register)}>{register?"Inicia sesión":"Créala ahora"}</button></div><div className="legal">Privacy · Terms</div>
    </section>
  </div>;
}

function Account({ user, setUser, setDev }) {
  const [out,setOut]=useState(false);
  const logout=async()=>{setOut(true);try{await api("/api/auth/logout",{method:"POST"});setUser(null);setDev(false)}finally{setOut(false)}};
  return <div className="dashboard">
    <section className="dashboard-hero"><div><div className="eyebrow">PINE ACCOUNT</div><h1>Tu cuenta.</h1><p>Tu identidad Pine y el centro de acceso a tus servicios.</p></div><button className="ghost-button" onClick={logout} disabled={out}>{out?"Saliendo…":"Cerrar sesión"}</button></section>
    <section className="identity-card"><div className="big-avatar">{(user.name||user.email)[0].toUpperCase()}</div><div className="identity-copy"><span>Cuenta Pine</span><h2>{user.name||"Tu cuenta"}</h2><p>{user.email}</p></div><span className="active-badge">● Activa</span></section>
    <div className="dashboard-grid">
      <article className="feature-card"><div className="feature-icon">⌁</div><span className="card-kicker">CUENTA</span><h3>Datos personales</h3><p>Nombre, correo y estado de tu identidad Pine.</p><div className="detail-list"><div><span>Nombre</span><b>{user.name||"No establecido"}</b></div><div><span>Email</span><b>{user.email}</b></div></div></article>
      <article className="feature-card dark"><div className="feature-icon">⌘</div><span className="card-kicker">DEVELOPER</span><h3>Pine Developer</h3><p>Crea y administra tu identidad de desarrollador y sus credenciales.</p><button className="light-button" onClick={()=>setDev(true)}>Abrir Developer →</button></article>
    </div>
    <div className="section-title"><span>Servicios</span><h2>Tu ecosistema Pine</h2></div>
    <div className="service-grid"><div><b>Account Data</b><span>Datos sincronizados entre dispositivos.</span></div><div><b>Developer Account</b><span>Herramientas y credenciales de desarrollo.</span></div><div><b>Sessions</b><span>Sesión segura y persistente.</span></div></div>
  </div>;
}

function Developer({ setDev }) {
  const [account,setAccount]=useState(null),[busy,setBusy]=useState(true),[creating,setCreating]=useState(false),[error,setError]=useState(""),[section,setSection]=useState("Account");
  const load=async()=>{setBusy(true);try{const d=await api("/api/developer");setAccount(d.account)}catch(e){setError(e.message)}finally{setBusy(false)}};
  useEffect(()=>{load()},[]);
  const create=async()=>{setCreating(true);try{const d=await api("/api/developer",{method:"POST"});setAccount(d.account)}catch(e){setError(e.message)}finally{setCreating(false)}};
  const cols=[["ID","id"],["User ID","user_id"],["Name","name"],["Email","email"],["Company","company"],["Website","website"],["Description","description"],["Plan","plan"],["Status","status"],["API key","api_key"],["API key created","api_key_created_at"],["Created","created_at"],["Updated","updated_at"]];
  return <div className="developer-page">
    <div className="developer-hero"><button className="back-button" onClick={()=>setDev(false)}>← Account</button><div className="developer-brand"><div>⌘</div><span>Pine Developer</span></div><h1>Build with Pine.</h1><p>La identidad de desarrollador y las credenciales de tu cuenta, en un solo lugar.</p></div>
    <div className="dev-tabs">{["Account","Projects","Credentials","Services"].map(x=><button className={section===x?"selected":""} onClick={()=>setSection(x)} key={x}>{x}</button>)}</div>
    {section==="Account"&&<section className="dev-panel">{busy?<div className="loading">Cargando Developer Account…</div>:account?<><div className="panel-head"><div><span className="card-kicker">DEVELOPER ACCOUNT</span><h2>Account details</h2></div><span className="active-badge">{account.status||"active"}</span></div><div className="data-table">{cols.map(([label,key])=><div key={key}><span>{label}</span><b className={key==="api_key"?"mono":""}>{account[key]||"—"}</b></div>)}</div></>:<div className="empty-state"><h2>Aún no tienes Developer Account</h2><p>Crea tu cuenta de desarrollador para obtener identidad y API key.</p><button className="primary-button compact" onClick={create} disabled={creating}>{creating?"Creando…":"Crear Developer Account"}<b>→</b></button></div>}</section>}
    {section!=="Account"&&<section className="dev-panel empty-state"><div className="feature-icon">✦</div><h2>{section}</h2><p>{section==="Projects"?"Tus proyectos Pine aparecerán aquí.":section==="Credentials"?"Gestiona tus credenciales de desarrollador aquí.":"Servicios Pine conectados a tu cuenta."}</p></section>}
    {error&&<div className="error-message">{error}</div>}
  </div>;
}

export default function App(){
  const [user,setUser]=useState(null),[register,setRegister]=useState(false),[developer,setDeveloper]=useState(false),[loading,setLoading]=useState(true);
  useEffect(()=>{api("/api/auth/me").then(d=>setUser(d.user)).catch(()=>setUser(null)).finally(()=>setLoading(false))},[]);
  if(loading)return <div className="boot"><Logo/><span/></div>;
  return <div className="site"><header className="global-header"><Logo/><nav>{!user?<><button onClick={()=>{setRegister(false);setDeveloper(false)}}>Iniciar sesión</button><button className="nav-cta" onClick={()=>{setRegister(true);setDeveloper(false)}}>Crear cuenta</button></>:<button onClick={()=>setDeveloper(!developer)}>{developer?"Cuenta":"Developer"}</button>}</nav></header><main>{user?(developer?<Developer setDev={setDeveloper}/>:<Account user={user} setUser={setUser} setDev={setDeveloper}/>):<Auth register={register} setRegister={setRegister} setUser={setUser}/>}</main><footer><Logo/><span>Pine Account · Privacy · Terms</span></footer></div>;
}
