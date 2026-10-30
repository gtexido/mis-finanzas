# Desarrollo local — Mis Finanzas

Para probar la app completa con APIs locales, usar Vercel Dev.

```cmd
cd c:\mis-finanzas\mis-finanzas
set MF_AUTH_SECRET=tu_clave_local
set MF_PIN_GUSTAVO=1234
set MF_PIN_VANE=5678
vercel dev
```

Abrir:

```txt
http://localhost:3000
```

`npm run dev` levanta solo el frontend Vite y no sirve para probar `/api/...`.

No guardar secretos reales en Git.
