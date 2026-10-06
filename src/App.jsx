import {useEffect,useMemo,useState} from "react";
const databases=[{id:"accounts",label:"Accounts",description:"Primary account database"},{id:"developeraccounts",label:"Developer accounts",description:"Developer account database"}];
async function getJson(url){const r=await fetch(url);const d=await r.json();if(!r.ok)throw new Error(d.error||"Request failed");return d}
export default function App(){
 const [db,setDb]=useState("accounts"),[data,setData]=useState({tables:[],rows:[],schema:[]}),[loading,setLoading]=useState(true),[error,setError]=useState(""),[search,setSearch]=useState("");
 useEffect(()=>{let stop=false;setLoading(true);setError("");getJson("/api/database/"+db).then(d=>{if(!stop)setData(d)}).catch(e=>{if(!stop)setError(e.message)}).finally(()=>{if(!stop)setLoading(false)});return()=>{stop=true}},[db]);
 const columns=useMemo(()=>data.schema.length?data.schema.map(x=>x.name):data.rows.length?Object.keys(data.rows[0]):[],[data]);
 const rows=useMemo(()=>{const q=search.trim().toLowerCase();return q?data.rows.filter(x=>JSON.stringify(x).toLowerCase().includes(q)):data.rows},[data.rows,search]);
 return <div className="shell">
  <aside><div className="brand"><b>P</b><span><strong>Pine</strong><small>Accounts</small></span></div><p className="label">DATABASES</p>
   {databases.map(x=><button className={"db "+(db===x.id?"active":"")} onClick={()=>setDb(x.id)} key={x.id}><i>▦</i><span><strong>{x.label}</strong><small>{x.description}</small></span><em>›</em></button>)}
   <footer><span className="dot"/> Cloudflare Pages<small>D1 through Functions</small></footer>
  </aside>
  <main><header><div><p className="eyebrow">PINE / ACCOUNTS</p><h1>{db==="accounts"?"Accounts":"Developer accounts"}</h1></div><div className="connected"><span className="dot"/> Connected</div></header>
   <section className="hero"><div><span className="pill">D1 DATABASE</span><h2>{db==="accounts"?"Account data":"Developer account data"}</h2><p>Data is loaded server-side through Cloudflare Pages Functions.</p></div><div className="stats"><div><b>{data.tables.length}</b><span>tables</span></div><div><b>{data.rows.length}</b><span>preview rows</span></div><div><b>{columns.length}</b><span>columns</span></div></div></section>
   <section className="panel"><div className="panel-head"><div><h3>Data preview</h3><p>First 100 rows from the first available table.</p></div><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search data..."/></div>
    {loading&&<div className="empty">Loading database…</div>}
    {!loading&&error&&<div className="error"><strong>Couldn’t load this database</strong><span>{error}</span></div>}
    {!loading&&!error&&!data.tables.length&&<div className="empty"><strong>No tables found</strong><span>The D1 database is connected, but it has no user tables.</span></div>}
    {!loading&&!error&&data.tables.length&&!data.rows.length&&<div className="empty"><strong>No rows yet</strong><span>Table <code>{data.tables[0]}</code> exists but has no records.</span></div>}
    {!loading&&!error&&rows.length>0&&<div className="table-wrap"><table><thead><tr>{columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{columns.map(c=><td key={c}>{r[c]===null||r[c]===undefined?"null":typeof r[c]==="object"?JSON.stringify(r[c]):String(r[c])}</td>)}</tr>)}</tbody></table></div>}
   </section>
   <section className="schema"><div><p className="eyebrow">SCHEMA</p><h3>Available tables</h3></div><div className="table-list">{data.tables.map(t=><span key={t}>{t}</span>)}</div></section>
  </main>
 </div>
}