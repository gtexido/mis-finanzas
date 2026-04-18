// ================================================================
// MIS FINANZAS — Google Apps Script v3
// Sheet ID configurado: 1A-TZ2nmbxYq1E6leXBKbkIsrBXGyokqmZyRqJrvWbsk
// ================================================================

const SHEET_ID = '1A-TZ2nmbxYq1E6leXBKbkIsrBXGyokqmZyRqJrvWbsk';

// ── GET: la app pide los datos al abrir ──────────────────────────
function doGet(e) {
  const action = e && e.parameter && e.parameter.action;

  if (action === 'getAll') {
    try {
      const ss = SpreadsheetApp.openById(SHEET_ID);
      const data = { gastos: {}, ingresos: {}, sueldo: {} };

      // Leer todas las hojas de gastos (Gastos_YYYY-MM)
      ss.getSheets().forEach(hoja => {
        const nombre = hoja.getName();
        if (nombre.startsWith('Gastos_')) {
          const mesKey = nombre.replace('Gastos_', '');
          const filas = hoja.getDataRange().getValues();
          if (filas.length <= 1) return; // Solo encabezado
          data.gastos[mesKey] = filas.slice(1).filter(f => f[0]).map(f => {
            const subcsRaw = f[10] || '';
            const subconceptos = subcsRaw ? subcsRaw.split(' | ').map(s => {
              const parts = s.split(':U$D');
              return { id: 'sc'+Date.now()+Math.random(), nombre: parts[0]||s, montoUSD: parseFloat(parts[1])||0 };
            }) : [];
            return {
              id: f[0], dia: String(f[1]||'1'), categoria: f[2]||'otros',
              formaPago: f[3]||'Manual', servicio: f[4]||'',
              monto: parseFloat(f[5])||0, moneda: f[6]||'ARS',
              estado: f[7]||'pendiente',
              vencimiento: f[8] ? (f[8] instanceof Date ? Utilities.formatDate(f[8], 'UTC', 'yyyy-MM-dd') : String(f[8])) : '',
              observacion: f[9]||'', subconceptos
            };
          });
        }

        if (nombre === 'Resumen') {
          const filas = hoja.getDataRange().getValues();
          filas.slice(1).forEach(f => { if (f[0]) data.sueldo[f[0]] = parseFloat(f[1])||0; });
        }

        if (nombre === 'Ingresos') {
          const filas = hoja.getDataRange().getValues();
          filas.slice(1).forEach(f => {
            if (!f[0]) return;
            const mes = f[0] instanceof Date ? Utilities.formatDate(f[0],'UTC','yyyy-MM') : String(f[0]);
            if (!data.ingresos[mes]) data.ingresos[mes] = [];
            data.ingresos[mes].push({ id: Date.now()+Math.random(), fuente: f[1]||'', monto: parseFloat(f[2])||0, dia: String(f[3]||'1') });
          });
        }
      });

      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, data }))
        .setMimeType(ContentService.MimeType.JSON);

    } catch(err) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // GET sin action: ping de verificación
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, msg: 'Mis Finanzas API activa ✅' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── POST: la app guarda datos ────────────────────────────────────
function doPost(e) {
  try {
    let payload;
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e.parameter && e.parameter.payload) {
      payload = JSON.parse(e.parameter.payload);
    } else {
      throw new Error('Sin payload');
    }

    const { tipo, mesKey, datos } = payload;
    const ss = SpreadsheetApp.openById(SHEET_ID);

    if (tipo === 'gastos') sincronizarGastos(ss, mesKey, datos);
    else if (tipo === 'sueldo') sincronizarSueldo(ss, mesKey, datos);
    else if (tipo === 'ingresos') sincronizarIngresos(ss, mesKey, datos);
    else if (tipo === 'full_backup') fullBackup(ss, datos);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Funciones de escritura ───────────────────────────────────────
function sincronizarGastos(ss, mesKey, gastos) {
  const nombre = 'Gastos_' + mesKey;
  let hoja = ss.getSheetByName(nombre);
  if (!hoja) {
    hoja = ss.insertSheet(nombre);
    const enc = hoja.getRange(1,1,1,11);
    enc.setValues([['ID','Día','Categoría','Forma de Pago','Servicio','Monto','Moneda','Estado','Vencimiento','Observación','Subconceptos']]);
    enc.setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
    hoja.setFrozenRows(1);
  }
  const ultima = hoja.getLastRow();
  if (ultima > 1) hoja.getRange(2,1,ultima-1,11).clearContent();
  if (!gastos || gastos.length === 0) return;

  const filas = gastos.map(g => {
    const subcs = (g.subconceptos||[]).length > 0
      ? g.subconceptos.map(s=>`${s.nombre}:U$D${s.montoUSD}`).join(' | ')
      : '';
    return [g.id||'', g.dia||'', g.categoria||'', g.formaPago||'', g.servicio||'',
            g.monto||0, g.moneda||'ARS', g.estado||'', g.vencimiento||'', g.observacion||'', subcs];
  });

  hoja.getRange(2,1,filas.length,11).setValues(filas);
  gastos.forEach((g,i)=>{
    hoja.getRange(i+2,1,1,11).setBackground(g.estado==='pagado'?'#0a2010':'#2a1a00');
  });
  hoja.autoResizeColumns(1,11);
}

function sincronizarSueldo(ss, mesKey, monto) {
  let hoja = ss.getSheetByName('Resumen');
  if (!hoja) {
    hoja = ss.insertSheet('Resumen');
    hoja.getRange(1,1,1,2).setValues([['Mes','Sueldo']]);
    hoja.getRange(1,1,1,2).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
  }
  const datos = hoja.getDataRange().getValues();
  let fila = -1;
  for (let i=1; i<datos.length; i++) { if (datos[i][0]===mesKey){fila=i+1;break;} }
  if (fila>0) hoja.getRange(fila,2).setValue(monto);
  else hoja.getRange(hoja.getLastRow()+1,1,1,2).setValues([[mesKey,monto]]);
}

function sincronizarIngresos(ss, mesKey, ingresos) {
  let hoja = ss.getSheetByName('Ingresos');
  if (!hoja) {
    hoja = ss.insertSheet('Ingresos');
    hoja.getRange(1,1,1,4).setValues([['Mes','Fuente','Monto','Día']]);
    hoja.getRange(1,1,1,4).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
  }
  const datos = hoja.getDataRange().getValues();
  for (let i=datos.length-1; i>=1; i--) { if (datos[i][0]===mesKey) hoja.deleteRow(i+1); }
  if (!ingresos || ingresos.length===0) return;
  hoja.getRange(hoja.getLastRow()+1,1,ingresos.length,4)
    .setValues(ingresos.map(ing=>[mesKey, ing.fuente||'', ing.monto||0, ing.dia||'']));
}

function fullBackup(ss, data) {
  Object.entries(data.gastos||{}).forEach(([k,v])=>sincronizarGastos(ss,k,v));
  Object.entries(data.sueldo||{}).forEach(([k,v])=>sincronizarSueldo(ss,k,v));
  Object.entries(data.ingresos||{}).forEach(([k,v])=>sincronizarIngresos(ss,k,v));
}
