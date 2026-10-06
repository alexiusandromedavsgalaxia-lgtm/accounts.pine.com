const DATABASES={accounts:"accounts",developeraccounts:"developeraccounts"};
export async function onRequestGet(context){
  const bindingName=DATABASES[context.params.database];
  if(!bindingName||!context.env[bindingName]) return Response.json({error:"Unknown database"},{status:404});
  const db=context.env[bindingName];
  try{
    const tablesResult=await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
    const tables=(tablesResult.results||[]).map(row=>row.name);
    const table=tables[0]||null;
    if(!table) return Response.json({database:context.params.database,tables:[],schema:[],rows:[]});
    const safeTable='"'+table.replace(/"/g,'""')+'"';
    const schemaResult=await db.prepare("PRAGMA table_info("+safeTable+")").all();
    const rowsResult=await db.prepare("SELECT * FROM "+safeTable+" LIMIT 100").all();
    return Response.json({database:context.params.database,tables,table,schema:schemaResult.results||[],rows:rowsResult.results||[]},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Database query failed"},{status:500});}
}
