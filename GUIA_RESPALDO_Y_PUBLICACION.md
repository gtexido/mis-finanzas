# Mis Finanzas: respaldo, pruebas y publicación

Preparado el 2 de octubre de 2026 para `mis-finanzas-tan.vercel.app`.

**Orden: guardar el código anterior → respaldar Neon → guardar la configuración → probar la corrección → publicar.** Los pasos en tus cuentas están pendientes: esta entrega no creó ramas en GitHub/Neon ni desplegó cambios.

La copia corregida parte del ZIP `mis-finanzas-385b0c478676774331bec5dbcf74d683bd67b7c5.zip`. En la revisión anterior, el JavaScript público coincidió byte por byte con esa versión. Eso identifica el frontend; falta comprobar en Vercel el commit del despliegue y su configuración de backend.

## 1. Guardar primero el proyecto anterior en GitHub

Desde Android, usá Chrome. Si un menú no aparece, activá **⋮ → Sitio para computadoras**.

1. Abrí el repositorio de GitHub que usa este proyecto. Guardá su enlace.
2. Antes de editar, descargá el estado actual con **Code → Download ZIP**. Guardalo como `mis-finanzas-antes-de-cambios-AAAA-MM-DD.zip`. Conservá también el ZIP original que compartiste.
3. Identificá la rama publicada y su commit: en Vercel, abrí el proyecto y el despliegue de **Production** que sirve tu dominio; mirá **Source**. Anotá repositorio, rama, commit y enlace del despliegue. Esto es solamente una consulta.
4. Volvé a GitHub y seleccioná esa rama. Comprobá que su último commit coincida con el publicado. El ZIP revisado corresponde a `385b0c478676774331bec5dbcf74d683bd67b7c5`. Si la rama ya avanzó o Vercel muestra otro commit, compartime el enlace o una captura de **Source**: hay que conservar ambos estados antes de aplicar este paquete.
5. Si la rama y el commit coinciden, abrí el selector de ramas, escribí `backup/antes-correcciones-AAAA-MM-DD` y elegí **Create branch … from …**. Revisá que el origen sea la rama que acabás de comprobar. No uses esta rama para editar.
6. Volvé a seleccionar la rama de backup y verificá que tenga el mismo commit. Descargá también su ZIP.
7. Para dejar un punto identificado por nombre, podés crear una release: **Releases → Draft a new release**, crear el tag `backup-AAAA-MM-DD`, elegir como **Target** la rama de backup y publicar con el título “Antes de corregir importes”. Revisá el destino antes de publicar.

Una rama/tag conserva una versión dentro de GitHub. El ZIP descargado es la copia fuera de GitHub; no contiene el historial Git completo, Neon ni las variables de Vercel. Si tenés cambios en tu computadora todavía sin subir, guardá también una copia de esa carpeta antes de reemplazar archivos.

Para conservar además todo el historial del repositorio, en una computadora con Git, desde una carpeta nueva:

```bash
git clone --mirror URL_DEL_REPOSITORIO mis-finanzas-respaldo.git
git -C mis-finanzas-respaldo.git bundle create ../mis-finanzas-historial.bundle --all
git -C mis-finanzas-respaldo.git bundle verify ../mis-finanzas-historial.bundle
```

Reemplazá `URL_DEL_REPOSITORIO` por el enlace real. El bundle no incluye configuración externa, archivos sin commit ni contenidos externos como objetos Git LFS.

