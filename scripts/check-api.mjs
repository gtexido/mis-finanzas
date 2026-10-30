// ======================================================================
// MIS FINANZAS - CONTROL DE SINTAXIS DE LA CARPETA api/
// ======================================================================
// Descripción : Lee cada archivo de api/ y verifica que se pueda interpretar.
//               Vite compila src/ pero no api/, así que un error de sintaxis
//               en el servidor solo se vería al desplegar o al usar la app.
// Fuente      : api/*.js
// Lógica      : Usa esbuild (viene incluido con Vite) solo para analizar el
//               código. No ejecuta nada ni se conecta a ningún servicio.
// Uso         : npm run check:api
// Propósito   : Frenar un cambio con error de sintaxis antes de que llegue
//               a producción.
// ======================================================================
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { transform } from 'esbuild';

const carpeta = 'api';
const archivos = (await readdir(carpeta)).filter(nombre => nombre.endsWith('.js')).sort();
let fallos = 0;

for (const nombre of archivos) {
  try {
    await transform(await readFile(join(carpeta, nombre), 'utf8'), { loader: 'js', format: 'esm' });
    console.log(`ok     ${carpeta}/${nombre}`);
  } catch (error) {
    fallos += 1;
    console.error(`ERROR  ${carpeta}/${nombre}\n${error.message}`);
  }
}

if (archivos.length === 0) {
  console.error('No se encontraron archivos en api/.');
  process.exit(1);
}
if (fallos > 0) {
  console.error(`\n${fallos} archivo(s) con errores de sintaxis.`);
  process.exit(1);
}
console.log(`\n${archivos.length} archivos de api/ revisados sin errores.`);
