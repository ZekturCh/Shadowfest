# Shadow Fest 4.0

Web de Halloween y reggaetón en Lima, +18, compra por WhatsApp y administración de entradas por códigos.

Enlace principal: https://shadowfest.web.app/ . También disponible en https://zekturch.github.io/Shadowfest/ y https://comecome-ab1a0.web.app/ . Firebase `comecome-ab1a0`, Firestore y Authentication interno, sin Cloud Functions ni Blaze. La transferencia se comprueba por interno; la web no procesa pagos.

## Pantallas

- `index.html`: compra por WhatsApp al +51 955 121 011, precios de General/VIP/pack, experiencia, carta prevista y contador de entradas aprobadas.
- `admin.html`: admin supremo o vendedor, según su código. Vendedores ven solo sus entradas; admin crea accesos, revisa pagos y aprueba o invalida.
- `qr.html#TOKEN`: QR individual, nombre opcional, solicitud de comida/bebidas por WhatsApp y pedidos del comprador.
- `canje.html#TOKEN`: pedido y QR de canje, disponible al aprobar el pago.
- `canjear.html`: admin o personal con permiso de validación, consulta y entrega completa de un pedido pagado una sola vez.
- `validar.html`: personal de puerta o admin, consulta e ingreso único de entradas aprobadas.
- `activar.html`: pantalla anterior de registro; no se usa en el flujo actual.

Cada QR queda asignado a quien lo genera, incluido el admin. El vendedor marca el enlace como enviado y solicita aprobación cuando el cliente confirma el pago. Solo la aprobación del admin suma una venta y habilita el QR para entrar. Un pack genera seis entradas individuales.

Las precompras se acuerdan por WhatsApp. La carta prevista muestra las propuestas del presupuesto; productos, precios y disponibilidad se confirman antes de cobrar. El supremo registra productos, cantidades, monto y la entrada asociada; luego aprueba el pago. Los pedidos se actualizan en vivo en la página del comprador. El QR de canje usa `SF-CANJE:XXXXXX` y el código manual `C-XXXXXX`; se rechaza en el control de ingreso. Entradas y consumos tienen estados independientes: un canje no registra el ingreso, ni suma entradas vendidas. Un pedido se entrega completo y una sola vez. Para corregir productos o monto, anular el pedido y registrar uno nuevo.

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

Datos y arte: [EVENTO.md](EVENTO.md), [ARTE.md](ARTE.md). General S/20 hasta el 20 de octubre inclusive (Lima), S/25 desde el 21 y S/30 en puerta. VIP S/40/S/50/S/60 según etapa. Pack de seis S/145/S/150/S/180 con sixpack incluido. Metas 150/200/300 propuestas; las sorpresas del código público no son secretos. El mapa se retiró hasta contar con una referencia fiel.

## Operación en puerta y lotes

Se pueden generar 1, 5 o 10 entradas individuales. El pack mantiene sus seis entradas y beneficio independiente. La emisión por lotes guarda partes pequeñas con una solicitud estable para reintentar sin duplicar lo ya guardado; una interrupción puede dejar parte del lote pendiente, y se completa con el mismo intento. Los botones bloquean acciones repetidas mientras se guardan.

Cada entrada tiene un código de puerta de seis caracteres aleatorios, mezclando letras y números y evitando I/O/0/1. El índice de códigos solo permite consulta a personal autorizado; el cliente conserva un enlace privado de 256 bits para abrir su QR. El QR nuevo codifica esos seis caracteres. Se aceptan enlaces antiguos y enlaces de ambos hosts. Las entradas existentes recibieron un código corto sin cambiar su vendedor, estado o contador.

El lector usa qr-scanner (MIT), con decodificador alternativo cuando no hay BarcodeDetector y opción de foto. Requiere HTTPS y permiso de cámara; el comportamiento de una cámara física de iPhone debe comprobarse en ese dispositivo.

Los nuevos códigos sugeridos para vendedores usan la inicial sin tilde, `26` y tres letras aleatorias (seis caracteres). Los códigos de este formato aceptan mayúsculas o minúsculas al ingresar. Las credenciales largas anteriores conservan su distinción de mayúsculas; el admin y los validadores mantienen su formato. El código de vendedor es un acceso privado, distinto del código del QR para puerta. Al cambiar una credencial se conserva el UID y sus ventas; las claves reales se entregan por privado y nunca se versionan.

## Página de venta

El precio de cada pase y el total de la cantidad elegida se incluyen en el mensaje de WhatsApp. El pack tiene precio propio e incluye seis entradas generales y un sixpack de Pilsen. La tarifa en puerta se muestra separada del precio online. La carta prevista propone Pilsen S/9, sixpack S/50, cócteles S/18 y salchipapa S/13; la organización debe confirmar disponibilidad y precio antes de cada precompra. El contador público usa solo QR aprobados (incluye usados, excluye anulados); no añade una base histórica.
