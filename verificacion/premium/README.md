# Propuesta de diseño para Mis Finanzas

La carga y la edición tenían demasiadas decisiones simultáneas, y ocho accesos en el menú competían por un espacio reducido en el celular. Esta propuesta simplifica ambos recorridos y organiza el diseño alrededor de importes, conceptos y pagos.

## Cambios

- Cinco accesos: Inicio, Movimientos, Cargar, Vencimientos e Informes. Ajustes desde el encabezado; ingresos desde Movimientos y Cargar; Evolución dentro de Informes.
- Inicio con balance, ingresos/gastos, próximos pagos y movimientos recientes. Sin calificaciones automáticas de salud financiera.
- Carga y edición usan el mismo componente: concepto, importe, moneda, cuenta, forma de pago, estado y día. Notas y recurrencia en Más opciones.
- Categoría y Tipo/etiquetas salen de los formularios y de los informes. Se conservan internamente los atributos históricos. No se cambia el esquema de datos ni las API.
- Informes por concepto, medio de pago y forma de pago. Evolución con totales mensuales, aviso de mes en curso y contadores sin el límite incorrecto del ranking.
- Vencimientos distingue vencidos, próximos y pendientes sin fecha. «Próximo pago» toma una fecha no vencida; la acción dice «Marcar como pagado».
- Sistema visual oscuro con acento violeta, importes legibles, íconos SVG, controles táctiles y estados de foco. La edición incluye navegación por teclado.
- Se conservan desgloses ARS/USD, exportación, duplicados, copias mensuales y estados de sesión/error.

## Verificación

- `npm run build`: correcto.
- 14 escenarios de navegador aprobados; resultados en [resultados-navegador.json](resultados-navegador.json).
- Incluye decimales y campos vacíos, doble toque, desglose ARS/USD, exportación de todos los meses, sesión vencida, error de carga, copia mensual, alta sin categoría/tipo y preservación de datos históricos al editar.
- Ocho vistas verificadas sin desborde horizontal a 320, 390 y 1024 píxeles.
- Comparación mensual probada con ocho conceptos en aumento; el próximo vencimiento se calcula después de descartar los vencidos.
- Pruebas con API simulada y datos ficticios. No se escribieron datos reales. Los archivos de API y los cálculos monetarios no se modificaron.

La prueba reproducible es `verificacion/pruebas/navegador.cjs`. Requiere Playwright/Chromium y `AUDIT_PROJECT` apuntando al proyecto. Se pueden usar `AUDIT_BROWSER_EXECUTABLE` y `AUDIT_CHROMIUM_MODULE` para un navegador instalado, según el entorno. El servidor local de prueba usa el puerto 4173 y bloquea conexiones externas.

La rama es una propuesta para revisión; el diseño no se publicó en producción.
