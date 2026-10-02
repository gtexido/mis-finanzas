// Auditoría local: usa solo datos ficticios y bloquea todas las conexiones externas.
// Requiere el frontend en http://127.0.0.1:4173 y Playwright con Chromium.
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const req = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
  ? createRequire(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'playwright/package.json'))
  : require;
const { chromium } = req('playwright');
const out = path.resolve(__dirname, '../evidencias');
const base = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:4173';
const user = {usuarioId:'usr_gustavo', nombre:'Usuario de prueba', workspaceId:'ws_audit'};
const catalogos = {
  categorias:[{categoria_id:'cat_bancon',nombre:'Banco de prueba',color:'#60a5fa'}],
  formasPago:[{forma_pago_id:'fp_manual',nombre:'Manual'}], servicios:[], fuentesIngreso:[],
  parametros:[{clave:'tipo_cambio_default',valor:1000}],
  mediosPago:[{medio_pago_id:'mp_bancon',nombre:'Banco de prueba',tipo:'banco',color:'#60a5fa'}],
  instrumentosPago:[{instrumento_id:'ins_manual',nombre:'Manual',tipo:'manual'}],
  categoriasGasto:[{categoria_gasto_id:'cg_servicios',nombre:'Servicios',color:'#a78bfa'}],
  etiquetas:[],conceptoEtiquetas:[],
  conceptos:[{concepto_id:'con_audit',workspace_id:'ws_audit',nombre:'Servicio de prueba',
    medio_pago_id:'mp_bancon',instrumento_id:'ins_manual',categoria_gasto_id:'cg_servicios',moneda_default:'ARS'}]
};
function movimiento(periodo, monto, id=`audit_${periodo}`) {
  return {movimiento_id:id,tipo_movimiento:'GASTO',subtipo_movimiento:'GASTO',periodo,dia:1,
    concepto_id:'con_audit',concepto_nombre:'Servicio de prueba',categoria_id:'cat_bancon',
    monto,moneda:'ARS',estado:'pendiente',vencimiento:`${periodo}-15`,
    medio_pago_id:'mp_bancon',medio_pago_nombre:'Banco de prueba',instrumento_id:'ins_manual',
    instrumento_nombre:'Manual',categoria_gasto_id:'cg_servicios',categoria_gasto_nombre:'Servicios',
    workspace_id:'ws_audit',activo:true,observacion:'Solo datos ficticios'};
}
const results=[];
let browser;
let devServer;
async function setup({expired=false,delayWrites=false,emptyCurrent=false,emptyNext=false,loadError=false}={}) {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,
    timezoneId:'America/Argentina/Buenos_Aires',locale:'es-AR',acceptDownloads:true,serviceWorkers:'block'});
  const page=await context.newPage();
  await page.clock.setFixedTime(new Date('2026-10-01T12:00:00-03:00'));
  await page.addInitScript(({user})=>{
    localStorage.setItem('mf_auth_token','ficticio-sin-acceso-real');
    localStorage.setItem('mf_auth_user',JSON.stringify(user));
  },{user});
  const requests=[],pageErrors=[];
  const db=Object.fromEntries([6,7,8,9,10,11].map(m=>{
    const p=`2026-${String(m).padStart(2,'0')}`;
    return [p,[movimiento(p,m*10000)]];
  }));
  if(emptyCurrent)db['2026-10']=[];
  if(emptyNext)db['2026-11']=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  await context.route('**/*',async route=>{
    const r=route.request(),url=new URL(r.url());
    if(url.origin!==new URL(base).origin) return route.abort();
    if(!url.pathname.startsWith('/api/')) return route.continue();
    const entry={method:r.method(),path:url.pathname,periodo:url.searchParams.get('periodo')};
    if(r.postData())entry.body=r.postDataJSON();
    requests.push(entry);
    const send=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
    if(loadError) return send({ok:false,error:'Error de conexión de prueba'},503);
    if(expired) return send({ok:false,error:'Sesión inválida o vencida'},401);
    if(url.pathname==='/api/catalogos')return send({ok:true,data:catalogos});
    if(url.pathname==='/api/movimientos')return send({ok:true,data:{movimientos:entry.periodo ? db[entry.periodo]||[] : Object.values(db).flat(),detalles:[],etiquetas:[]}});
    if(url.pathname==='/api/cotizaciones')return send({ok:true,data:{valor:1000,fuente:'prueba'}});
    if(r.method()!=='GET'){
      if(delayWrites) await new Promise(resolve=>setTimeout(resolve,350));
      if(url.pathname==='/api/gastos'){
        const p=entry.body.periodo;
        const mov=movimiento(p,entry.body.monto,`audit_created_${requests.length}`);
        (db[p]||=[]).push(mov);
        return send({ok:true,data:{movimiento_id:mov.movimiento_id}});
      }
      return send({ok:true,data:{movimiento_id:'audit_updated'}});
    }
    return send({ok:false,error:'Ruta no prevista en la prueba'},404);
  });
  await page.goto(base);
  await page.waitForLoadState('networkidle');
  return {context,page,requests,db,pageErrors};
}
const nav=(page,text)=>page.locator('.ni').filter({hasText:text}).click();
const data=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('gapp_v7')));
async function capture(page,name){await page.screenshot({path:path.join(out,name),fullPage:true});}
async function probe(id,title,run){
  if(process.env.AUDIT_ONLY && !process.env.AUDIT_ONLY.split(',').includes(id))return;
  try{const detail=await run();results.push({id,title,status:'correcto',...detail});}
  catch(e){results.push({id,title,status:'fallo',error:String(e.stack)});}
  console.log(id,results.at(-1).status);
  await fs.writeFile(path.join(out,'resultados-navegador.json'),JSON.stringify(results,null,2));
}

