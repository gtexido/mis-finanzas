# Estado actual de Mis Finanzas

Actualizado el 30 de octubre de 2026.

## Entornos

- Producción: proyecto de Vercel `mis-finanzas`, dominio `mis-finanzas-tan.vercel.app`, base de Neon rama `production`.
- Pruebas: versiones por pull request, con la copia `pruebas-vista-previa`. Se actualiza desde producción con un reinicio de la rama.
- `mis-finanzas-cbvk` es una copia duplicada de Vercel. Está pausada porque ninguno de los dos usuarios la usa.
- Neon conserva `restore-antes-migracion-20261029`, una copia de la base previa a la migración V1, para volver atrás si hiciera falta.

## Qué se hizo

- Base ordenada con integridad y reglas (`sql/SQL_MIGRACION_BASE_V1.sql`), aplicada en producción con respaldo previo.
- Controles automáticos en GitHub y `main` protegida.
- Login con bloqueo temporal tras 5 intentos fallidos (15 minutos), sin escribir en la base por usuarios inexistentes.
- Errores del servidor unificados en `api/_http.js`: 400 para datos inválidos, 409 para conflictos y 500 genérico, sin textos técnicos de la base.
- Dependabot activo para avisos de seguridad y actualizaciones.
- Limpieza de código sin uso y de documentos viejos.
- Primera pieza separada de `App.jsx`: `src/utils/replicas.js`.

## Reglas de trabajo

- Cambios chicos, en rama aparte, con controles en verde y prueba en la versión de prueba antes de mezclar.
- Los cambios en Cargar, `guardarGasto`, validaciones o cálculo de montos se hacen con el mismo cuidado y siempre quedan cubiertos por pruebas.
- Cualquier cambio en GitHub, Vercel o Neon se verifica después de aplicarlo.
- Las actualizaciones grandes de librerías (vite 8, react-dom 19, plugin-react 6, vite-plugin-pwa 2) se hacen juntas, en una rama propia.

## Próximos pasos

1. Seguir dividiendo `App.jsx` de a una pieza, sin cambiar cómo se ve.
2. Rediseñar Cargar (en dos pasos) y Ajustes, detrás de un interruptor para poder volver a la pantalla anterior.
3. Reemplazar las pruebas de pantallas pendientes (UI-10 y UI-12) por pruebas de humo y hacer obligatorio ese control.
4. Cuotas y cierre de tarjeta (requiere una tabla nueva).
5. Preparar la app para ofrecerla a más personas: usuarios y PIN en la base, sesiones más cortas, encabezados de seguridad, repositorio privado y planes pagos de Vercel y GitHub.
