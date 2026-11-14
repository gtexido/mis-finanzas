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
CREATE TABLE login_fallos(id bigserial primary key,usuario_id text not null,ip text not null,creado_at timestamptz not null default now());
`);
// Se aplica el script real de cuotas sobre el esquema de prueba (dos veces: debe poder repetirse sin efecto).
const sqlCuotas=await fs.readFile(path.join(project,'sql/SQL_CUOTAS_V1.sql'),'utf8');
await pg.exec(sqlCuotas);await pg.exec(sqlCuotas);
async function snapshot(){return Object.fromEntries(await Promise.all(['movimientos','detalle_movimiento','movimiento_etiquetas'].map(async t=>[t,(await pg.query(`SELECT * FROM ${t} ORDER BY 1,2`)).rows])));}
async function reset(){await pg.exec('DROP TABLE IF EXISTS ahorro_libros; TRUNCATE detalle_movimiento,movimiento_etiquetas,movimientos,login_fallos;');}
async function check(id,title,run){
  await reset();try{results.push({id,title,status:'correcto',...await run()});}
  catch(e){results.push({id,title,status:'fallo',error:String(e.stack)});}
  // Si falla, se muestra el motivo en el registro para no tener que abrir el archivo de resultados.
  const ultimo=results.at(-1);
  console.log(id,ultimo.status,ultimo.status==='fallo'?String(ultimo.error).split('\n').slice(0,4).join(' | '):'');
}
async function harness({failure=null, userId="usr_gustavo", env={}}={}) {
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
    process:{env:{DATABASE_URL:'postgresql://ficticio:ficticio@localhost/ficticio',MF_AUTH_SECRET:'solo-pruebas-sin-validez-real',MF_PIN_GUSTAVO:'clave-ficticia-1',MF_PIN_VANE:'clave-ficticia-2',...env}}});
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
  async function call(file,body,method='POST',authenticated=true,query={}){
    const auth=await load(path.join(project,'api/_auth.js'));await auth.evaluate();
    const token=auth.namespace.createToken({usuarioId:userId,nombre:'Prueba',workspaceId:'ws_audit'});
    const mod=await load(path.join(project,'api',file));await mod.evaluate();
    const req={method,body,headers:authenticated?{authorization:`Bearer ${token}`}:{},query};
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
  const h=await harness();const before=await snapshot();const r=await h.call('gastos.js',{...expense,etiquetasIds:['inexistente']});assert.equal(r.code,409);assert.deepEqual(await snapshot(),before);return {databaseUnchanged:true,http:409};
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

await check('API-11','Ingresos: crear, editar y eliminar con persistencia',async()=>{
  const h=await harness();const payload={periodo:'2026-10',dia:3,monto:250,fuente:'Venta de prueba'};
  const created=await h.call('ingresos.js',payload);const id=created.payload.data.movimiento_id;
  const edited=await h.call('ingresos.js',{...payload,movimientoId:id,dia:4,monto:375,fuente:'Trabajo de prueba'},'PUT');
  assert.equal(edited.code,200,JSON.stringify(edited.payload));const row=(await snapshot()).movimientos[0];assert.equal(Number(row.monto),375);assert.equal(row.dia,4);assert.equal(row.concepto_manual,'Trabajo de prueba');
  assert.equal((await h.call('ingresos-delete.js',{movimientoId:id},'DELETE')).code,200);assert.equal((await snapshot()).movimientos.length,0);
});
await check('API-12','Edición de ingreso rechaza otro usuario, mes, espacio y sueldo',async()=>{
  const h=await harness(),payload={periodo:'2026-10',dia:3,monto:250,fuente:'Prueba'};
  const id=(await h.call('ingresos.js',payload)).payload.data.movimiento_id;
  assert.equal((await h.call('ingresos.js',{...payload,movimientoId:id,periodo:'2026-11'},'PUT')).code,404);
  await pg.query("UPDATE movimientos SET usuario_id='otro' WHERE movimiento_id=$1",[id]);
  assert.equal((await h.call('ingresos.js',{...payload,movimientoId:id},'PUT')).code,404);
  assert.equal((await h.call('ingresos-delete.js',{movimientoId:id},'DELETE')).code,404);
  await pg.query("UPDATE movimientos SET usuario_id='usr_gustavo', workspace_id='otro' WHERE movimiento_id=$1",[id]);
  assert.equal((await h.call('ingresos.js',{...payload,movimientoId:id},'PUT')).code,404);
  const salary=(await h.call('sueldo.js',{periodo:'2026-10',monto:100})).payload.data.movimiento_id;
  assert.equal((await h.call('ingresos.js',{...payload,movimientoId:salary},'PUT')).code,404);
});
await check('API-13','Eliminar sueldo solo afecta al mes, usuario y espacio propios',async()=>{
  const h=await harness();for(const periodo of ['2026-09','2026-10'])assert.equal((await h.call('sueldo.js',{periodo,monto:1000})).code,200);
  await pg.exec("INSERT INTO movimientos(movimiento_id,tipo_movimiento,subtipo_movimiento,periodo,usuario_id,workspace_id,monto,activo) VALUES('salary_other','INGRESO','SUELDO','2026-10','otro','ws_audit',1500,true)");
  assert.equal((await h.call('sueldo.js',{periodo:'2026-10'},'DELETE')).code,200);const rows=(await snapshot()).movimientos;
  assert.equal(rows.length,2);assert.ok(rows.some(r=>r.usuario_id==='otro'));assert.ok(rows.some(r=>r.periodo==='2026-09'));
  assert.equal((await h.call('sueldo.js',{periodo:'2026-10'},'DELETE')).code,404);
});
await check('API-14','Login por usuario, credenciales inválidas y sin espacio activo',async()=>{
  const h=await harness();
  assert.equal((await h.call('auth-login.js',{usuarioId:'  GUSTAVO ',pin:'clave-ficticia-1'})).code,200);
  const before=h.statements.length;
  assert.equal((await h.call('auth-login.js',{usuarioId:'desconocido',pin:'incorrecta'})).code,401);
  assert.equal(h.statements.length,before);
  assert.equal((await h.call('auth-login.js',{usuarioId:'gustavo',pin:'incorrecta'})).code,401);
  assert.equal((await h.call('auth-login.js',{usuarioId:'vane',pin:'clave-ficticia-2'})).code,403);
});
await check('API-15','Tercer usuario configurable, acceso propio y fuente sin asignar a Vane',async()=>{
  await pg.exec("INSERT INTO workspaces VALUES('ws_tercero','Tercero',true); INSERT INTO workspace_usuarios(workspace_id,usuario_id,rol,activo) VALUES('ws_tercero','usr_prueba','owner',true)");
  try{
    const h=await harness({userId:'usr_prueba',env:{MF_AUTH_USERS:JSON.stringify([{usuarioId:'usr_prueba',login:'prueba',nombre:'Prueba',pinEnv:'MF_PIN_PRUEBA'}]),MF_PIN_PRUEBA:'clave-ficticia-3'}});
    const login=await h.call('auth-login.js',{usuarioId:'prueba',pin:'clave-ficticia-3'});assert.equal(login.code,200);assert.equal(login.payload.data.user.workspaceId,'ws_tercero');
    assert.equal((await h.call('ingresos.js',{periodo:'2026-10',dia:1,fuente:'Trabajo',monto:500})).code,200);
    const row=(await snapshot()).movimientos[0];assert.equal(row.usuario_id,'usr_prueba');assert.equal(row.workspace_id,'ws_tercero');assert.equal(row.fuente_ingreso_id,null);
    const original=await harness();assert.equal((await original.call('ingresos-delete.js',{movimientoId:row.movimiento_id},'DELETE')).code,404);
  }finally{await pg.exec("DELETE FROM workspace_usuarios WHERE usuario_id='usr_prueba';DELETE FROM workspaces WHERE workspace_id='ws_tercero'");}
});
await check('API-19','Bloqueo de login: 5 fallos, alias del mismo usuario, otro usuario libre y limpieza al entrar',async()=>{
  const h=await harness();
  const login=(usuarioId,pin)=>h.call('auth-login.js',{usuarioId,pin});
  const filas=async()=>Number((await pg.query('SELECT count(*)::int n FROM login_fallos')).rows[0].n);
  // Usuario inexistente: nunca deja filas
  for(let i=0;i<8;i++)assert.equal((await login('inventado'+i,'x')).code,401);
  assert.equal(await filas(),0);
  // Cinco fallos con alias distintos del mismo usuario suman en un único contador
  for(const alias of ['gustavo','GUSTAVO','usr_gustavo','  Gustavo ','usr_gustavo'])assert.equal((await login(alias,'mala')).code,401);
  assert.equal(await filas(),5);
  // Sexto intento: bloqueado incluso con la clave correcta
  const bloqueado=await login('gustavo','clave-ficticia-1');
  assert.equal(bloqueado.code,429);
  assert.match(bloqueado.payload.error,/Demasiados intentos/);
  assert.equal(bloqueado.payload.data,undefined);
  // Otro usuario no se ve afectado y, al entrar bien, sus fallos se limpian
  assert.equal((await login('vane','mala')).code,401);
  assert.equal(await filas(),6);
  assert.equal((await login('vane','clave-ficticia-2')).code,403); // clave correcta; sin espacio activo en este esquema
  // Pasados 20 minutos el bloqueo de Gustavo vence
  await pg.exec("UPDATE login_fallos SET creado_at=now()-interval '20 minutes'");
  assert.equal((await login('gustavo','clave-ficticia-1')).code,200);
  assert.equal(Number((await pg.query("SELECT count(*)::int n FROM login_fallos WHERE usuario_id='usr_gustavo'")).rows[0].n),0);
  return {bloqueoTras:5,aliasUnificados:true,inexistentesSinRastro:true};
});
await check('API-16','Membresía inactiva rechaza un token todavía válido antes de escribir',async()=>{
  await pg.exec("UPDATE workspace_usuarios SET activo=false WHERE usuario_id='usr_gustavo'");
  try{const h=await harness(),r=await h.call('gastos.js',expense);assert.equal(r.code,403);assert.equal((await snapshot()).movimientos.length,0);}
  finally{await pg.exec("UPDATE workspace_usuarios SET activo=true WHERE usuario_id='usr_gustavo'");}
});
await check('API-17','Débito automático se conserva al pagar y al volver a pendiente',async()=>{
  const h=await harness();const r=await h.call('gastos.js',{...expense,subconceptos:[],instrumentoId:'ins_debito_automatico',formaPago:'Débito automático',estado:'pendiente',vencimiento:'2026-10-02',requiereRevision:true,motivoRevision:'REVISAR_MONTO',esRecurrente:true});
  assert.equal(r.code,200);const id=r.payload.data.movimiento_id;
  let row=(await snapshot()).movimientos[0];assert.equal(row.estado,'pendiente');assert.equal(row.instrumento_id,'ins_debito_automatico');
  for(const estado of ['pagado','pendiente']){assert.equal((await h.call('gastos-estado.js',{movimientoId:id,estado},'PATCH')).code,200);row=(await snapshot()).movimientos[0];assert.equal(row.estado,estado);assert.equal(row.instrumento_id,'ins_debito_automatico');assert.equal(row.es_recurrente,true);}
});
await check('API-18','Deshabilitar usuario en configuración rechaza sesiones existentes',async()=>{
  const h=await harness({env:{MF_AUTH_USERS:JSON.stringify([{usuarioId:'usr_gustavo',login:'gustavo',nombre:'Prueba',pinEnv:'MF_PIN_GUSTAVO',activo:false}])}});
  assert.equal((await h.call('gastos.js',expense)).code,401);assert.equal(h.statements.length,0);
});
await check('CALC-02','Comparaciones con cero, aumento, baja y período anual',async()=>{
  const h=await harness(),mod=await h.load(path.join(project,'src/utils/comparisons.js'));await mod.evaluate();const m=mod.namespace;
  assert.equal(m.compareAmounts(120,100).percent,20);assert.equal(m.compareAmounts(75,100).percent,-25);assert.equal(m.compareAmounts(100,0).percent,null);assert.equal(m.compareAmounts(0,100).percent,-100);assert.equal(m.previousPeriod({y:2026,m:0}),'2025-12');
});
await check('CALC-03','Alertas manuales, automáticas, revisión y réplica parcial sin duplicar',async()=>{
  const h=await harness(),mod=await h.load(path.join(project,'src/utils/paymentStatus.js'));await mod.evaluate();const m=mod.namespace;
  const manual={estado:'pendiente',vencimiento:'2026-10-01'},auto={...manual,instrumentoId:'ins_debito_automatico'};
  assert.equal(m.expenseAttention(manual,-1).kind,'overdue');assert.equal(m.expenseAttention(manual,2).kind,'soon');assert.equal(m.expenseAttention(auto,-1).label,'Verificar débito');assert.equal(m.expenseAttention({...auto,estado:'pagado'},-1).kind,'paid');
  assert.equal(m.expenseAttention({...manual,requiereRevision:true,origenMovimiento:'REPLICA_MES'},-1).kind,'review');
  const source=[{id:'1',servicio:'Internet'},{id:'2',servicio:'Internet'},{id:'3',servicio:'Luz'}];
  const missing=m.missingReplicas(source,[{servicio:'Internet'}]);assert.equal(missing.length,2);assert.equal(missing[0].id,'2');
});

const savingsPayload = (extra={})=>({requestId:crypto.randomUUID().replaceAll('-',''),kind:'aporte',amount:100,currency:'ARS',date:'2026-10-03',destination:'Cuenta de prueba',goal:'Reserva',...extra});
const savingCall=(h,body={},method='POST',authenticated=true)=>h.call('movimientos.js',body,method,authenticated,{recurso:'ahorros'});
const savedRows=async h=>(await savingCall(h,{},'GET')).payload.data.records;
await check('SAVE-01','Inicialización aditiva e idempotente; aportes separados de gastos e ingresos',async()=>{
 const h=await harness();assert.equal((await savingCall(h,{},'GET')).code,200);assert.equal((await savingCall(h,{},'GET')).code,200);
 const r=await savingCall(h,savingsPayload());assert.equal(r.code,200,JSON.stringify(r.payload));assert.equal(r.payload.data.records.length,1);assert.equal(r.payload.data.record.impactARS,100);assert.equal((await snapshot()).movimientos.length,0);
});
await check('SAVE-02','Saldo inicial y dólar conservan moneda; el equivalente queda fijo por operación',async()=>{
 const h=await harness();assert.equal((await savingCall(h,savingsPayload({kind:'inicial',amount:50,currency:'USD',date:'2026-09-01'}))).code,200);
 assert.equal((await savingCall(h,savingsPayload({amount:10,currency:'USD',rate:1200}))).code,200);
 assert.equal((await savingCall(h,savingsPayload({kind:'retiro',amount:5,currency:'USD',rate:1300,date:'2026-10-04'}))).code,200);
 const rows=await savedRows(h);assert.equal(rows[0].impactARS,0);assert.equal(rows[1].impactARS,12000);assert.equal(rows[2].impactARS,-6500);
 const mod=await h.load(path.join(project,'src/utils/savings.js'));await mod.evaluate();const sum=mod.namespace.savingsSummary(rows,'2026-10','2026-10-31');assert.equal(sum.usd,55);assert.equal(sum.ars,0);assert.equal(sum.net,5500);
});
await check('SAVE-03','Retiro excedido, moneda o destino incorrectos se rechazan sin cambiar el saldo',async()=>{
 const h=await harness();await savingCall(h,savingsPayload());const before=await savedRows(h);
 for(const extra of [{amount:101},{currency:'USD',amount:1,rate:1000},{destination:'Otra cuenta',amount:10},{goal:'Otro objetivo',amount:10}])assert.equal((await savingCall(h,savingsPayload({kind:'retiro',...extra}))).code,409);
 assert.deepEqual(await savedRows(h),before);
});
await check('SAVE-04','Editar o eliminar un aporte usado no permite saldos negativos ni retiros anteriores',async()=>{
 const h=await harness();const entry=(await savingCall(h,savingsPayload())).payload.data.record;
 await savingCall(h,savingsPayload({kind:'retiro',amount:80,date:'2026-10-04'}));
 assert.equal((await savingCall(h,{...entry,amount:50},'PUT')).code,409);assert.equal((await savingCall(h,{id:entry.id,revision:1},'DELETE')).code,409);
 assert.equal((await savingCall(h,savingsPayload({kind:'retiro',amount:1,date:'2026-10-01'}))).code,409);assert.equal((await savedRows(h)).length,2);
});
await check('SAVE-05','Edición y eliminación con versión; los cambios de otro dispositivo no se pisan',async()=>{
 const h=await harness();const entry=(await savingCall(h,savingsPayload())).payload.data.record;
 const edit=await savingCall(h,{...entry,amount:125.25},'PUT');assert.equal(edit.code,200,JSON.stringify(edit.payload));assert.equal(edit.payload.data.record.revision,2);
 assert.equal((await savingCall(h,{...entry,amount:300},'PUT')).code,409);assert.equal((await savingCall(h,{id:entry.id,revision:1},'DELETE')).code,409);
 assert.equal((await savingCall(h,{id:entry.id,revision:2},'DELETE')).code,200);assert.equal((await savedRows(h)).length,0);
});
await check('SAVE-06','Reintentar la misma solicitud no duplica; un contenido distinto con la misma clave se rechaza',async()=>{
 const h=await harness(),payload=savingsPayload();const a=await savingCall(h,payload),b=await savingCall(h,payload);assert.equal(a.code,200);assert.equal(b.code,200);assert.equal(b.payload.data.replayed,true);assert.equal((await savedRows(h)).length,1);
 assert.equal((await savingCall(h,{...payload,amount:500})).code,409);
});
await check('SAVE-07','Ahorros aislados por usuario y espacio; sin sesión no se crea el registro',async()=>{
 const h=await harness();assert.equal((await savingCall(h,savingsPayload(),'POST',false)).code,401);
 const entry=(await savingCall(h,savingsPayload())).payload.data.record;
 await pg.exec("INSERT INTO workspace_usuarios(workspace_id,usuario_id,rol,activo) VALUES('ws_audit','usr_vane','owner',true)");
 try {const other=await harness({userId:'usr_vane'});assert.equal((await savedRows(other)).length,0);assert.equal((await savingCall(other,{...entry,amount:200},'PUT')).code,404);assert.equal((await savingCall(other,{id:entry.id,revision:1},'DELETE')).code,404);assert.equal((await savedRows(h)).length,1);}
 finally{await pg.exec("DELETE FROM workspace_usuarios WHERE usuario_id='usr_vane'");}
});
await check('SAVE-08','Conversión explícita y atómica mantiene el importe y archiva el gasto original',async()=>{
 const h=await harness(),id=await seed();const payload=savingsPayload({sourceId:id,sourceTitle:'Antes era gasto',date:'2026-10-01'});
 const r=await savingCall(h,payload);assert.equal(r.code,200,JSON.stringify(r.payload));assert.equal(r.payload.data.converted,true);assert.equal((await snapshot()).movimientos[0].activo,false);assert.equal((await savedRows(h))[0].convertedFrom,id);
 const retry=await savingCall(h,payload);assert.equal(retry.code,200);assert.equal(retry.payload.data.converted,true);assert.equal((await savedRows(h)).length,1);
});
await check('SAVE-09','Fallo real de conversión revierte tanto el ahorro como el cambio de gasto',async()=>{
 const h=await harness(),id=await seed();await savingCall(h,{},'GET');
 await pg.exec("CREATE FUNCTION qa_reject_archive() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'fallo provocado'; END; $$ LANGUAGE plpgsql; CREATE TRIGGER qa_archive BEFORE UPDATE ON movimientos FOR EACH ROW WHEN (NEW.activo=false) EXECUTE FUNCTION qa_reject_archive();");
 try{assert.equal((await savingCall(h,savingsPayload({sourceId:id,date:'2026-10-01'}))).code,500);assert.equal((await savedRows(h)).length,0);assert.equal((await snapshot()).movimientos[0].activo,true);}
 finally{await pg.exec('DROP TRIGGER qa_archive ON movimientos; DROP FUNCTION qa_reject_archive();');}
});
await check('SAVE-10','Conversión rechaza pendiente, revisión, gasto ajeno, importe cambiado y mezcla de monedas',async()=>{
 const h=await harness(),id=await seed();
 assert.equal((await savingCall(h,savingsPayload({sourceId:id,amount:200,date:'2026-10-01'}))).code,409);
 await pg.query("UPDATE movimientos SET estado='pendiente' WHERE movimiento_id=$1",[id]);assert.equal((await savingCall(h,savingsPayload({sourceId:id,date:'2026-10-01'}))).code,400);
 await pg.query("UPDATE movimientos SET estado='pagado',requiere_revision=true WHERE movimiento_id=$1",[id]);assert.equal((await savingCall(h,savingsPayload({sourceId:id,date:'2026-10-01'}))).code,400);
 await pg.query("UPDATE movimientos SET requiere_revision=false,usuario_id='otra' WHERE movimiento_id=$1",[id]);assert.equal((await savingCall(h,savingsPayload({sourceId:id,date:'2026-10-01'}))).code,404);
 await pg.query("UPDATE movimientos SET usuario_id='usr_gustavo' WHERE movimiento_id=$1",[id]);await pg.query("INSERT INTO detalle_movimiento(detalle_id,movimiento_id,monto,moneda,activo) VALUES('usd_mix',$1,10,'USD',true)",[id]);assert.equal((await savingCall(h,savingsPayload({sourceId:id,date:'2026-10-01'}))).code,400);
 assert.equal((await savedRows(h)).length,0);assert.equal((await snapshot()).movimientos[0].activo,true);
});
await check('SAVE-11','Validación de importes, centavos, cotización, fechas y saldo inicial repetido',async()=>{
 const h=await harness();
 for(const extra of [{amount:-1},{amount:0},{amount:1.234},{currency:'EUR'},{currency:'USD',rate:null},{currency:'USD',rate:0},{date:'2026-02-31'},{date:'2099-01-01'},{destination:''}])assert.equal((await savingCall(h,savingsPayload(extra))).code,400,JSON.stringify(extra));
 assert.equal((await savingCall(h,savingsPayload({kind:'inicial'}))).code,200);assert.equal((await savingCall(h,savingsPayload({kind:'inicial',destination:' CUENTA DE PRUEBA '}))).code,409);
});
await check('SAVE-12','Dos retiros concurrentes no pueden gastar el mismo ahorro',async()=>{
 const h=await harness();await savingCall(h,savingsPayload());const a=await harness(),b=await harness();
 const results=await Promise.all([savingCall(a,savingsPayload({kind:'retiro',amount:80})),savingCall(b,savingsPayload({kind:'retiro',amount:80}))]);
 assert.equal(results.filter(r=>r.code===200).length,1);assert.equal(results.filter(r=>r.code===409).length,1);const rows=await savedRows(h);assert.equal(rows.filter(r=>r.kind==='retiro').length,1);
});
await check('SAVE-13','Saldo histórico, monedas y retiros no alteran ingresos ni consumo',async()=>{
 const h=await harness(),mod=await h.load(path.join(project,'src/utils/savings.js'));await mod.evaluate();const m=mod.namespace;
 const rows=[{kind:'inicial',amount:100,currency:'ARS',date:'2026-09-01',destination:'Banco',goal:'',impactARS:0},{kind:'aporte',amount:50,currency:'ARS',date:'2026-10-01',destination:'Banco',goal:'',impactARS:50},{kind:'retiro',amount:20,currency:'ARS',date:'2026-10-02',destination:'Banco',goal:'',impactARS:-20},{kind:'inicial',amount:10,currency:'USD',date:'2026-09-01',destination:'Banco',goal:'',impactARS:0}];
 const september=m.savingsSummary(rows,'2026-09','2026-09-30'),october=m.savingsSummary(rows,'2026-10','2026-10-31');assert.equal(september.ars,100);assert.equal(september.net,0);assert.equal(october.ars,130);assert.equal(october.usd,10);assert.equal(october.net,30);assert.equal(1000-600-october.net,370);
});

await check('SAVE-14','Un gasto convertido conserva su auditoría y rechaza edición, pago o borrado desde una vista antigua',async()=>{
 const h=await harness(),id=await seed();assert.equal((await savingCall(h,savingsPayload({sourceId:id,date:'2026-10-01'}))).code,200);const before=await snapshot();
 assert.equal((await h.call('gastos-update.js',{...expense,id,monto:999},'PUT')).code,404);
 assert.equal((await h.call('gastos-delete.js',{movimientoId:id},'DELETE')).code,404);
 assert.equal((await h.call('gastos-estado.js',{movimientoId:id,estado:'pendiente'},'PATCH')).code,404);
 assert.deepEqual(await snapshot(),before);assert.equal((await savedRows(h)).length,1);
});

await check('CALC-02','Réplica al mes siguiente: fechas, día y desglose (src/utils/replicas.js)',async()=>{
  const h=await harness(),mod=await h.load(path.join(project,'src/utils/replicas.js'));await mod.evaluate();const m=mod.namespace;
  assert.equal(m.moverFechaAlMesSiguiente('2026-01-31'),'2026-02-28');assert.equal(m.moverFechaAlMesSiguiente('2028-01-31'),'2028-02-29');
  assert.equal(m.moverFechaAlMesSiguiente('2026-12-15'),'2027-01-15');assert.equal(m.moverFechaAlMesSiguiente('2026-03-31T00:00:00Z'),'2026-04-30');
  assert.equal(m.moverFechaAlMesSiguiente(''),'');assert.equal(m.moverFechaAlMesSiguiente('basura'),'');
  assert.equal(m.moverDiaAlMesSiguiente(31,'2026-02'),'28');assert.equal(m.moverDiaAlMesSiguiente(15,'2026-03'),'15');
  assert.equal(m.moverDiaAlMesSiguiente(undefined,'2026-03'),'1');assert.equal(m.moverDiaAlMesSiguiente(0,'2026-03'),'1');
  const items=m.prepararSubconceptosParaReplica([
    {nombre:'A',monto:10,moneda:'usd',tipoCambio:1000,montoARSCalculado:10000,orden:3},
    {nombreItem:'B',montoUSD:5},
    {nombre:'C',monto:20,moneda:'ARS',tipoCambio:1200,montoARSCalculado:24000}]);
  assert.equal(items.length,3);
  assert.equal(items[0].moneda,'USD');assert.equal(items[0].tipoCambio,null);assert.equal(items[0].montoARSCalculado,null);assert.equal(items[0].orden,3);assert.equal(items[0].id,undefined);
  assert.equal(items[1].nombre,'B');assert.equal(items[1].monto,5);assert.equal(items[1].moneda,'ARS');assert.equal(items[1].orden,2);
  assert.equal(items[2].tipoCambio,1200);assert.equal(items[2].montoARSCalculado,24000);
  assert.equal(m.prepararSubconceptosParaReplica(null).length,0);assert.equal(m.prepararSubconceptosParaReplica().length,0);
  return {cases:15};
});

await check('CALC-04','Conversión a pesos: total del desglose y fecha de conversión (src/utils/conversion.js)',async()=>{
  const h=await harness(),mod=await h.load(path.join(project,'src/utils/conversion.js'));await mod.evaluate();const m=mod.namespace;
  assert.equal(m.calcularTotalARSDetalle([],1000),0);assert.equal(m.calcularTotalARSDetalle(null,1000),0);
  assert.equal(m.calcularTotalARSDetalle([{monto:100}],1000),100);
  assert.equal(m.calcularTotalARSDetalle([{monto:10,moneda:'usd'}],1000),10000);
  assert.equal(m.calcularTotalARSDetalle([{monto:10,moneda:'USD',tipoCambio:1200}],1000),12000);
  assert.equal(m.calcularTotalARSDetalle([{monto:10,moneda:'USD',montoARSCalculado:15000}],1000),15000);
  assert.equal(m.calcularTotalARSDetalle([{montoUSD:5,moneda:'USD'},{monto:200}],1000),5200);
  assert.equal(m.calcularTotalARSDetalle([{monto:10,moneda:'USD'}]),10);
  const now=new Date(2026,9,15);
  assert.equal(m.normalizarFechaConversion({vencimiento:'2026-11-05T00:00:00Z'},{now,mesKey:'2026-10'}),'2026-11-05');
  assert.equal(m.normalizarFechaConversion({fechaOperacion:'2026-10-02'},{now,mesKey:'2026-10'}),'2026-10-02');
  assert.equal(m.normalizarFechaConversion({fecha_operacion:'2026-10-03'},{now,mesKey:'2026-10'}),'2026-10-03');
  assert.equal(m.normalizarFechaConversion({dia:7},{now,mesKey:'2026-10'}),'2026-10-07');
  assert.equal(m.normalizarFechaConversion({},{now,mesKey:'2026-10'}),'2026-10-15');
  return {cases:13};
});

await check('CALC-05','Validación de gasto antes de guardar: reglas y orden (src/utils/validarGasto.js)',async()=>{
  const h=await harness(),mod=await h.load(path.join(project,'src/utils/validarGasto.js'));await mod.evaluate();const v=mod.namespace.validarGastoParaGuardar;
  const ctx={mes:{y:2026,m:1},cfg:{instrumentosPago:[{id:'ins_tarjeta',nombre:'Tarjeta'},{id:'ins_x',nombre:'Sin definir'}]}};
  const ok={servicio:'  Luz ',monto:'100',dia:'15',medioPagoId:'mp_banco',instrumentoId:'ins_tarjeta',tipoGasto:'simple'};
  const r=v(ok,ctx);assert.equal(r.ok,true);assert.equal(r.f.servicio,'Luz');assert.equal(r.f.monto,'100');
  assert.match(v({...ok,servicio:'   '},ctx).mensaje,/concepto/);
  assert.match(v({...ok,dia:'29'},ctx).mensaje,/entre 1 y 28/);assert.match(v({...ok,dia:'0'},ctx).mensaje,/día válido/);assert.match(v({...ok,dia:'1.5'},ctx).mensaje,/día válido/);
  assert.equal(v({...ok,dia:'29'},{...ctx,mes:{y:2028,m:1}}).ok,true);
  assert.match(v({...ok,medioPagoId:'mp_sin_definir'},ctx).mensaje,/medio de pago/);assert.match(v({...ok,medioPagoId:''},ctx).mensaje,/medio de pago/);
  assert.match(v({...ok,instrumentoId:''},ctx).mensaje,/cómo pagaste/);assert.match(v({...ok,instrumentoId:'ins_sin_definir'},ctx).mensaje,/cómo pagaste/);assert.match(v({...ok,instrumentoId:'ins_x'},ctx).mensaje,/cómo pagaste/);
  assert.match(v({...ok,monto:'0'},ctx).mensaje,/mayor a cero/);assert.match(v({...ok,monto:'abc'},ctx).mensaje,/mayor a cero/);
  const d=v({...ok,monto:'',tipoGasto:'detalle',subconceptos:[]},ctx);assert.equal(d.ok,false);assert.equal(d.abrirDesglose,true);
  assert.equal(v({...ok,monto:'',tipoGasto:'detalle',subconceptos:[{nombre:'a',monto:1}]},ctx).ok,true);
  assert.match(v({...ok,servicio:'',dia:'99'},ctx).mensaje,/concepto/);
  return {cases:17};
});

await check('CALC-06','Cargar nueva: atajos, comparación con el mes anterior y fechas rápidas (src/utils/cargaRapida.js)',async()=>{
  const h=await harness(),mod=await h.load(path.join(project,'src/utils/cargaRapida.js'));await mod.evaluate();const m=mod.namespace;
  const conceptos=[{id:'c1',nombre:'Supermercado'},{id:'c2',nombre:'Internet'},{id:'c3',nombre:'Alquiler'},{id:'c4',nombre:'Luz'}];
  const gastos={'2026-10':[{conceptoId:'c2',servicio:'Internet',dia:'5',monto:21900},{conceptoId:'c1',servicio:'Supermercado',dia:'10',monto:30000},{servicio:'supermercado',dia:'20',monto:48500}],'2026-09':[{conceptoId:'c1',servicio:'Supermercado',dia:'12',monto:45000},{conceptoId:'c3',servicio:'Alquiler',dia:'1',monto:320000}]};
  const a=m.atajosDeConceptos(conceptos,gastos,['2026-10','2026-09'],{limite:3});
  assert.equal(a.length,3);assert.equal(a[0].concepto.id,'c1');assert.equal(a[0].usos,3);assert.equal(a[0].ultimo.monto,48500);
  assert.equal(a[1].concepto.id,'c2');assert.equal(a[2].concepto.id,'c3');
  const todos=m.atajosDeConceptos(conceptos,{},[],{});assert.equal(todos.length,4);assert.equal(todos[0].usos,0);assert.equal(todos[0].ultimo,null);
  const c1=m.comparacionConMesAnterior({conceptoId:'c1',servicio:'Supermercado'},gastos['2026-09'],48600);assert.equal(c1.anterior,45000);assert.equal(c1.porcentaje,8);assert.equal(c1.estado,'sube');
  assert.equal(m.comparacionConMesAnterior({conceptoId:'c1'},gastos['2026-09'],45000).estado,'igual');assert.equal(m.comparacionConMesAnterior({conceptoId:'c1'},gastos['2026-09'],22500).estado,'baja');
  assert.equal(m.comparacionConMesAnterior({conceptoId:'c1'},gastos['2026-09'],0).estado,'sin_importe');assert.equal(m.comparacionConMesAnterior({conceptoId:'c2'},gastos['2026-09'],100),null);
  assert.equal(m.comparacionConMesAnterior({servicio:' SUPERMERCADO '},gastos['2026-09'],45000).anterior,45000);
  const v=m.vencimientosRapidos(new Date(2026,9,30));assert.equal(v.length,3);assert.equal(v[0].fecha,'2026-10-31');assert.equal(v[0].detalle,'sáb 31 oct');assert.equal(v[1].fecha,'2026-11-06');assert.equal(v[2].fecha,'2026-11-10');
  assert.equal(m.vencimientosRapidos(new Date(2026,9,5))[2].fecha,'2026-10-10');assert.equal(m.vencimientosRapidos(new Date(2026,11,28))[1].fecha,'2027-01-04');assert.equal(m.vencimientosRapidos(new Date(2026,11,28))[2].fecha,'2027-01-10');
  const d=m.diasRapidos(new Date(2026,9,30),{y:2026,m:9});assert.equal(d.length,2);assert.equal(d[0].dia,'30');assert.equal(d[1].dia,'29');assert.equal(d[1].detalle,'jue 29 oct');
  assert.equal(m.diasRapidos(new Date(2026,9,1),{y:2026,m:9}).length,1);assert.equal(m.diasRapidos(new Date(2026,9,30),{y:2026,m:8}).length,0);
  const n=m.atajosPorNombre({'2026-10':[{servicio:'Kiosco',dia:'3',monto:1000,medioPagoId:'mp1',instrumentoId:'i1'},{servicio:' kiosco ',dia:'20',monto:2500,medioPagoId:'mp2',instrumentoId:'i2',conceptoId:'c9'},{servicio:'Pollo',dia:'8',monto:7000},{servicio:'',dia:'9',monto:5}],'2026-09':[{servicio:'Pollo',dia:'2',monto:6000},{servicio:'Internet',dia:'5',monto:21900}]},['2026-10','2026-09'],{limite:2});
  assert.equal(n.length,2);assert.equal(n[0].nombre,'kiosco');assert.equal(n[0].usos,2);assert.equal(n[0].ultimo.monto,2500);assert.equal(n[0].ultimo.medioPagoId,'mp2');assert.equal(n[0].ultimo.conceptoId,'c9');
  assert.equal(n[1].nombre,'Pollo');assert.equal(n[1].usos,2);assert.equal(n[1].ultimo.monto,7000);assert.equal(m.atajosPorNombre({},[],{}).length,0);
  const r=m.resumenDelMes([{monto:100,estado:'pagado'},{monto:50,estado:'pendiente'},{monto:25}],{});assert.equal(r.total,175);assert.equal(r.pagado,125);assert.equal(r.pendiente,50);assert.equal(r.cantidad,3);assert.equal(m.resumenDelMes([],{}).total,0);
  return {cases:33};
});

await check('CALC-07','Textos comunes: plurales, moneda única y períodos con nombre de mes (src/utils/formatters.js)',async()=>{
  const h=await harness(),mod=await h.load(path.join(project,'src/utils/formatters.js'));await mod.evaluate();const m=mod.namespace;
  assert.equal(m.plural(1,'gasto'),'1 gasto');assert.equal(m.plural(0,'gasto'),'0 gastos');assert.equal(m.plural(3,'gasto'),'3 gastos');
  assert.equal(m.plural(1,'gasto copiado','gastos copiados'),'1 gasto copiado');assert.equal(m.plural(2,'gasto copiado','gastos copiados'),'2 gastos copiados');
  assert.equal(m.fmtPeriodo('2026-09'),'septiembre 2026');assert.equal(m.fmtPeriodo('2027-01'),'enero 2027');assert.equal(m.fmtPeriodo('2026-12'),'diciembre 2026');
  assert.equal(m.fmtPeriodo(''),'');assert.equal(m.fmtPeriodo(undefined),'');assert.equal(m.fmtPeriodo('otro'),'otro');
  assert.match(m.fmtUSD(10),/^USD 10,00$/);assert.equal(m.fmtMonto(10,'USD'),m.fmtUSD(10));assert.doesNotMatch(m.fmtUSD(5),/U\$D/);
  assert.match(m.fmtARS(1234.56),/^\$\s?1\.235$/);assert.match(m.fmtARS(1234.4),/^\$\s?1\.234$/);assert.match(m.fmtARS(0),/^\$\s?0$/);assert.match(m.fmtARS(undefined),/^\$\s?0$/);
  assert.match(m.fmtMonto(1234.56),/^\$\s?1\.235$/);assert.match(m.fmtUSD(1234.5),/^USD 1\.234,50$/);
  return {cases:19};
});

await check('CALC-08','Deshacer eliminar: el pedido para recrear conserva importe, moneda, etiquetas y tipo de cambio (src/utils/deshacerBorrado.js)',async()=>{
  const h=await harness(),mod=await h.load(path.join(project,'src/utils/deshacerBorrado.js'));await mod.evaluate();const m=mod.namespace;
  const base={dia:'5',servicio:'Netflix',monto:12.5,moneda:'USD',estado:'pagado',vencimiento:'2026-10-20',conceptoId:'c1',medioPagoId:'mp1',instrumentoId:'i1',categoriaGastoId:'cg1',etiquetas:[{etiquetaId:'e1'},{id:'e2'}],observacion:'x',esRecurrente:true,subconceptos:[{nombre:'Plan',monto:12.5,moneda:'USD',tipoCambio:1400,montoARSCalculado:17500}]};
  const p=m.payloadParaRecrearGasto(base,'2026-10');
  assert.equal(p.periodo,'2026-10');assert.equal(p.monto,12.5);assert.equal(p.moneda,'USD');assert.equal(p.estado,'pagado');assert.equal(p.vencimiento,'2026-10-20');
  assert.equal(JSON.stringify(p.etiquetasIds),'["e1","e2"]');assert.equal(p.esRecurrente,true);assert.equal(p.subconceptos.length,1);
  assert.equal(p.subconceptos[0].tipoCambio,1400);assert.equal(p.subconceptos[0].montoARSCalculado,17500);assert.equal(p.subconceptos[0].moneda,'USD');assert.equal(p.subconceptos[0].orden,1);
  const q=m.payloadParaRecrearGasto({dia:'1',servicio:'Luz',monto:'100'},'2026-09',{categoria:'cat',formaPago:'fp'});
  assert.equal(q.monto,100);assert.equal(q.moneda,'ARS');assert.equal(q.estado,'pendiente');assert.equal(q.categoria,'cat');assert.equal(q.formaPago,'fp');
  assert.equal(q.vencimiento,null);assert.equal(q.etiquetasIds.length,0);assert.equal(q.subconceptos.length,0);assert.equal(q.esRecurrente,false);
  return {cases:2};
});

await check('CALC-09','Tu inflación: compara los mismos gastos entre dos meses y deja afuera dólares, pendientes de revisar y los que se eligen no contar (src/utils/inflacion.js)',async()=>{
  const h=await harness(),mod=await h.load(path.join(project,'src/utils/inflacion.js'));await mod.evaluate();const m=mod.namespace;
  assert.equal(m.mesAnterior('2026-01',1),'2025-12');assert.equal(m.mesAnterior('2026-11',3),'2026-08');assert.equal(m.mesAnterior('2026-03',12),'2025-03');
  const g=(servicio,monto,o={})=>({servicio,monto,moneda:'ARS',...o});
  const datos={
    '2026-08':[g('Luz',100),g('Internet',200),g('Alquiler',1000),g('Tarjeta Visa',500),g('Netflix',10,{moneda:'USD'}),g('Gimnasio',50),g('Viejo',30)],
    '2026-09':[g('Internet',200),g('Luz',110)],
    '2026-10':[g('Internet',200),g('Luz',115)],
    '2026-11':[g('LUZ ',60),g('luz',60),g('Internet',200),g('Alquiler',1200),g('Tarjeta Visa',900),g('Netflix',10,{moneda:'USD'}),g('Gimnasio',50,{requiereRevision:true}),g('Nuevo',40)],
  };
  const r=m.calcularInflacion({gastosPorMes:datos,refKey:'2026-11',mesesAtras:3});
  assert.equal(r.disponible,true);assert.equal(r.baseKey,'2026-08');assert.equal(r.contados,4);
  assert.equal(r.totalBase,1800);assert.equal(r.totalActual,2420);assert.equal(Math.round(r.porcentaje*10)/10,34.4);
  assert.equal(r.items[0].nombre,'Tarjeta Visa');assert.equal(r.items[0].delta,400);assert.equal(r.items[0].porcentaje,80);
  const luz=r.items.find(i=>i.clave==='luz');assert.equal(luz.actual,120);assert.equal(luz.delta,20);
  const internet=r.items.find(i=>i.clave==='internet');assert.equal(internet.delta,0);assert.equal(internet.mesesIgual,4);
  assert.equal(r.enDolares.length,1);assert.equal(r.sinConfirmar.length,1);assert.equal(r.soloAhora,1);assert.equal(r.yaNoEstan,1);
  const sinTarjeta=m.calcularInflacion({gastosPorMes:datos,refKey:'2026-11',mesesAtras:3,excluidos:['tarjeta visa']});
  assert.equal(sinTarjeta.contados,3);assert.equal(sinTarjeta.totalBase,1300);assert.equal(sinTarjeta.totalActual,1520);assert.equal(Math.round(sinTarjeta.porcentaje*10)/10,16.9);
  assert.equal(sinTarjeta.items.find(i=>i.clave==='tarjeta visa').contado,false);
  const sinBase=m.calcularInflacion({gastosPorMes:datos,refKey:'2026-11',mesesAtras:6});
  assert.equal(sinBase.disponible,false);assert.equal(sinBase.porcentaje,null);
  assert.equal(m.mesesBaseDisponibles(datos,'2026-11').join(','),'1,2,3');
  assert.equal(m.calcularInflacion({gastosPorMes:{},refKey:'2026-11'}).disponible,false);
  return {cases:6};
});

await check('CALC-10','¿Llegás a fin de mes?: resta cada pago pendiente en su fecha, suma ingresos futuros y detecta el saldo mínimo (src/utils/proyeccion.js)',async()=>{
  const h=await harness(),mod=await h.load(path.join(project,'src/utils/proyeccion.js'));await mod.evaluate();const m=mod.namespace;
  const g=(servicio,monto,o={})=>({servicio,monto,moneda:'ARS',estado:'pendiente',...o});
  const gastos=[g('Colegio',100000,{vencimiento:'2026-11-12'}),g('Viejo',10000,{vencimiento:'2026-11-03'}),g('Internet',50000,{vencimiento:'2026-11-20'}),g('Luz',40000,{vencimiento:'2026-11-20'}),g('Super',30000,{estado:'pagado'}),g('Varios',20000,{vencimiento:''})];
  const r=m.proyectarMes({gastos,tc:1,disponible:80000,hoy:'2026-11-12',mesKey:'2026-11',ingresos:[]});
  assert.equal(r.porPagar,220000);assert.equal(r.enMano,300000);assert.equal(r.cantidad,5);assert.equal(r.vencidos,1);
  assert.equal(r.pasos.length,2);assert.equal(r.pasos[0].fecha,'2026-11-12');assert.equal(r.pasos[0].pagos,110000);assert.equal(r.pasos[0].saldo,190000);
  assert.equal(r.pasos[1].fecha,'2026-11-20');assert.equal(r.pasos[1].pagos,90000);assert.equal(r.pasos[1].saldo,100000);assert.equal(r.pasos[1].items.length,2);
  assert.equal(r.sinFecha.total,20000);assert.equal(r.finDeMes,80000);assert.equal(r.llega,true);assert.equal(r.minimo.saldo,80000);
  const corto=m.proyectarMes({gastos,tc:1,disponible:-30000,hoy:'2026-11-12',mesKey:'2026-11',ingresos:[{fuente:'Extra',monto:60000,dia:'25'},{fuente:'Viejo',monto:1000,dia:'2'}]});
  assert.equal(corto.porCobrar,60000);assert.equal(corto.enMano,130000);
  assert.equal(corto.pasos.length,3);assert.equal(corto.pasos[1].saldo,-70000);assert.equal(corto.pasos[2].fecha,'2026-11-25');assert.equal(corto.pasos[2].cobros,60000);assert.equal(corto.pasos[2].saldo,-10000);
  assert.equal(corto.finDeMes,-30000);assert.equal(corto.llega,false);assert.equal(corto.minimo.saldo,-70000);assert.equal(corto.minimo.fecha,'2026-11-20');
  const nada=m.proyectarMes({gastos:[g('Super',30000,{estado:'pagado'})],disponible:500,hoy:'2026-11-12',mesKey:'2026-11'});
  assert.equal(nada.cantidad,0);assert.equal(nada.pasos.length,0);assert.equal(nada.sinFecha,null);assert.equal(nada.finDeMes,500);assert.equal(nada.llega,true);
  const usd=m.proyectarMes({gastos:[g('Netflix',10,{moneda:'USD',vencimiento:'2026-11-15'})],tc:1500,disponible:0,hoy:'2026-11-12',mesKey:'2026-11'});
  assert.equal(usd.porPagar,15000);assert.equal(usd.pasos[0].saldo,0);
  return {cases:4};
});

await check('CALC-11','Cuotas en pantalla: valida cantidad y número, calcula cuántas se crean y hasta qué mes (src/utils/cuotas.js)',async()=>{
  const h=await harness(),mod=await h.load(path.join(project,'src/utils/cuotas.js'));await mod.evaluate();const m=mod.namespace;
  assert.equal(m.mesSiguiente('2026-11',2),'2027-01');assert.equal(m.mesSiguiente('2026-12',0),'2026-12');
  assert.equal(m.validarCuotasForm({total:'1'}).ok,false);assert.equal(m.validarCuotasForm({total:'61'}).ok,false);
  assert.equal(m.validarCuotasForm({total:'6',desde:'7'}).ok,false);assert.equal(m.validarCuotasForm({total:'6,5'}).ok,false);
  assert.equal(m.validarCuotasForm({total:'6',desde:'1',tieneDesglose:true}).ok,false);
  const v=m.validarCuotasForm({total:'6',desde:'3'});assert.equal(v.ok,true);assert.equal(v.cantidad,4);
  assert.equal(m.validarCuotasForm({total:12,desde:''}).cantidad,12);
  const r=m.resumenCuotas({total:'6',desde:'3',monto:'50000',mesKey:'2026-10'});
  assert.equal(r.cantidad,4);assert.equal(r.desdeKey,'2026-10');assert.equal(r.hastaKey,'2027-01');assert.equal(r.montoTotal,200000);
  assert.equal(m.resumenCuotas({total:'',mesKey:'2026-10'}),null);
  assert.equal(m.etiquetaCuota({cuotaPlanId:'p',cuotaNumero:3,cuotaTotal:12}),'Cuota 3/12');assert.equal(m.etiquetaCuota({servicio:'Luz'}),'');
  assert.equal(m.cuotasQueFaltan({cuotaPlanId:'p',cuotaNumero:3,cuotaTotal:12}),9);assert.equal(m.cuotasQueFaltan({cuotaNumero:3,cuotaTotal:12}),0);
  return {cases:15};
});

await check('CALC-12','Tus cuotas: agrupa por compra, deja afuera las terminadas y suma lo del mes y lo que falta (src/utils/cuotas.js)',async()=>{
  const h=await harness(),mod=await h.load(path.join(project,'src/utils/cuotas.js'));await mod.evaluate();const m=mod.namespace;
  const c=(plan,n,total,monto,estado='pendiente',servicio='Aire')=>({cuotaPlanId:plan,cuotaNumero:n,cuotaTotal:total,monto,estado,servicio});
  const gastosPorMes={
    '2026-09':[c('viejo',1,2,500,'pagado','Zapatillas')],
    '2026-10':[c('viejo',2,2,500,'pagado','Zapatillas'),c('a',1,3,1000,'pagado'),{servicio:'Luz',monto:900,estado:'pendiente'}],
    '2026-11':[c('a',2,3,1000),c('b',1,2,300,'pendiente','Heladera')],
    '2026-12':[c('a',3,3,1000),c('b',2,2,300,'pendiente','Heladera')],
  };
  const nov=m.resumenPlanes({gastosPorMes,mesKey:'2026-11'});
  assert.equal(nov.planes.length,2);assert.equal(nov.planes.map(p=>p.planId).join(','),'a,b');
  assert.equal(nov.totalMes,1300);assert.equal(nov.totalPorPagar,2600);
  const a=nov.planes[0];assert.equal(a.nombre,'Aire');assert.equal(a.cuotaDelMes,2);assert.equal(a.total,3);assert.equal(a.terminaKey,'2026-12');assert.equal(a.cuotasPorPagar,2);assert.equal(a.montoPorPagar,2000);
  const oct=m.resumenPlanes({gastosPorMes,mesKey:'2026-10'});
  assert.equal(oct.planes.length,3);assert.equal(oct.totalMes,1500);assert.equal(oct.totalPorPagar,2600);
  assert.equal(oct.planes.find(p=>p.planId==='b').cuotaDelMes,null);
  assert.equal(m.resumenPlanes({gastosPorMes,mesKey:'2027-01'}).planes.length,0);
  const doble=m.resumenPlanes({gastosPorMes,mesKey:'2026-11',importe:g=>g.monto*2});assert.equal(doble.totalMes,2600);
  assert.equal(m.resumenPlanes({}).planes.length,0);
  return {cases:5};
});

await check('CALC-13','Pendiente por medio de pago: suma solo lo no pagado, agrupa por medio y ordena de mayor a menor (src/utils/porMedio.js)',async()=>{
  const h=await harness(),mod=await h.load(path.join(project,'src/utils/porMedio.js'));await mod.evaluate();const m=mod.namespace;
  const g=(medio,monto,estado)=>({medio,monto,estado});
  const gastos=[g('bancor',1000,'pendiente'),g('bancor',500,'pagado'),g('bancor',250,'pendiente'),g('mp',3000,'pendiente'),g('efectivo',700,'pagado')];
  const meta=x=>({id:x.medio,label:x.medio.toUpperCase(),color:'#fff'});
  const r=m.pendientePorMedio({gastos,meta});
  assert.equal(r.filas.map(f=>f.id).join(','),'mp,bancor');assert.equal(r.total,4250);
  assert.equal(r.filas[1].pendiente,1250);assert.equal(r.filas[1].cantidad,2);assert.equal(r.filas[1].label,'BANCOR');
  assert.equal(m.pendientePorMedio({gastos,meta,importe:x=>x.monto*2}).total,8500);
  assert.equal(m.pendientePorMedio({gastos:[g('a',1,'pagado')],meta}).filas.length,0);assert.equal(m.pendientePorMedio({}).total,0);
  return {cases:4};
});

// CUO-xx: compras en cuotas
const compra={periodo:'2026-10',dia:31,servicio:'Compra ficticia',monto:1000,moneda:'ARS',estado:'pagado',vencimiento:'2026-10-31',etiquetasIds:['tag_a'],cuotas:{total:12}};
const cuotasDe=async()=>(await pg.query("SELECT movimiento_id,periodo,dia,to_char(fecha_operacion,'YYYY-MM-DD') f,to_char(vencimiento,'YYYY-MM-DD') v,estado,monto,cuota_plan_id,cuota_numero,cuota_total FROM movimientos ORDER BY periodo,cuota_numero")).rows;
await check('CUO-01','Compra en 12 cuotas: crea una por mes en una sola operación, con fechas corridas y solo la primera pagada',async()=>{
  const h=await harness();const r=await h.call('gastos.js',compra);assert.equal(r.code,200,JSON.stringify(r.payload));
  const filas=await cuotasDe();assert.equal(filas.length,12);assert.equal(h.batches.length,1);
  assert.equal(r.payload.data.movimientos.length,12);assert.equal(r.payload.data.movimiento_id,filas[0].movimiento_id);assert.equal(r.payload.data.cuota_plan_id,filas[0].cuota_plan_id);
  assert.equal(new Set(filas.map(f=>f.cuota_plan_id)).size,1);assert.equal(new Set(filas.map(f=>f.movimiento_id)).size,12);
  assert.equal(filas.map(f=>f.cuota_numero).join(','),'1,2,3,4,5,6,7,8,9,10,11,12');assert(filas.every(f=>f.cuota_total===12&&Number(f.monto)===1000));
  assert.equal(filas[0].periodo,'2026-10');assert.equal(filas[2].periodo,'2026-12');assert.equal(filas[3].periodo,'2027-01');assert.equal(filas[11].periodo,'2027-09');
  assert.equal(filas[0].v,'2026-10-31');assert.equal(filas[1].v,'2026-11-30');assert.equal(filas[4].v,'2027-02-28');assert.equal(filas[5].v,'2027-03-31');
  assert.equal(filas[1].dia,30);assert.equal(filas[1].f,'2026-11-30');assert.equal(filas[4].f,'2027-02-28');
  assert.equal(filas[0].estado,'pagado');assert(filas.slice(1).every(f=>f.estado==='pendiente'));
  assert.equal((await snapshot()).movimiento_etiquetas.length,12);
  return {rows:12,batches:1,lastPeriod:'2027-09'};
});
await check('CUO-08','Las cuotas siguientes nacen para revisar la fecha de vencimiento; la primera queda como se cargó',async()=>{
  const h=await harness();const r=await h.call('gastos.js',{...compra,cuotas:{total:3,desde:1}});assert.equal(r.code,200,JSON.stringify(r.payload));
  const ids=r.payload.data.movimientos;assert.equal(ids.length,3);
  const filas=(await pg.query('SELECT cuota_numero,requiere_revision,motivo_revision,origen_movimiento FROM movimientos WHERE movimiento_id = ANY($1) ORDER BY cuota_numero',[ids])).rows;
  assert.equal(filas[0].requiere_revision,false);assert.equal(filas[0].motivo_revision,null);
  assert(filas.slice(1).every(f=>f.requiere_revision===true&&f.motivo_revision==='REVISAR_VENCIMIENTO'&&f.origen_movimiento==='CUOTA'),JSON.stringify(filas));
  return {rows:3};
});
await check('CUO-02','Compra ya empezada: desde la cuota 3 de 6 crea solo las cuotas 3 a 6',async()=>{
  const h=await harness();const r=await h.call('gastos.js',{...compra,dia:10,vencimiento:null,estado:'pendiente',cuotas:{total:6,desde:3}});assert.equal(r.code,200,JSON.stringify(r.payload));
  const filas=await cuotasDe();assert.equal(filas.length,4);assert.equal(filas.map(f=>f.cuota_numero).join(','),'3,4,5,6');
  assert.equal(filas[0].periodo,'2026-10');assert.equal(filas[3].periodo,'2027-01');assert(filas.every(f=>f.v===null&&f.estado==='pendiente'&&f.cuota_total===6));
  return {rows:4};
});
await check('CUO-03','Datos de cuotas inválidos se rechazan sin escribir nada',async()=>{
  const h=await harness();const before=await snapshot();
  const casos=[{total:1},{total:61},{total:2.5},{total:6,desde:7},{total:6,desde:0},'doce',[12]];
  for(const cuotas of casos){const r=await h.call('gastos.js',{...compra,cuotas});assert.equal(r.code,400,JSON.stringify(cuotas));}
  const conDesglose=await h.call('gastos.js',{...compra,subconceptos:[{nombre:'Ítem',monto:1000,moneda:'ARS'}]});assert.equal(conDesglose.code,400);assert.match(conDesglose.payload.error,/desglose/);
  assert.deepEqual(await snapshot(),before);assert.equal(h.batches.length,0);
  return {rejected:casos.length+1,databaseUnchanged:true};
});
await check('CUO-04','Si falla una cuota se revierte la compra completa',async()=>{
  let inserts=0;const h=await harness({failure:q=>q.startsWith('INSERT INTO movimientos')&&++inserts===7});const before=await snapshot();
  const r=await h.call('gastos.js',compra);assert.equal(r.code,500);assert.deepEqual(await snapshot(),before);
  return {http:500,databaseUnchanged:true};
});
await check('CUO-05','Un gasto sin cuotas sigue igual y sus columnas de cuota quedan vacías',async()=>{
  await seed();const filas=await cuotasDe();assert.equal(filas.length,1);
  assert.equal(filas[0].cuota_plan_id,null);assert.equal(filas[0].cuota_numero,null);assert.equal(filas[0].cuota_total,null);
  return {plainExpenseUnchanged:true};
});
await check('CUO-06','Eliminar: una sola cuota, o esta y las que faltan; nunca las de otra compra ni las de otra persona',async()=>{
  const h=await harness();const a=await h.call('gastos.js',compra),b=await h.call('gastos.js',{...compra,servicio:'Otra compra',cuotas:{total:3}});
  const ids=a.payload.data.movimientos;
  const una=await h.call('gastos-delete.js',{movimientoId:ids[1]},'DELETE');assert.equal(una.code,200);assert.equal(una.payload.data.eliminados,1);
  assert.equal((await cuotasDe()).filter(f=>f.cuota_plan_id===a.payload.data.cuota_plan_id).length,11);
  // Otra persona no puede borrar: el servidor responde 403 (sin acceso al espacio) o 404 (gasto ajeno), y no se borra nada.
  const ajeno=await harness({userId:'usr_vane'});assert([403,404].includes((await ajeno.call('gastos-delete.js',{movimientoId:ids[4],alcance:'cuotas_restantes'},'DELETE')).code));
  assert.equal((await cuotasDe()).filter(f=>f.cuota_plan_id===a.payload.data.cuota_plan_id).length,11);
  const resto=await h.call('gastos-delete.js',{movimientoId:ids[4],alcance:'cuotas_restantes'},'DELETE');assert.equal(resto.code,200,JSON.stringify(resto.payload));assert.equal(resto.payload.data.eliminados,8);
  const quedan=await cuotasDe();
  assert.equal(quedan.filter(f=>f.cuota_plan_id===a.payload.data.cuota_plan_id).map(f=>f.cuota_numero).join(','),'1,3,4');
  assert.equal(quedan.filter(f=>f.cuota_plan_id===b.payload.data.cuota_plan_id).length,3);
  assert.equal((await snapshot()).movimiento_etiquetas.length,6);
  assert.equal((await h.call('gastos-delete.js',{movimientoId:ids[0],alcance:'todo'},'DELETE')).code,400);
  await reset();const comun=await seed();assert.equal((await h.call('gastos-delete.js',{movimientoId:comun,alcance:'cuotas_restantes'},'DELETE')).code,400);assert.equal((await cuotasDe()).length,1);
  return {single:1,remaining:8,otherPlanIntact:true,otherUserBlocked:true};
});
await check('CUO-07','La base rechaza datos de cuota incoherentes',async()=>{
  const id=await seed();
  for(const set of ["cuota_numero=1","cuota_plan_id='p',cuota_numero=3,cuota_total=2","cuota_plan_id='p',cuota_numero=0,cuota_total=5","cuota_plan_id='p',cuota_numero=1,cuota_total=1","cuota_plan_id='p',cuota_numero=1,cuota_total=61"]){
    await assert.rejects(pg.query(`UPDATE movimientos SET ${set} WHERE movimiento_id=$1`,[id]),set);
  }
  await pg.query("UPDATE movimientos SET cuota_plan_id='p',cuota_numero=2,cuota_total=3 WHERE movimiento_id=$1",[id]);
  return {constraintEnforced:true};
});

// ERR-xx: errores unificados (api/_http.js). Ningún texto técnico de la base llega a la pantalla.
const TECNICO=/violates|constraint|foreign key|duplicate key|null value|relation|does not exist|movimiento_etiquetas|etiqueta_id|SQLSTATE|syntax error/i;
await check('ERR-01','Clave foránea inexistente responde 409 con mensaje propio, sin texto técnico de la base',async()=>{
  const h=await harness();const r=await h.call('gastos.js',{...expense,etiquetasIds:['inexistente']});
  assert.equal(r.code,409,JSON.stringify(r.payload));assert.match(r.payload.error,/no existe/);assert.doesNotMatch(r.payload.error,TECNICO);
  assert.ok(h.errors.length>=1,'el detalle técnico debe quedar en el log del servidor');
  return {http:409,message:r.payload.error};
});
await check('ERR-02','Falla inesperada responde 500 genérico y deja el detalle solo en el log',async()=>{
  const h=await harness({failure:q=>q.startsWith('INSERT INTO detalle_movimiento')});const r=await h.call('gastos.js',expense);
  assert.equal(r.code,500);assert.doesNotMatch(r.payload.error,/Fallo de escritura/);assert.match(r.payload.error,/Intentá de nuevo/);
  assert.ok(h.errors.some(e=>/Fallo de escritura/.test(e)),'el log debe conservar el detalle');
  return {http:500,message:r.payload.error};
});
await check('ERR-03','Tabla inexistente no filtra nombres internos de la base en la respuesta',async()=>{
  const h=await harness();const r=await h.call('catalogos-admin.js',{recurso:'concepto',conceptoId:'con_x',nombre:'Prueba'},'PUT');
  assert.equal(r.code,500,JSON.stringify(r.payload));assert.doesNotMatch(r.payload.error,TECNICO);assert.doesNotMatch(r.payload.error,/conceptos/i);
  return {http:500,message:r.payload.error};
});
await check('ERR-04','Catálogos: datos faltantes responden 400 y recursos inexistentes 404, con su mensaje',async()=>{
  const h=await harness();
  const sinNombre=await h.call('catalogos-admin.js',{recurso:'concepto'},'POST');assert.equal(sinNombre.code,400);assert.equal(sinNombre.payload.error,'Falta nombre del concepto');
  const sinId=await h.call('catalogos-admin.js',{recurso:'etiqueta'},'DELETE');assert.equal(sinId.code,400);assert.equal(sinId.payload.error,'Falta etiquetaId');
  const sinRecurso=await h.call('catalogos-admin.js',{},'POST');assert.equal(sinRecurso.code,400);
  return {http:[400,400,400]};
});
await check('ERR-05','Traducción de errores reales de PostgreSQL: dato inválido 400, conflicto 409, otro 500',async()=>{
  const h=await harness(),mod=await h.load(path.join(project,'api/_http.js'));await mod.evaluate();const {traducirError}=mod.namespace;
  const fail=async q=>{try{await pg.query(q);}catch(e){return e;}throw Error('La consulta debía fallar: '+q);};
  const check_=traducirError(await fail("INSERT INTO movimientos(movimiento_id,monto) VALUES('x',-1)"));
  const nulo=traducirError(await fail("INSERT INTO etiquetas VALUES(NULL)"));
  const duplicado=traducirError(await fail("INSERT INTO etiquetas VALUES('tag_a')"));
  const fk=traducirError(await fail("INSERT INTO movimiento_etiquetas VALUES('no_existe','tag_a')"));
  const sintaxis=traducirError(await fail("SELEC 1"));
  assert.equal(check_.status,400);assert.equal(nulo.status,400);assert.equal(duplicado.status,409);assert.equal(fk.status,409);assert.equal(sintaxis.status,500);
  for(const t of [check_,nulo,duplicado,fk,sintaxis])assert.doesNotMatch(t.mensaje,TECNICO);
  assert.equal(traducirError(Object.assign(Error('Mensaje propio'),{statusCode:403})).mensaje,'Mensaje propio');
  assert.equal(traducirError(Object.assign(Error('interno'),{statusCode:500})).status,500);
  return {check:check_.status,notNull:nulo.status,unique:duplicado.status,foreignKey:fk.status,syntax:sintaxis.status};
});

await fs.writeFile(path.join(out,'resultados-api-postgres.json'),JSON.stringify(results,null,2));await pg.close();
if(results.some(r=>r.status==='fallo'))process.exitCode=1;