async function cargar(s) {
  await nav(s.page,'Cargar');
  await s.page.getByRole('button',{name:'Servicio de prueba',exact:true}).click();
}
async function desglose(s,moneda='ARS') {
  await cargar(s);
  await s.page.getByRole('button',{name:'Más opciones avanzadas',exact:true}).click();
  await s.page.getByRole('button',{name:'Agregar desglose',exact:true}).click();
  if(moneda==='USD')await s.page.getByRole('button',{name:'💵 USD',exact:true}).click();
  await s.page.getByRole('button',{name:/Agregar ítems al desglose/}).click();
  await s.page.getByPlaceholder('Nombre del ítem...', {exact:true}).fill('Ítem ficticio');
  await s.page.getByPlaceholder('0.00',{exact:true}).fill(moneda==='USD'?'10':'2500');
  await s.page.getByRole('button',{name:'+',exact:true}).click();
}
const writes=s=>s.requests.filter(r=>r.path==='/api/gastos'&&r.method==='POST');
(async()=>{
  await fs.mkdir(out,{recursive:true});
  const root=path.resolve(process.env.AUDIT_PROJECT);
  const {createServer}=await import(pathToFileURL(path.join(root,'node_modules/vite/dist/node/index.js')).href);
  devServer=await createServer({root,server:{host:'127.0.0.1',port:4173,strictPort:true}});
  await devServer.listen();
  const launch={headless:true,args:['--no-sandbox']};
  if(process.env.AUDIT_CHROMIUM_MODULE){
    const {default:bundled}=await import(process.env.AUDIT_CHROMIUM_MODULE);
    launch.executablePath=process.env.AUDIT_BROWSER_EXECUTABLE || await bundled.executablePath();
    launch.args=bundled.args.filter(arg=>arg!=='--single-process');
  }
  browser=await chromium.launch(launch);
  await probe('UI-01','Borrar y reescribir un importe del desglose sin cero forzado',async()=>{
    const s=await setup({emptyCurrent:true});try{
      await desglose(s);
      const input=s.page.getByLabel('Importe del ítem 1');
      await input.fill('');assert.equal(await input.inputValue(),'');
      assert(await s.page.getByRole('button',{name:'Guardar desglose y volver',exact:true}).isDisabled());
      await capture(s.page,'01-importe-vacio.png');
      await input.pressSequentially('25.50');assert.equal(await input.inputValue(),'25.50');
      await s.page.getByRole('button',{name:'Guardar desglose y volver',exact:true}).click();
      const resp=s.page.waitForResponse(r=>r.url().includes('/api/gastos'));
      await s.page.getByRole('button',{name:'Guardar gasto',exact:true}).click();await resp;
      assert.equal(writes(s)[0].body.subconceptos[0].monto,25.5);
      assert.equal(s.pageErrors.length,0);
      return {emptyPreserved:true,typed:'25.50',saved:25.5};
    }finally{await s.context.close();}
  });
  await probe('UI-02','Histórico y exportación de todos los meses',async()=>{
    const s=await setup();try{
      await nav(s.page,'Evol.');
      const six=s.page.getByRole('button',{name:'6M',exact:true});if(await six.count())await six.click();
      const loaded=await data(s.page);assert.equal(Object.keys(loaded.gastos).length,6);
      await capture(s.page,'02-historico.png');
      await nav(s.page,'Vence');await capture(s.page,'03-vencimientos.png');
      await nav(s.page,'Ajustes');await s.page.getByRole('button',{name:/Backup y datos/}).click();
      const downloaded=s.page.waitForEvent('download');downloaded.catch(()=>{});
      await s.page.getByRole('button',{name:/Descargar movimientos/}).click();
      const download=await downloaded, saved=path.join(out,'exportacion-ficticia.json');await download.saveAs(saved);
      const exp=JSON.parse(await fs.readFile(saved,'utf8'));
      assert.deepEqual(Object.keys(exp.data.gastos).sort(),Object.keys(s.db).sort());
      assert.equal(exp.version,'v2');assert.equal(exp.usuarioId,user.usuarioId);
      assert.equal(await s.page.locator('input[type=file]').count(),0);
      assert.equal(await s.page.getByRole('button',{name:/Enviar backup completo a Sheets/}).count(),0);
      await capture(s.page,'04-exportacion.png');
      assert.equal(s.pageErrors.length,0);
      return {months:Object.keys(exp.data.gastos),fakeRestoreRemoved:true,fakeSheetsRemoved:true};
    }finally{await s.context.close();}
  });
  await probe('UI-03','Sesión vencida vuelve al ingreso',async()=>{
    const s=await setup({expired:true});try{
      assert.equal(await s.page.locator('input[type=password]').count(),1);
      assert.equal(await s.page.getByText('Sin gastos este mes',{exact:true}).count(),0);
      assert.equal(await s.page.evaluate(()=>localStorage.getItem('mf_auth_token')),null);
      await capture(s.page,'05-sesion-vencida.png');return {loginVisible:true,tokenRemoved:true};
    }finally{await s.context.close();}
  });
  await probe('UI-04','Error de conexión no muestra saldos vacíos',async()=>{
    const s=await setup({loadError:true});try{
      assert(await s.page.getByRole('alert').isVisible());
      assert(await s.page.getByRole('button',{name:'Reintentar',exact:true}).isVisible());
      assert.equal(await s.page.getByText('Sin gastos este mes',{exact:true}).count(),0);
      return {errorVisible:true};
    }finally{await s.context.close();}
  });
  await probe('UI-05','Doble toque guarda una sola vez',async()=>{
    const s=await setup({delayWrites:true,emptyCurrent:true});try{
      await cargar(s);await s.page.getByPlaceholder('0',{exact:true}).fill('2500');
      await s.page.getByRole('button',{name:'Guardar gasto',exact:true}).evaluate(b=>{b.click();b.click();});
      await s.page.waitForFunction(()=>JSON.parse(localStorage.getItem('gapp_v7')).gastos['2026-10']?.length===1);
      assert.equal(writes(s).length,1);assert.equal(s.db['2026-10'].length,1);
      return {posts:1,records:1};
    }finally{await s.context.close();}
  });
  for(const moneda of ['ARS','USD'])await probe(`UI-06-${moneda}`,'Ocultar opciones conserva desglose '+moneda,async()=>{
    const s=await setup({emptyCurrent:true});try{
      await desglose(s,moneda);
      await s.page.getByRole('button',{name:'Guardar desglose y volver',exact:true}).click();
      await s.page.getByRole('button',{name:'Ocultar opciones avanzadas',exact:true}).click();
      assert(await s.page.getByText('Ítem ficticio',{exact:true}).isVisible());
      const response=s.page.waitForResponse(r=>r.url().includes('/api/gastos'));
      await s.page.getByRole('button',{name:'Guardar gasto',exact:true}).click();await response;
      const b=writes(s)[0].body;assert.equal(b.subconceptos.length,1);
      assert.equal(b.subconceptos[0].moneda,moneda);assert.equal(b.subconceptos[0].monto,moneda==='USD'?10:2500);
      if(moneda==='USD')assert.equal(b.subconceptos[0].montoARSCalculado,10000);
      return {payload:b};
    }finally{await s.context.close();}
  });
  await probe('UI-07','La copia verifica el mes destino antes de escribir',async()=>{
    const s=await setup({emptyNext:true});try{
      s.db['2026-11']=[movimiento('2026-11',123)];
      await s.page.getByRole('button',{name:'Replicar gastos',exact:true}).click();
      await s.page.getByRole('button',{name:/Continuar|Siguiente|Copiar.*gasto/}).last().click();
      await s.page.getByRole('button',{name:/Confirmar copia/}).click();
      await s.page.getByText('Ese mes ya tiene gastos. Revisalo antes de volver a copiar.',{exact:true}).waitFor();
      assert.equal(writes(s).length,0);assert.equal(s.db['2026-11'].length,1);
      return {destinationWasRechecked:true,posts:0};
    }finally{await s.context.close();}
  });
  await probe('UI-08','Edición de gasto: vacío, decimales y doble toque',async()=>{
    const s=await setup({delayWrites:true});try{
      await nav(s.page,'Detalle');
      await s.page.getByText('Servicio de prueba',{exact:true}).first().click();
      const input=s.page.getByLabel('Importe del gasto');await input.fill('');assert.equal(await input.inputValue(),'');
      await s.page.getByRole('button',{name:'Guardar cambios',exact:true}).click();
      assert.equal(s.requests.filter(r=>r.path==='/api/gastos-update').length,0);
      await input.pressSequentially('75.25');assert.equal(await input.inputValue(),'75.25');
      const response=s.page.waitForResponse(r=>r.url().includes('/api/gastos-update'));
      await s.page.getByRole('button',{name:'Guardar cambios',exact:true}).evaluate(b=>{b.click();b.click();});await response;
      const updates=s.requests.filter(r=>r.path==='/api/gastos-update');assert.equal(updates.length,1);assert.equal(updates[0].body.monto,75.25);
      return {emptyPreserved:true,saved:75.25,updates:1};
    }finally{await s.context.close();}
  });
  await probe('UI-09','Copia válida y doble toque',async()=>{
    const s=await setup({emptyNext:true,delayWrites:true});try{
      await s.page.getByRole('button',{name:'Replicar gastos',exact:true}).click();
      await s.page.getByRole('button',{name:/Continuar|Siguiente|Copiar.*gasto/}).last().click();
      await s.page.getByRole('button',{name:/Confirmar copia/}).evaluate(b=>{b.click();b.click();});
      await s.page.waitForFunction(()=>JSON.parse(localStorage.getItem('gapp_v7')).gastos['2026-11']?.length===1);
      assert.equal(writes(s).length,1);assert.equal(writes(s)[0].body.conceptoId,'con_audit');
      return {posts:1,conceptPreserved:true};
    }finally{await s.context.close();}
  });
  await browser.close();await devServer.close();
  if(results.some(r=>r.status==='fallo'))process.exitCode=1;
})().catch(async e=>{console.error(e);if(browser)await browser.close();if(devServer)await devServer.close();process.exitCode=1;});
