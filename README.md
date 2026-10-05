# Shadow Fest 4.0

Web de Halloween y reggaetón en Lima, +18, con compra coordinada por WhatsApp, sorpresas por ventas y sistema de entradas con vendedores. Proyecto Firebase: `comecome-ab1a0`.

**Estado:** interfaz y backend preparados; vista local comprobada. Las funciones y reglas aún no están desplegadas. No operar compradores reales desde la demo local.

## Pantallas

- `index.html`: portada y compra, sin enlaces al panel del equipo. Contador desde 110 y metas propuestas en `surprises.js`.
- `admin.html`: acceso por código, ventas propias del vendedor o administración suprema de todas las entradas, compradores y accesos.
- `activar.html#CODIGO`: registro único del comprador con el código entregado por su vendedor.
- `qr.html#TOKEN`: entrada individual, sin exponer el teléfono del comprador.
- `validar.html`: acceso del personal por código y consumo único del QR.

La transferencia siempre se coordina por chat al **+51 955 121 011**. La web no procesa pagos. El vendedor confirma el pago antes de emitir. Un pack genera seis entradas individuales.

## Ejecutar y verificar

```powershell
python -m http.server 5173 --bind 127.0.0.1
npm test
npm run build
```

Abrir `http://localhost:5173`. La vista local guarda datos de prueba en este navegador y usa un secreto de prueba en `.shadowfest-local.json` (no versionado). Las pruebas incluyen lógica del servidor, permisos, revocación, reintentos, registros e ingresos concurrentes. El build excluye la demo y activa la API real.

## Firebase

Leer [FIREBASE.md](FIREBASE.md): reglas, colecciones, acceso por códigos y comandos de despliegue. El secreto supremo se guarda en Secret Manager. Los datos son privados en Firestore y las operaciones pasan por una función que aplica permisos. Publicar únicamente `dist` mediante Firebase Hosting; GitHub Pages por sí solo no ejecuta esta API.

El contador representa 110 ventas históricas + nuevas entradas emitidas y no anuladas. Los 110 compradores históricos no se inventan ni se migran automáticamente. Las metas de sorpresa 150/200/300 y sus contenidos siguen pendientes de confirmación.

Datos del evento y arte: [EVENTO.md](EVENTO.md), [ARTE.md](ARTE.md). General S/20 hasta el 11 de octubre inclusive (Lima), S/25 desde el 12 y S/30 en puerta. Precios pack/VIP pendientes. El mapa del local está retirado hasta contar con una referencia fiel.

QR con qrcodejs 1.0.0 distribuido en `vendor` (MIT). El escáner usa BarcodeDetector cuando está disponible; puede pegarse el código o enlace. Cámara y portapapeles requieren localhost o HTTPS. Las fuentes externas tienen respaldo local de sistema.
