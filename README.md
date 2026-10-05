# ShadowFest

Web de un evento de terror gore y reggaetón, con catálogo de entradas, paquetes y preventa de bebidas, solicitudes al organizador y administración de accesos.

Estado: primera versión visual y funcional en **demostración local**. No hay venta activa ni datos reales del evento configurados.

Consulta [PLAN.md](PLAN.md) para el alcance y la dirección visual.

## Las cuatro páginas

- `index.html`: web pública, paquetes y solicitud de información preparada para WhatsApp.
- `admin.html`: emisión, búsqueda, filtros, anulación y exportación de entradas de prueba.
- `qr.html?c=UUID`: entrada individual y QR del asistente.
- `validar.html`: pantalla exclusiva de control de acceso, con consulta, escaneo compatible y confirmación de ingreso.

## Ejecutar

Desde esta carpeta: `python -m http.server 5173 --bind 127.0.0.1`. Abrir `http://localhost:5173`. No abrir como `file://`: los módulos requieren servidor HTTP. `npm test` ejecuta la verificación del flujo de entradas sin instalar dependencias.

Para probar: entrar a administración, emitir una entrada con pago de prueba confirmado, abrir su QR, copiar el enlace y consultarlo en validación. Confirmar ingreso y volver a consultar: debe rechazar un segundo ingreso. El escáner depende de BarcodeDetector y permisos de cámara; siempre está disponible el ingreso manual. Cámara, bloqueo y portapapeles necesitan localhost o HTTPS.

## Configuración y límites

Editar `config.js` para el evento, paquetes y número de WhatsApp en formato internacional solo con dígitos. No se ha inventado un número ni precios. La solicitud no se guarda ni se envía automáticamente: el visitante revisa el mensaje y lo envía por chat.

Los datos de prueba se guardan en localStorage y solo se comparten en el mismo origen y navegador. El bloqueo entre pestañas evita consumir dos veces una entrada local; no reemplaza una transacción de servidor. No hay autenticación implementada ni panel privado de producción. No usar esta demostración para compradores reales.

Antes de operar: implementar un backend independiente con autenticación, roles de admin/validador, datos compartidos, verificación manual de pagos, emisión controlada, QR de token aleatorio, consulta pública limitada y transacciones atómicas para ingresos y retiro de bebidas. Nunca reutilizar las claves o la base de ZUMBA. Los paquetes y la preventa de bebidas actuales son propuestas, no productos disponibles.

QR generado con qrcodejs 1.0.0, distribuido localmente bajo licencia MIT en `vendor/`. Las fuentes externas son opcionales; hay fuentes de respaldo.
