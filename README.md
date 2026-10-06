# Shadow Fest 4.0

Web de Halloween y reggaetón en Lima, +18, compra por WhatsApp y administración de entradas por códigos.

Producción: https://comecome-ab1a0.web.app/ . Firebase `comecome-ab1a0`, Firestore y Authentication interno, sin Cloud Functions ni Blaze. La transferencia se comprueba por interno; la web no procesa pagos.

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

Datos y arte: [EVENTO.md](EVENTO.md), [ARTE.md](ARTE.md). General S/20 hasta el 11 de octubre inclusive (Lima), S/25 desde el 12 y S/30 en puerta. Precios pack/VIP pendientes. Metas 150/200/300 propuestas; las sorpresas del código público no son secretos. El mapa se retiró hasta contar con una referencia fiel.
