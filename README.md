# Shadow Fest 4.0

Web de Halloween y reggaetón en Lima, +18, compra por WhatsApp y administración de entradas por códigos.

Enlace principal: https://zekturch.github.io/Shadowfest/ . También disponible en https://comecome-ab1a0.web.app/ . Firebase `comecome-ab1a0`, Firestore y Authentication interno, sin Cloud Functions ni Blaze. La transferencia se comprueba por interno; la web no procesa pagos.

## Pantallas

- `index.html`: compra por WhatsApp al +51 955 121 011, experiencia y sorpresas desde 110 ventas.
- `admin.html`: admin supremo o vendedor, según su código. Vendedores ven solo sus entradas; admin crea accesos, revisa pagos y aprueba o invalida.
- `qr.html#TOKEN`: QR individual y nombre opcional del comprador.
- `validar.html`: personal de puerta o admin, consulta e ingreso único de entradas aprobadas.
- `activar.html`: pantalla anterior de registro; no se usa en el flujo actual.

Cada QR queda asignado a quien lo genera, incluido el admin. El vendedor marca el enlace como enviado y solicita aprobación cuando el cliente confirma el pago. Solo la aprobación del admin suma una venta y habilita el QR para entrar. Un pack genera seis entradas individuales.

El admin muestra si el cliente registró su nombre, si se ingresó al generar o si todavía no tiene nombre. Los códigos nuevos se entregan por privado. El equipo inicial es Angélica, Jesús, Diego, Lucía, Sebastián y César; el botón de preparación evita duplicar nombres existentes.

## Desarrollo

```powershell
npm ci
python -m http.server 5173 --bind 127.0.0.1
npm test
npm run build
```

`localhost:5173` usa una demo aislada de este navegador. Su código de prueba está en `.shadowfest-local.json`, ignorado por Git. Producción usa Firebase y no contiene esa demo. Para revisar el build real se puede servir `dist` con otro puerto; cualquier cambio allí utiliza la base real.

Ver [FIREBASE.md](FIREBASE.md) para reglas, arquitectura, pruebas de permisos y despliegue. No publicar archivos privados de accesos ni secretos. QR de 256 bits con enlaces privados; el contador público no expone entradas.

Datos y arte: [EVENTO.md](EVENTO.md), [ARTE.md](ARTE.md). General S/20 hasta el 13 de octubre inclusive (Lima), S/25 desde el 14 y S/30 en puerta. Precios pack/VIP pendientes. Metas 150/200/300 propuestas; las sorpresas del código público no son secretos. El mapa se retiró hasta contar con una referencia fiel.

## Operación en puerta y lotes

Se pueden generar 1, 5 o 10 entradas individuales. El pack mantiene sus seis entradas y beneficio independiente. La emisión por lotes guarda partes pequeñas con una solicitud estable para reintentar sin duplicar lo ya guardado; una interrupción puede dejar parte del lote pendiente, y se completa con el mismo intento. Los botones bloquean acciones repetidas mientras se guardan.

Cada entrada tiene un código de puerta de seis caracteres aleatorios, mezclando letras y números y evitando I/O/0/1. El índice de códigos solo permite consulta a personal autorizado; el cliente conserva un enlace privado de 256 bits para abrir su QR. El QR nuevo codifica esos seis caracteres. Se aceptan enlaces antiguos y enlaces de ambos hosts. Las entradas existentes recibieron un código corto sin cambiar su vendedor, estado o contador.

El lector usa qr-scanner (MIT), con decodificador alternativo cuando no hay BarcodeDetector y opción de foto. Requiere HTTPS y permiso de cámara; el comportamiento de una cámara física de iPhone debe comprobarse en ese dispositivo.