Referencias: [ramas en GitHub](https://docs.github.com/en/pull-requests/how-tos/commit-changes/managing-branches-within-your-repository), [releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository).

## 2. Respaldar Neon y crear un lugar para probar

El dinero registrado está en Neon. Un ZIP del código o el botón de exportación de la app no reemplazan este respaldo.

1. En la configuración de Vercel, identificá qué conexión `DATABASE_URL` usa **Production**. Comparala en privado con el proyecto, endpoint, rama y base de Neon. No supongas que la rama correcta se llama `main`.
2. Entrá al proyecto correcto en [Neon Console](https://console.neon.tech).
3. En **Branches**, elegí **New branch / Create branch**. Poné `backup-antes-correcciones-AAAA-MM-DD`. Usá como padre la rama de producción identificada, desde su estado actual, con **datos y esquema**; no elijas una copia de solo esquema ni datos anonimizados.
4. Guardá la hora y el identificador de la rama. Verificá que no tenga borrado automático antes de la fecha hasta la que querés conservarla. Las opciones, cantidades de ramas y retención dependen de tu plan.
5. Dejá esa rama como respaldo, sin conectar la app a ella ni cargar pruebas.
6. Creá otra rama llamada `pruebas-correcciones`, a partir del respaldo. Esta segunda rama será la usada para probar la versión corregida.
7. En el SQL Editor, seleccionando cuidadosamente cada rama, comprobá que el respaldo contenga los registros esperados. Estas consultas son de lectura:

```sql
SELECT current_database() AS base, current_user AS rol;

SELECT 'movimientos' AS tabla, COUNT(*) AS filas FROM movimientos
UNION ALL
SELECT 'detalle_movimiento', COUNT(*) FROM detalle_movimiento
UNION ALL
SELECT 'movimiento_etiquetas', COUNT(*) FROM movimiento_etiquetas;

SELECT workspace_id, usuario_id, periodo, tipo_movimiento,
       subtipo_movimiento, moneda, COUNT(*) AS filas, SUM(monto) AS suma_guardada
FROM movimientos
GROUP BY workspace_id, usuario_id, periodo, tipo_movimiento,
         subtipo_movimiento, moneda
ORDER BY workspace_id, usuario_id, periodo, tipo_movimiento,
         subtipo_movimiento, moneda;
```

Compará producción y respaldo sin cargar nuevos movimientos entre las consultas. Si alguien sigue usando la app después de crear la rama, las diferencias posteriores pueden ser normales. `suma_guardada` sirve para comparar copias: no es un saldo financiero, porque el modelo guarda algunas cabeceras con desglose como totales convertidos.

La rama conserva un estado separado, pero sigue dentro del mismo proyecto Neon. Para tener una copia independiente, completá también el archivo de respaldo siguiente.

Referencia: [ramas de Neon](https://neon.com/docs/manage/branches).

### Copia independiente de Neon: archivo `.dump`

Este paso se hace más cómodamente desde una computadora con herramientas PostgreSQL instaladas. Usá `pg_dump` de la misma versión principal del servidor, o una compatible más nueva. No hay que cambiar tablas ni instalar nada dentro de Neon.

1. En Neon, elegí la rama de respaldo y la base de la app. En **Connect**, obtené el host **directo / no pooled**, nombre de base y usuario. Usá un rol con lectura de todas las tablas necesarias.
2. En una carpeta privada, ejecutá este comando reemplazando los tres campos en mayúsculas. No pegues la contraseña en el comando: `-W` la pide aparte.

```bash
pg_dump --dbname="host=HOST_DIRECTO dbname=NOMBRE_BASE user=USUARIO sslmode=require" -W --format=custom --file=mis-finanzas-antes-correcciones.dump
```

3. Confirmá que termine sin error y revisá el índice del archivo:

```bash
pg_restore --list mis-finanzas-antes-correcciones.dump
```

4. Guardá el `.dump` en una carpeta protegida y una segunda ubicación privada. Contiene información financiera. No lo subas a un repositorio público.
5. La verificación completa es restaurarlo en **otra base vacía de prueba**, preparada para ese propósito, nunca sobre producción ni sobre la rama de respaldo:

```bash
pg_restore --dbname="host=HOST_PRUEBA dbname=BASE_VACIA_PRUEBA user=USUARIO_PRUEBA sslmode=require" -W --no-owner --no-acl --exit-on-error --single-transaction mis-finanzas-antes-correcciones.dump
```

6. Compará allí los conteos anteriores. Si hay errores de extensiones, roles o permisos, conservá el mensaje y resolvelos antes de considerar comprobada la restauración. El dump cubre esa base; no guarda las cuentas del proveedor, los roles globales del servicio ni la configuración de Vercel.

Si estás solo con el celular, podés completar las ramas de Neon y dejar este paso de archivo independiente para una computadora antes del cambio final.

Referencias: [exportar Neon](https://neon.com/docs/guides/export-neon-postgres-compatible), [pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html), [pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html).

## 3. Guardar la configuración de Vercel

En el proyecto existente, anotá en privado:

- Repositorio conectado, rama de Production y Root Directory.
- Framework, comando de build, carpeta de salida y versión de Node.
- Dominio y enlace del despliegue anterior que está funcionando.
- Nombres y ámbitos de todas las variables de entorno. Guardá los valores conocidos en un gestor de contraseñas; no en GitHub, capturas compartidas ni este chat. Algunas variables secretas no permiten volver a ver su valor.

El código de esta app usa como mínimo:

| Variable | Production | Preview de pruebas |
| --- | --- | --- |
| `DATABASE_URL` | Conexión actual a Neon producción | Conexión a `pruebas-correcciones` |
| `MF_AUTH_SECRET` | Conservar el secreto actual | Usar un secreto distinto para pruebas |
| `MF_PIN_GUSTAVO` | Conservar el PIN actual | PIN de pruebas definido por vos |
| `MF_PIN_VANE` | Conservar el PIN actual | PIN de pruebas definido por vos |

Revisá también cualquier otra variable que ya tengas. No agregues prefijo `VITE_` a estas credenciales: las usa el backend.

En **Settings → Environment Variables**, asigná las credenciales de prueba solamente a **Preview**, preferiblemente a la rama Git `fix/importes-y-guardado`. Verificá que una integración automática de Neon no esté sobrescribiendo la conexión elegida. Los cambios de variables necesitan un despliegue nuevo para aplicarse.

Referencia: [variables y ámbitos de Vercel](https://vercel.com/docs/environment-variables).

## 4. Subir el proyecto corregido a una rama de pruebas

El ZIP entregado contiene el proyecto completo dentro de `mis-finanzas-corregido/`, una lista de cambios y las pruebas. No incluye `node_modules`, `dist`, credenciales ni un respaldo real de la base.

1. Después de respaldar, creá en GitHub `fix/importes-y-guardado` desde la versión base comprobada. Si ya hay cambios posteriores al ZIP revisado, hay que integrarlos antes de reemplazar archivos.
2. Configurá las variables de Preview como indica el paso anterior antes de usar el despliegue de esa rama.
3. Descomprimí `Mis-Finanzas-corregido.zip`.
4. Subí los archivos manteniendo sus rutas. `package.json`, `src/`, `api/` y `vercel.json` deben quedar en la raíz original del proyecto. No subas el ZIP como si fuera la aplicación, ni agregues otra carpeta contenedora dentro del repositorio.
5. Revisá los cambios y confirmalos exclusivamente en `fix/importes-y-guardado`, con un mensaje como “Corrige edición de importes y guardado de gastos”. Los archivos funcionales se enumeran en `CAMBIOS_Y_PRUEBAS.md`.
6. En Vercel → **Deployments**, abrí el despliegue de esa rama y comprobá que sea **Preview** y esté **Ready**. Si el repositorio todavía no está conectado, primero hay que revisar la configuración del proyecto existente; no crear otro proyecto de producción por accidente.

Para subir carpetas y revisar diferencias, una computadora con GitHub Desktop o Git suele ser más cómoda. Desde Android se pueden subir archivos en **Add file → Upload files**, entrando en cada carpeta de destino, pero el selector de archivos varía según el dispositivo. No borres el repositorio entero para facilitar la carga.

La configuración esperada por los archivos recibidos es **Vite**, build `npm run build`, salida `dist` y las funciones en `api/`. Conservá la versión de Node del despliegue anterior si ya funciona. `npm run dev` por sí solo no levanta las funciones de Vercel; su configuración original espera un backend local en el puerto 3001.

## 5. Comprobar la Preview con Neon de pruebas

Primero confirmá en Vercel el ámbito Preview y en Neon el endpoint de `pruebas-correcciones`. Esta rama puede contener una copia de información real; mantené privado su acceso. Ninguna de estas pruebas debe apuntar a producción.

| Prueba | Resultado esperado |
| --- | --- |
| Ingresar con cada usuario | Se ven sus movimientos y meses históricos esperados |
| Editar el monto de un gasto, borrarlo y escribir `25.50` | Queda vacío al borrar; guarda 25,50 sin agregar un cero al principio |
| Hacer lo mismo en un ítem del desglose | Campo vacío al borrar; no deja guardar un ítem vacío o negativo |
| Guardar, recargar y volver a ingresar | El cambio sigue guardado en Neon de pruebas |
| Crear detalle ARS y USD; ocultar opciones antes de guardar | Se conservan los ítems, moneda e importe original USD |
| Tocar guardar dos veces rápidamente | Se registra un solo gasto para esa acción |
| Editar y borrar un gasto de prueba con etiquetas y detalle | Se actualizan/eliminan sus partes de manera coherente |
| Replicar a un mes vacío | Copia una sola vez y conserva el concepto |
| Replicar cuando el mes destino ya tiene gastos | No agrega otra copia |
| Ver evolución y vencimientos de meses viejos | Se incluyen los movimientos históricos cargados |
| Ajustes → Backup y datos → Descargar movimientos | El JSON incluye todos los meses del usuario conectado |
| Cargar ingreso o sueldo válido | Se guarda y sigue ahí después de recargar |

En Vercel revisá **Logs** por errores de funciones y en Neon de pruebas comprobá los registros creados. Que el build esté Ready no demuestra por sí solo que el backend acceda correctamente a tu esquema real.

La entrega pasó 21 escenarios locales y el build. Se probó la interfaz con API simulada y los handlers con PostgreSQL embebido/PGlite y esquema ficticio. **Todavía no se verificaron el esquema, restricciones, permisos, volumen de datos ni credenciales de tu Neon real.** La Preview resuelve esa parte.

## 6. Publicar en el dominio habitual

1. Con las pruebas aprobadas, creá un respaldo actualizado de Neon si hubo movimientos nuevos desde el primer respaldo. Anotá la hora.
2. Abrí un Pull Request de `fix/importes-y-guardado` hacia la rama que Vercel tenga configurada como **Production**. Revisá que solo aparezcan los cambios previstos.
3. Confirmá que las variables de **Production** sigan apuntando a la base original y que los PIN/secreto de producción sean los correctos.
4. Fusioná el Pull Request. Con la integración Git configurada, Vercel creará un despliegue nuevo de Production.
5. Esperá **Ready**, comprobá rama/commit y abrí [Mis Finanzas](https://mis-finanzas-tan.vercel.app).
6. Verificá ingreso, saldos existentes y meses anteriores. No copies los registros ficticios de la rama de pruebas a producción.
7. En Android, cerrá y volvé a abrir la PWA y recargá desde Chrome si todavía aparece una interfaz anterior. Si sigue vieja, revisá el commit servido antes de borrar datos del navegador.
8. Conservá el despliegue anterior, rama/tag y respaldos hasta estar conforme. Este paquete no necesita migraciones de tablas ni restaurar Neon para instalarlo.

Seguimos la ruta de fusionar la rama y generar un despliegue Production nuevo para aplicar explícitamente su configuración. No cambies la base de producción por la de pruebas.

Referencia: [despliegues desde Git](https://vercel.com/docs/git).

## 7. Si aparece un problema después de publicar

- Si falla la aplicación, en Vercel → **Deployments** localizá el despliegue anterior anotado y revisá la opción **Instant Rollback**. Conservá ese despliegue: si se elimina, deja de ser un destino de recuperación.
- Volver al código anterior **no deshace movimientos ya escritos en Neon**. Si hay datos incorrectos, evitá seguir registrando movimientos, guardá también el estado actual y recuperá primero en una rama/base separada. Hay que preservar las operaciones válidas posteriores al respaldo.
- Compartí el mensaje de error, el commit y capturas sin credenciales para ubicar el problema. No restaures toda la base encima de producción sin revisar qué movimientos posteriores se perderían.

Referencias: [Instant Rollback](https://vercel.com/docs/instant-rollback), [conservar despliegues](https://vercel.com/docs/deployments/managing-deployments).

## Registro de lo completado

| Elemento | Dato para completar |
| --- | --- |
| Repositorio GitHub | |
| Rama y commit publicados antes del cambio | |
| Rama/tag de backup y ZIP anterior | |
| Proyecto, rama y base Neon de producción | |
| Rama Neon de respaldo y hora | |
| Archivo `.dump` y restauración comprobada | |
| Rama Neon usada para pruebas | |
| Configuración Vercel guardada en privado | |
| URL Preview y resultado de pruebas | |
| URL del despliegue anterior para rollback | |
| Commit y fecha de publicación | |

La guía nueva corresponde a Vercel + Neon. Los documentos antiguos incluidos en el proyecto describen etapas anteriores, algunas con Sheets o Netlify; no deben usarse como instrucciones actuales de respaldo o despliegue.
