// Ejecuta SQL de los handlers sobre PostgreSQL embebido (PGlite) con esquema y datos ficticios.
// El transporte de Neon se sustituye por un adaptador local de consultas diferidas.
// No se conecta a Neon. No demuestra compatibilidad con restricciones adicionales de producción.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath, pathToFileURL} from 'node:url';
const {PGlite}=await import(process.env.QA_PGLITE_MODULE || '@electric-sql/pglite');
const project=path.resolve(process.argv[2]||'.');
const out=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../evidencias');
await fs.mkdir(out,{recursive:true});
const results=[];
const pg=new PGlite();
await pg.exec(`
CREATE TABLE workspaces(workspace_id text primary key,nombre text,activo boolean);
CREATE TABLE workspace_usuarios(workspace_id text,usuario_id text,rol text,activo boolean,created_at timestamp default now());
INSERT INTO workspaces VALUES('ws_audit','Prueba',true);
INSERT INTO workspace_usuarios(workspace_id,usuario_id,rol,activo) VALUES('ws_audit','usr_gustavo','owner',true);
CREATE TABLE movimientos(
movimiento_id text primary key,tipo_movimiento text,subtipo_movimiento text,fecha_operacion date,periodo text,dia integer,
categoria_id text,forma_pago_id text,servicio_id text,concepto_manual text,fuente_ingreso_id text,
workspace_id text,usuario_id_creador text,usuario_id text,concepto_id text,medio_pago_id text,instrumento_id text,categoria_gasto_id text,
monto numeric check(monto>0),moneda text,estado text,vencimiento date,observacion text,es_recurrente boolean,
requiere_revision boolean,motivo_revision text,origen_movimiento text,activo boolean,updated_at timestamp default now());
CREATE TABLE etiquetas(etiqueta_id text primary key);INSERT INTO etiquetas VALUES('tag_a'),('tag_b');
CREATE TABLE movimiento_etiquetas(movimiento_id text references movimientos,etiqueta_id text references etiquetas,primary key(movimiento_id,etiqueta_id));
CREATE TABLE detalle_movimiento(detalle_id text primary key,movimiento_id text references movimientos,nombre_item text,
monto numeric check(monto>0),moneda text,tipo_cambio numeric,monto_ars_calculado numeric,orden integer,observacion text,activo boolean);
CREATE TABLE cotizaciones(fecha date,moneda_origen text,moneda_destino text,tipo text,valor numeric);
CREATE TABLE parametros(clave text,valor numeric);INSERT INTO parametros VALUES('tipo_cambio_default',1000);
`);
async function snapshot(){return Object.fromEntries(await Promise.all(['movimientos','detalle_movimiento','movimiento_etiquetas'].map(async t=>[t,(await pg.query(`SELECT * FROM ${t} ORDER BY 1,2`)).rows])));}
async function reset(){await pg.exec('TRUNCATE detalle_movimiento,movimiento_etiquetas,movimientos;');}
async function check(id,title,run){
  await reset();try{results.push({id,title,status:'correcto',...await run()});}
  catch(e){results.push({id,title,status:'fallo',error:String(e.stack)});}
  console.log(id,results.at(-1).status);
}
async function harness({failure=null}={}) {
  const statements=[],batches=[],errors=[];
  const execute=async (client,statement)=>{
    statements.push(statement);
    if(failure?.(statement.query))throw Error('Fallo de escritura provocado por la prueba');
    return (await client.query(statement.query,statement.values)).rows;
  };
  const sql=(strings,...values)=>{
    const query=strings.reduce((a,s,i)=>a+(i?`$${i}`:'')+s,'').replace(/\s+/g,' ').trim();
    const statement={query,values};
    return {...statement,then: (ok,bad)=>execute(pg,statement).then(ok,bad)};
  };
  sql.transaction=async qs=>{
    batches.push(qs.map(q=>q.query));
    return pg.transaction(async tx=>{const rows=[];for(const q of qs)rows.push(await execute(tx,q));return rows;});
  };
  const context=vm.createContext({Buffer,Date,Math,Set,console:{error:(...x)=>errors.push(x.map(String).join(' '))},
    process:{env:{DATABASE_URL:'postgresql://ficticio:ficticio@localhost/ficticio',MF_AUTH_SECRET:'solo-pruebas-sin-validez-real'}}});
  const modules=new Map();
  function synthetic(key,exports){
    if(!modules.has(key))modules.set(key,new vm.SyntheticModule(Object.keys(exports),function(){
      for(const [k,v]of Object.entries(exports))this.setExport(k,v);
    },{context}));return modules.get(key);
  }
  async function load(file){
    if(modules.has(file))return modules.get(file);
    const mod=new vm.SourceTextModule(await fs.readFile(file,'utf8'),{context,identifier:file});modules.set(file,mod);
    await mod.link(async (specifier,ref)=>{
      if(specifier==='crypto')return synthetic('crypto',{default:crypto});
      if(specifier==='@neondatabase/serverless')return synthetic('neon',{neon:()=>sql});
      let resolved=path.resolve(path.dirname(ref.identifier),specifier);if(!path.extname(resolved))resolved+='.js';return load(resolved);
    });return mod;
  }
  async function call(file,body,method='POST',authenticated=true){
    const auth=await load(path.join(project,'api/_auth.js'));await auth.evaluate();
    const token=auth.namespace.createToken({usuarioId:'usr_gustavo',nombre:'Prueba',workspaceId:'ws_audit'});
    const mod=await load(path.join(project,'api',file));await mod.evaluate();
    const req={method,body,headers:authenticated?{authorization:`Bearer ${token}`}:{},query:{}};
    const res={code:200,payload:null,status(c){this.code=c;return this;},json(p){this.payload=p;return this;}};
    await mod.namespace.default(req,res);return res;
  }
  return {call,load,statements,batches,errors};
}
const expense={periodo:'2026-10',dia:1,servicio:'Gasto ficticio',monto:100,moneda:'ARS',estado:'pagado',etiquetasIds:['tag_a'],subconceptos:[{nombre:'Ítem A',monto:100,moneda:'ARS'}]};
async function seed(){const h=await harness();const r=await h.call('gastos.js',expense);assert.equal(r.code,200,JSON.stringify(r.payload));return r.payload.data.movimiento_id;}
await check('API-01','Alta válida con detalle mixto y etiquetas',async()=>{
  const h=await harness();const r=await h.call('gastos.js',{...expense,subconceptos:[...expense.subconceptos,{nombre:'USD',monto:10,moneda:'USD',tipoCambio:1000}]});
  assert.equal(r.code,200,JSON.stringify(r.payload));const s=await snapshot();assert.equal(s.movimientos.length,1);assert.equal(Number(s.movimientos[0].monto),10100);assert.equal(s.detalle_movimiento.length,2);assert.equal(s.movimiento_etiquetas.length,1);assert.equal(h.batches.length,1);
  return {http:200,totalARS:10100,details:2,batches:1};
});
await check('API-02','Fallo del detalle revierte toda el alta',async()=>{
  const h=await harness({failure:q=>q.startsWith('INSERT INTO detalle_movimiento')});const before=await snapshot();
  const r=await h.call('gastos.js',expense);assert.equal(r.code,500);assert.deepEqual(await snapshot(),before);
  return {http:500,databaseUnchanged:true};
});
await check('API-03','Violación real de clave foránea revierte el alta',async()=>{
  const h=await harness();const before=await snapshot();const r=await h.call('gastos.js',{...expense,etiquetasIds:['inexistente']});assert.equal(r.code,500);assert.deepEqual(await snapshot(),before);return {databaseUnchanged:true};
});
await check('API-04','Fallo en edición conserva cabecera, etiquetas y detalle originales',async()=>{
  const id=await seed(),before=await snapshot();const h=await harness({failure:q=>q.startsWith('INSERT INTO detalle_movimiento')});
  const r=await h.call('gastos-update.js',{...expense,id,monto:999,etiquetasIds:['tag_b'],subconceptos:[{nombre:'Cambio',monto:999,moneda:'ARS'}]},'PUT');
  assert.equal(r.code,500,JSON.stringify(r.payload));assert.deepEqual(await snapshot(),before);return {databaseUnchanged:true};
});
await check('API-05','Edición válida cambia cabecera, etiquetas y detalle juntos',async()=>{
  const id=await seed();const h=await harness();const r=await h.call('gastos-update.js',{...expense,id,etiquetasIds:['tag_b'],subconceptos:[{nombre:'Cambio',monto:75.25,moneda:'ARS'}]},'PUT');
  assert.equal(r.code,200,JSON.stringify(r.payload));const s=await snapshot();assert.equal(Number(s.movimientos[0].monto),75.25);assert.equal(s.detalle_movimiento[0].nombre_item,'Cambio');assert.equal(s.movimiento_etiquetas[0].etiqueta_id,'tag_b');return {saved:75.25};
});
await check('API-06','Fallo al borrar revierte los borrados de etiquetas y detalles',async()=>{
  const movimientoId=await seed(),before=await snapshot();const h=await harness({failure:q=>q.startsWith('DELETE FROM movimientos ')});
  const r=await h.call('gastos-delete.js',{movimientoId},'DELETE');assert.equal(r.code,500);assert.deepEqual(await snapshot(),before);return {databaseUnchanged:true};
});
await check('API-07','Borrado válido elimina el gasto y sus dependencias',async()=>{
  const movimientoId=await seed();const h=await harness();const r=await h.call('gastos-delete.js',{movimientoId},'DELETE');assert.equal(r.code,200);assert.deepEqual(await snapshot(),{movimientos:[],detalle_movimiento:[],movimiento_etiquetas:[]});return {http:200};
});
await check('API-08','Rechazo de importes y fechas inválidos antes de escribir',async()=>{
  const cases=[['gastos.js',{...expense,subconceptos:[{nombre:'Negativo',monto:-100}]}],['gastos.js',{...expense,subconceptos:[],monto:0}],['gastos.js',{...expense,periodo:'2026-02',dia:31}],['ingresos.js',{periodo:'2026-02',dia:31,monto:50}],['ingresos.js',{periodo:'2026-10',dia:1,monto:-50}],['sueldo.js',{periodo:'2026-13',monto:100}],['sueldo.js',{periodo:'2026-10',monto:''}]];
  for(const [file,body]of cases){const h=await harness(),r=await h.call(file,body);assert.equal(r.code,400,file+JSON.stringify(r.payload));assert.equal(h.statements.length,0);}
  return {invalidCases:cases.length,http:400,writes:0};
});
await check('API-09','Ingreso y sueldo válidos; sueldo existente se actualiza',async()=>{
  const h=await harness();for(const [file,body]of [['ingresos.js',{periodo:'2024-02',dia:29,monto:125.5,fuente:'Otros'}],['sueldo.js',{periodo:'2026-10',monto:1000}],['sueldo.js',{periodo:'2026-10',monto:2000}]]){const r=await h.call(file,body);assert.equal(r.code,200,JSON.stringify(r.payload));}
  const s=await snapshot();assert.equal(s.movimientos.length,2);assert.equal(Number(s.movimientos.find(r=>r.subtipo_movimiento==='SUELDO').monto),2000);return {records:2,salary:2000};
});
await check('API-10','Sin sesión y sin propiedad no modifica datos',async()=>{
  const id=await seed();const h=await harness();assert.equal((await h.call('gastos.js',expense,'POST',false)).code,401);
  await pg.query("UPDATE movimientos SET usuario_id='otra_persona' WHERE movimiento_id=$1",[id]);const before=await snapshot();
  assert.equal((await h.call('gastos-update.js',{...expense,id},'PUT')).code,404);assert.equal((await h.call('gastos-delete.js',{movimientoId:id},'DELETE')).code,404);assert.deepEqual(await snapshot(),before);return {http:[401,404,404],databaseUnchanged:true};
});
await check('CALC-01','Totales ARS, USD y desglose mixto',async()=>{
  const h=await harness(),mod=await h.load(path.join(project,'src/utils/money.js'));await mod.evaluate();const m=mod.namespace;
  assert.equal(m.montoReal({monto:1500,moneda:'ARS'},1000),1500);assert.equal(m.montoReal({monto:10,moneda:'USD'},1000),10000);
  const mixed={monto:999999,moneda:'ARS',subconceptos:[{monto:1500,moneda:'ARS'},{monto:10,moneda:'USD',tipoCambio:1200,montoARSCalculado:12000}]};
  assert.equal(m.montoReal(mixed,2000),13500);assert.equal(m.montoUSDReal(mixed),10);return {cases:4};
});
await fs.writeFile(path.join(out,'resultados-api-postgres.json'),JSON.stringify(results,null,2));await pg.close();
if(results.some(r=>r.status==='fallo'))process.exitCode=1;
