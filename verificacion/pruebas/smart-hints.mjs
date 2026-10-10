// Synthetic records only; no backend writes or external services.
import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true } });
const { findPossibleDuplicate, recurringIncreases, nextAction, nativeAmounts } = await server.ssrLoadModule('/src/utils/smartHints.js');
const { buildOverview } = await server.ssrLoadModule('/src/utils/overview.js');
const today = new Date(2026, 9, 5, 12);
const expense = (id, extra = {}) => ({ id, servicio: 'Internet', medioPagoId: 'mp_a', dia: 5, monto: 15000, moneda: 'ARS', estado: 'pendiente', vencimiento: '2026-10-05', esRecurrente: true, ...extra });
const results = [];
function test(id,title,run) { try { run(); results.push({id,title,status:'correcto'}); } catch(error) { results.push({id,title,status:'fallo',error:error.message}); } }
test('SMART-01','Duplicado por día o vencimiento y moneda original, con alias normalizados',()=>{
 const old=expense('old',{servicio:'  INTERNET  ',dia:1});
 assert.equal(findPossibleDuplicate(expense('new'),[old]).id,'old');
 assert.equal(findPossibleDuplicate(expense('new',{vencimiento:'2026-10-06',dia:1}),[old]).id,'old');
 const usd=expense('usd',{moneda:'USD',monto:10,tipoCambio:1000});
 assert.equal(findPossibleDuplicate(expense('new',{moneda:'USD',monto:10,tipoCambio:1500}),[usd]).id,'usd');
 assert.equal(findPossibleDuplicate(expense('new',{medioPagoId:'mp_bancon'}),[expense('legacy',{medioPagoId:'',categoria:'bancon'})]).id,'legacy');
});
test('SMART-02','Cuentas, conceptos, fechas o monedas distintas no se confunden',()=>{
 const old=expense('old',{conceptoId:'c1'});
 for(const change of [{medioPagoId:'mp_b'},{conceptoId:'c2'},{dia:6,vencimiento:'2026-10-07'},{moneda:'USD',monto:15},{monto:14999.99},{id:'old'}])assert.equal(findPossibleDuplicate(expense('new',change),[old]),null);
 assert.equal(findPossibleDuplicate(expense('new',{medioPagoId:''}),[expense('old',{medioPagoId:''})]),null);
});
test('SMART-03','Detalle mixto compara totales por moneda y no solo su equivalente en pesos',()=>{
 const old=expense('old',{subconceptos:[{moneda:'ARS',monto:200},{moneda:'USD',monto:3,tipoCambio:1000}]});
 const draft=expense('new',{subconceptos:[{moneda:'USD',monto:3,tipoCambio:1200},{moneda:'ARS',monto:200}]});
 assert.equal(findPossibleDuplicate(draft,[old]).id,'old');
 assert.equal(findPossibleDuplicate(expense('new',{monto:3200}),[old]),null);
 assert.equal(nativeAmounts(expense('invalid',{monto:NaN})),null);
});
test('SMART-04','Aumento habitual compara una carga confirmada de cada mes',()=>{
 const current=expense('current'), previous=expense('previous',{monto:12000});
 const [change]=recurringIncreases([current],[previous]);
 assert.equal(change.delta,3000);assert.equal(change.percent,25);assert.equal(change.currency,'ARS');
 assert.equal(recurringIncreases([expense('current',{monto:11000})],[previous]).length,0);
 assert.equal(recurringIncreases([expense('current',{esRecurrente:false})],[expense('previous',{monto:12000,esRecurrente:false})]).length,0);
});
test('SMART-05','Cotización distinta no se presenta como aumento del servicio',()=>{
 const old=expense('old',{moneda:'USD',monto:10,tipoCambio:1000});
 assert.deepEqual(recurringIncreases([expense('new',{moneda:'USD',monto:10,tipoCambio:1500})],[old]),[]);
 const [change]=recurringIncreases([expense('new',{moneda:'USD',monto:12,tipoCambio:1500})],[old]);assert.equal(change.delta,2);assert.equal(change.percent,20);assert.equal(change.currency,'USD');
});
test('SMART-06','No hay aumentos ficticios con revisiones, múltiples cargos, mezclas o base cero',()=>{
 const old=expense('old',{monto:12000}),current=expense('current');
 for(const [now,before] of [[[expense('current',{requiereRevision:true})],[old]],[[current],[expense('old',{requiereRevision:true})]],[[current,expense('extra')],[old]],[[current],[old,expense('extra')]],[[current],[expense('old',{monto:0})]],[[current],[]],[[expense('current',{moneda:'USD'})],[old]],[[expense('current',{subconceptos:[{moneda:'ARS',monto:15000},{moneda:'USD',monto:1}]})],[old]]])assert.deepEqual(recurringIncreases(now,before),[]);
});
test('SMART-07','Próxima acción prioriza vencidos y débitos; después próximos y revisión',()=>{
 const auto=expense('auto',{formaPago:'Débito automático'}),soon=expense('soon',{vencimiento:'2026-10-07'}),review=expense('review',{requiereRevision:true,vencimiento:''});
 let action=nextAction(buildOverview([expense('overdue',{vencimiento:'2026-10-04'}),auto,soon,review],1000,today));assert.equal(action.filter,'all');assert.ok(action.title.includes('2 pagos'));assert.ok(action.detail.includes('1 vencido'));
 assert.equal(nextAction(buildOverview([auto,soon,review],1000,today)).filter,'debits');assert.equal(nextAction(buildOverview([soon,review],1000,today)).filter,'soon');assert.equal(nextAction(buildOverview([review],1000,today)).filter,'review');
});
test('SMART-08','Sin tareas o todo pagado no se inventa una próxima acción',()=>{
 for(const items of [[],[expense('paid',{estado:'pagado'})],[expense('later',{vencimiento:'2026-10-20'})]])assert.equal(nextAction(buildOverview(items,1000,today)),null);
 assert.equal(nextAction(buildOverview([expense('paid-review',{estado:'pagado',requiereRevision:true})],1000,today)).filter,'review');
});
await mkdir('verificacion/avisos',{recursive:true});await writeFile('verificacion/avisos/calculos.json',JSON.stringify(results,null,2));
for(const result of results)console.log(result.id,result.status,result.error||'');
await server.close();if(results.some(result=>result.status==='fallo'))process.exitCode=1;
