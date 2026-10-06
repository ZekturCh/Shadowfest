# Firebase de Shadow Fest

Proyecto `comecome-ab1a0`, Cloud Firestore (default), Firebase Authentication normal y Firebase Hosting. No se usan Cloud Functions, Realtime Database, Analytics, pagos automáticos ni Secret Manager. No se habilitó Blaze.

## Acceso por códigos

La pantalla sigue pidiendo únicamente un código. Internamente Firebase Authentication comprueba una identidad de correo/contraseña: el correo técnico es SHA-256 del código + `@shadowfest.invalid`. El código no se almacena en Firestore, GitHub ni en el bundle. La sesión usa almacenamiento de sesión del navegador; el permiso real está en Firestore y se consulta en cada operación. Revocar un vendedor bloquea sus operaciones aunque conserve una sesión de Auth.

El primer administrador se aprovisiona con credenciales del propietario fuera del código público. La web no puede crear otro supremo ni cambiar ese rol. Los vendedores nuevos se crean desde el panel mediante una instancia secundaria de Auth para conservar la sesión del admin. Si falla la creación del permiso, se intenta retirar la identidad nueva; una identidad sin permiso no puede operar.

## Datos y reglas

La implementación vigente usa `shadowfest_live/2026`. El espacio antiguo `shadowfest_events` permanece bloqueado. `DATAREST` no se usa ni se modifica.

| Colección | Acceso |
| --- | --- |
| `staff` | Admin lista y crea vendedores/validadores; cada persona puede leer su permiso |
| `tickets` | Admin ve todos; vendedor consulta solo los suyos; puerta consulta un QR individual |
| `passes` | Consulta individual mediante token aleatorio de 256 bits; nunca permite listar |
| `requests` | Reintentos de emisión por vendedor, sin duplicar QR |
| `meta/sales` | Contador privado y referencia a la última entrada contabilizada |
| `publicStats/sales` | Solo contador público, sin enlaces de QR ni compradores |

`firestore-live.rules` es el archivo que despliega `firebase.json`. Las reglas verifican permisos, vendedor asignado, cambios permitidos, fechas del servidor y consistencia de las escrituras. Aprobar/invalidate y contador se actualizan juntos; cada ingreso usa una transacción. El acceso público a un QR permite añadir un nombre solo una vez, con consentimiento, sin aprobarlo. El enlace es privado: quien lo tenga puede consultar esa entrada.

El bloqueo de las demás colecciones se conserva del despliegue anterior. Para incorporar otra app a este proyecto se deben integrar y probar sus reglas explícitamente.

## Flujo

1. El vendedor o admin genera QR pendientes, asignados a quien los generó. Un pack crea seis entradas individuales.
2. Entrega el enlace `qr.html#TOKEN` y marca Enviado. El nombre es opcional.
3. Cuando el cliente confirma que pagó, solicita aprobación. Esto no confirma la transferencia.
4. El admin comprueba el pago por interno y aprueba o invalida.
5. En puerta solo se admite un QR aprobado, una vez. Un QR pendiente, invalidado o utilizado se rechaza.

El contador comienza en 110 ventas históricas. Generar, enviar, solicitar aprobación y poner nombre no suman. Aprobar suma uno; invalidar una entrada aprobada resta uno; entrar no resta. Los 110 compradores históricos no tienen registros inventados. Las metas de sorpresa 150/200/300 siguen siendo propuestas.

## Publicar

```powershell
npm ci
npm test
npm run build
npx firebase-tools deploy --only firestore:rules,hosting --project comecome-ab1a0
```

La publicación requiere una sesión autorizada de la CLI. `dist` excluye la demo y secretos locales. El SDK se compila desde `src/firebase-platform.js` a `platform-firebase.js`; el archivo compilado se versiona para que GitHub Pages también pueda operar contra el mismo Firebase.

## Verificar

`npm test` ejecuta las pruebas anteriores de lógica y experiencia pública. Las reglas vigentes se verifican contra el emulador real:

```powershell
npx firebase-tools emulators:start --only firestore --project demo-shadowfest
node --test tests/firestore.rules.mjs
```

El emulador requiere Java 21. Las pruebas incluyen aislamiento de vendedores, pack de seis, rechazo de roles falsos, aprobación/contador atómicos, nombre único, revocación e ingreso concurrente único. Los datos del emulador y de la demo localhost no se migran a producción.
