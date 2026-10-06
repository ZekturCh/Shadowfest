# Shadow Fest 4.0

Web de Halloween y reggaetón en Lima, +18, con compra coordinada por WhatsApp, sorpresas por ventas y sistema de entradas con vendedores. Proyecto Firebase: `comecome-ab1a0`.

**Estado:** panel y flujo comprobados en vista local. Las reglas de bloqueo ya fueron publicadas por el propietario. La conexión operativa sigue pendiente: se acordó migrar a Firestore y autenticación interna con interfaz por códigos, sin Cloud Functions ni plan Blaze. El backend antiguo permanece como referencia; no operar compradores reales desde la demo.

## Pantallas

- `index.html`: portada y compra, sin enlaces al panel del equipo. Contador desde 110 y metas propuestas en `surprises.js`.
- `admin.html`: acceso por código, ventas propias del vendedor o administración suprema de todas las entradas, compradores y accesos.
- `activar.html#CODIGO`: registro único del comprador con el código entregado por su vendedor.
- `qr.html#TOKEN`: entrada individual, sin exponer el teléfono del comprador.
- `validar.html`: acceso del personal por código y consumo único del QR.

La transferencia siempre se coordina por chat al **+51 955 121 011**. La web no procesa pagos. El vendedor genera un QR pendiente; el único administrador aprueba o invalida la venta después de verificarla por interno. El nombre del comprador es opcional. Un pack genera seis entradas individuales.

## Ejecutar y verificar

```powershell
python -m http.server 5173 --bind 127.0.0.1
npm test
npm run build
```

Abrir `http://localhost:5173`. La vista local guarda datos de prueba en este navegador y usa un secreto de prueba en `.shadowfest-local.json` (no versionado). Las pruebas incluyen lógica del servidor, permisos, revocación, reintentos, registros e ingresos concurrentes. El build excluye la demo y activa la API real.

## Firebase

Leer [FIREBASE.md](FIREBASE.md): reglas, colecciones, acceso por códigos y comandos de despliegue. La implementación antigua usa una función y Secret Manager. Su sustitución gratuita todavía está pendiente; GitHub Pages por sí solo no ejecuta esa API.

El contador representa 110 ventas históricas + nuevas entradas aprobadas (incluidas las utilizadas). Los 110 compradores históricos no se inventan ni se migran automáticamente. Las metas de sorpresa 150/200/300 y sus contenidos siguen pendientes de confirmación.

Datos del evento y arte: [EVENTO.md](EVENTO.md), [ARTE.md](ARTE.md). General S/20 hasta el 11 de octubre inclusive (Lima), S/25 desde el 12 y S/30 en puerta. Precios pack/VIP pendientes. El mapa del local está retirado hasta contar con una referencia fiel.

QR con qrcodejs 1.0.0 distribuido en `vendor` (MIT). El escáner usa BarcodeDetector cuando está disponible; puede pegarse el código o enlace. Cámara y portapapeles requieren localhost o HTTPS. Las fuentes externas tienen respaldo local de sistema.

## Equipo

El administrador puede crear individualmente vendedores y personal de puerta, generar códigos aleatorios y revocar accesos. Un botón prepara Angélica, Jesús, Diego, Lucía, Sebastián y César sin duplicar nombres existentes. Los códigos nuevos se muestran hasta recargar; deben entregarse por privado. El panel resume QR generados, pendientes, ventas aprobadas e invalidados por vendedor.

## Envío y revisión manual

Generar deja el QR pendiente y asignado al actor, también si lo genera el admin. El vendedor marca el enlace como enviado y solicita aprobación al recibir la confirmación del cliente. Estas acciones no verifican pagos ni aumentan ventas. El admin revisa las solicitudes, comprueba el ingreso en Yape por interno y aprueba o invalida. La página del QR permite agregar un nombre opcional una sola vez con consentimiento; el panel distingue el nombre registrado por el comprador del ingresado al generar. Este flujo sigue en prueba local hasta completar la conexión gratuita con Firebase.
