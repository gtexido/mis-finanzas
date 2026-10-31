# 📱 Mis Finanzas — Guía de instalación

## Lo que vas a lograr
- La app instalada en tu celu como si fuera del Play Store
- Datos sincronizados automáticamente con Google Sheets
- Acceso desde cualquier dispositivo sin perder nada

---

## PASO 1 — Crear tu Google Sheet

1. Abrí **Google Sheets** (sheets.google.com)
2. Creá una hoja nueva → ponele nombre: `Mis Finanzas`
3. Copiá el **ID** de la URL:
   - La URL se ve así: `https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit`
   - Copiá solo la parte entre `/d/` y `/edit`
4. Guardá ese ID, lo vas a necesitar en el Paso 2

---

## PASO 2 — Configurar Google Apps Script

1. Abrí **script.google.com** en el navegador
2. Hacé clic en **"Nuevo proyecto"**
3. Borrá todo el código que aparece por defecto
4. Pegá el contenido del archivo `google-apps-script.js` que está en esta carpeta
5. En la línea que dice `const SHEET_ID = 'TU_SHEET_ID_AQUI'`:
   - Reemplazá `TU_SHEET_ID_AQUI` con el ID que copiaste en el Paso 1
6. Hacé clic en **💾 Guardar** (Ctrl+S)
7. Hacé clic en **Implementar → Nueva implementación**
8. En "Tipo de implementación" elegí: **Aplicación web**
9. Configuración:
   - Descripción: `Mis Finanzas API`
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
10. Hacé clic en **Implementar**
11. Google te va a pedir que autorices el acceso → aceptá todo
12. **Copiá la URL** que aparece (empieza con `https://script.google.com/macros/s/...`)
13. Guardá esa URL, la necesitás en el Paso 3

---

## PASO 3 — Agregar la URL del Script a la app

1. Abrí el archivo `src/App.jsx`
2. Buscá la línea (está cerca del principio):
   ```
   const SHEETS_URL = 'TU_URL_AQUI';
   ```
3. Reemplazá `TU_URL_AQUI` con la URL que copiaste en el Paso 2
4. Guardá el archivo

---

## PASO 4 — Crear cuenta en Netlify y subir la app

1. Entrá a **netlify.com**
2. Hacé clic en **"Sign up"** → elegí **"Sign up with Google"**
3. Autorizá con tu cuenta de Google
4. Una vez dentro, hacé clic en **"Add new site"**
5. Elegí **"Deploy manually"**
6. **Arrastrá la carpeta `dist`** (la vas a crear en el Paso 5) al área que dice "Drag and drop"
7. ¡Listo! Netlify te da una URL como `https://nombre-random.netlify.app`
8. Podés cambiar ese nombre en Site settings → Change site name → poné `mis-finanzas-gustavo` por ejemplo

---

## PASO 5 — Compilar la app (solo una vez)

Necesitás tener **Node.js** instalado en tu PC o Mac.

1. Descargalo de **nodejs.org** → versión LTS
2. Abrí una terminal (cmd en Windows, Terminal en Mac)
3. Navegá hasta la carpeta del proyecto:
   ```
   cd ruta/a/mis-finanzas
   ```
4. Instalá las dependencias:
   ```
   npm install
   ```
5. Compilá:
   ```
   npm run build
   ```
6. Se crea la carpeta **`dist`** → esa es la que subís a Netlify

---

## PASO 6 — Instalar la app en tu celu

1. Abrí **Chrome** en tu Android
2. Entrá a tu URL de Netlify (ej: `mis-finanzas-gustavo.netlify.app`)
3. Tocá los **tres puntitos** arriba a la derecha
4. Tocá **"Agregar a pantalla de inicio"** (o "Instalar app")
5. Confirmá → ¡aparece el ícono en tu home!

---

## Para actualizar la app en el futuro

Cuando yo te mande una versión nueva del código:
1. Reemplazá el archivo `src/App.jsx` con el nuevo
2. Ejecutá `npm run build` de nuevo
3. Arrastrá la nueva carpeta `dist` a Netlify
4. Se actualiza automáticamente en tu celu

---

## ¿Algo no funciona?

Escribile a Claude con el error que aparece y lo resolvemos juntos.
