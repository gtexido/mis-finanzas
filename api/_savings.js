import crypto from 'crypto';
import { validarPeriodoDia } from './_validation.js';
import { validateSavingsLedger } from '../src/utils/savings.js';

// An independent, versioned ledger per authenticated user. The existing
// movement table and its type constraints do not need to change.
export async function ensureSavingsStore(sql) {
  try {
    await sql`CREATE TABLE IF NOT EXISTS ahorro_libros (
      workspace_id text NOT NULL, usuario_id text NOT NULL,
      revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
      datos jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(datos) = 'array'),
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (workspace_id, usuario_id)
    )`;
  } catch (error) {
    // Two cold instances may attempt the same additive initialization.
    if (!['42P07', '23505'].includes(error.code)) throw error;
  }
}
const fail = (message, statusCode = 400) => { const error = new Error(message); error.statusCode = statusCode; throw error; };
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function money(value, name, precision = 2) {
  const n = Number(value), scale = 10 ** precision;
  if (value === '' || value == null || !Number.isFinite(n) || n <= 0 || n > 1e10 || Math.abs(n * scale - Math.round(n * scale)) > 0.001) fail(`${name}: ingresá un valor positivo con hasta ${precision} decimales.`);
  return Math.round(n * scale) / scale;
}
function text(value, name, required = false) {
  const clean = String(value || '').trim();
  if ((required && !clean) || clean.length > 120) fail(`Revisá ${name}; se permiten hasta 120 caracteres.`);
  return clean;
}
function validateEntry(body) {
  if (!['aporte', 'retiro', 'inicial'].includes(body.kind)) fail('Elegí qué querés registrar.');
  if (!['ARS', 'USD'].includes(body.currency)) fail('Elegí pesos o dólares.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date || '')) fail('Ingresá una fecha válida.');
  validarPeriodoDia(body.date.slice(0,7), Number(body.date.slice(8)));
  const today = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  if (body.date > today) fail('Registrá ahorros realizados hasta hoy.');
  const amount = money(body.amount, 'Importe');
  const rate = body.kind === 'inicial' ? null : body.currency === 'ARS' ? 1 : money(body.rate, 'Cotización', 6);
  const impactARS = body.kind === 'inicial' ? 0 : Math.round(amount * rate * 100) / 100 * (body.kind === 'retiro' ? -1 : 1);
  if (!Number.isSafeInteger(Math.round(impactARS * 100))) fail('El equivalente en pesos es demasiado grande.');
  return { kind:body.kind, amount, currency:body.currency, date:body.date, destination:text(body.destination,'dónde guardás el ahorro',true), goal:text(body.goal,'el objetivo'), rate, impactARS };
}
async function readBook(sql, user, workspaceId) {
  await sql`INSERT INTO ahorro_libros(workspace_id, usuario_id) VALUES (${workspaceId}, ${user.usuarioId}) ON CONFLICT DO NOTHING`;
  const [book] = await sql`SELECT datos, revision FROM ahorro_libros WHERE workspace_id = ${workspaceId} AND usuario_id = ${user.usuarioId}`;
  return { records:typeof book.datos === 'string' ? JSON.parse(book.datos) : book.datos, revision:Number(book.revision) };
}
function publicRecords(records) { return records.filter(row=>row.active !== false).map(({requestHash, ...row})=>row); }

export default async function savingsHandler(req, res, sql, user, workspaceId) {
  if (!['GET','POST','PUT','DELETE'].includes(req.method)) return res.status(405).json({ok:false,error:'Método no permitido'});
  const body = req.body || {};
  if (req.method === 'POST' && !/^[a-zA-Z0-9_-]{10,100}$/.test(body.requestId || '')) fail('Falta identificar la solicitud. Volvé a abrir el formulario.');
  await ensureSavingsStore(sql);
  const book = await readBook(sql, user, workspaceId);
  if (req.method === 'GET') return res.status(200).json({ok:true,data:{records:publicRecords(book.records)}});
  const requestHash = digest(body);
  if (req.method === 'POST') {
    const prior = book.records.find(row=>row.id === `aho_${body.requestId}`);
    if (prior) {
      if (prior.requestHash !== requestHash || prior.active === false) fail('Esta solicitud ya fue usada. Actualizá Ahorros antes de continuar.',409);
      return res.status(200).json({ok:true,data:{record:publicRecords([prior])[0],records:publicRecords(book.records),converted:!!prior.convertedFrom,replayed:true}});
    }
  }
  let old = null;
  if (req.method !== 'POST') {
    old = book.records.find(row=>row.id === body.id && row.active !== false);
    if (!old) fail('El ahorro ya no está disponible.',404);
    if (!Number.isInteger(body.revision) || body.revision !== old.revision) fail('Este ahorro cambió en otro dispositivo. Actualizá y revisá los datos.',409);
  }
  let source = null;
  if (body.sourceId) {
    if (req.method !== 'POST') fail('La conversión se realiza al crear el registro.');
    [source] = await sql`SELECT m.*, md5(to_jsonb(m)::text) AS fingerprint FROM movimientos m
      WHERE m.movimiento_id = ${body.sourceId} AND m.usuario_id = ${user.usuarioId}
        AND m.workspace_id = ${workspaceId} AND m.tipo_movimiento = 'GASTO' AND m.activo = true`;
    if (!source) fail('El gasto ya no está disponible para convertir.',404);
    if (source.estado !== 'pagado' || source.requiere_revision) fail('Confirmá el pago y los datos del gasto antes de convertirlo en ahorro.');
    const detail = await sql`SELECT monto, moneda FROM detalle_movimiento WHERE movimiento_id = ${source.movimiento_id} AND activo = true`;
    const lines = detail.length ? detail : [source];
    const currencies = [...new Set(lines.map(line=>line.moneda))];
    if (currencies.length !== 1 || !['ARS','USD'].includes(currencies[0])) fail('Este gasto combina monedas. Separá sus importes antes de convertirlo.');
    const nativeAmount = Math.round(lines.reduce((sum,line)=>sum+Number(line.monto),0)*100)/100;
    const date = `${source.periodo}-${String(source.dia).padStart(2,'0')}`;
    if (Number(body.amount) !== nativeAmount || body.currency !== currencies[0] || body.date !== date || body.kind !== 'aporte') fail('El gasto cambió. Volvé a abrirlo para revisar la conversión.',409);
  }
  const entry = req.method === 'DELETE' ? {...old, active:false, revision:old.revision+1} : {
    ...validateEntry(body), id:old?.id || `aho_${body.requestId}`, active:true,
    revision:old ? old.revision+1 : 1, createdAt:old?.createdAt || new Date().toISOString(),
    requestHash:old?.requestHash || requestHash,
    convertedFrom:old?.convertedFrom || source?.movimiento_id || null,
    originalTitle:old?.originalTitle || (source ? text(body.sourceTitle || source.concepto_manual,'el concepto') : null)
  };
  const next = old ? book.records.map(row=>row.id===old.id ? entry : row) : [...book.records,entry];
  try { validateSavingsLedger(next); } catch (error) { fail(error.message,409); }
  let updated;
  if (source) {
    // The ledger change and expense reclassification either both succeed or
    // neither succeeds. A live source fingerprint protects concurrent edits.
    updated = await sql`WITH source AS MATERIALIZED (
        SELECT m.movimiento_id FROM movimientos m
        WHERE m.movimiento_id = ${source.movimiento_id} AND m.usuario_id = ${user.usuarioId}
          AND m.workspace_id = ${workspaceId} AND m.activo = true
          AND md5(to_jsonb(m)::text) = ${source.fingerprint} FOR UPDATE
      ), saved AS (
        UPDATE ahorro_libros SET datos = ${JSON.stringify(next)}::jsonb, revision = revision+1, updated_at = now()
        WHERE workspace_id = ${workspaceId} AND usuario_id = ${user.usuarioId} AND revision = ${book.revision}
          AND EXISTS (SELECT 1 FROM source) RETURNING revision
      ), converted AS (
        UPDATE movimientos SET activo = false, updated_at = now()
        WHERE movimiento_id IN (SELECT movimiento_id FROM source) AND EXISTS (SELECT 1 FROM saved)
        RETURNING movimiento_id
      ) SELECT * FROM converted`;
  } else {
    updated = await sql`UPDATE ahorro_libros SET datos = ${JSON.stringify(next)}::jsonb, revision = revision+1, updated_at = now()
      WHERE workspace_id = ${workspaceId} AND usuario_id = ${user.usuarioId} AND revision = ${book.revision}
      RETURNING revision`;
  }
  if (!updated.length) fail('Los datos cambiaron mientras guardabas. Actualizá y volvé a intentarlo.',409);
  return res.status(200).json({ok:true,data:{record:publicRecords([entry])[0] || null,records:publicRecords(next),converted:!!source}});
}
