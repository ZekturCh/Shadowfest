# Firebase de Shadow Fest

Proyecto `comecome-ab1a0`, Cloud Firestore (default), Firebase Authentication normal y Firebase Hosting. No se usan Cloud Functions, Realtime Database, Analytics, pagos automáticos ni Secret Manager. No se habilitó Blaze.

La dirección principal es `https://shadowfest.web.app/`. El sitio Hosting `shadowfest` comparte Firestore y Authentication con el sitio anterior. El ID técnico del proyecto sigue siendo `comecome-ab1a0`; no se migraron ni duplicaron entradas o accesos. Los dominios de ambos sitios y GitHub Pages se conservan autorizados. `firebase.json` despliega los targets `shadowfest` y `legacy` con el mismo build para mantener los enlaces anteriores.

## Acceso por códigos

La pantalla sigue pidiendo únicamente un código. Internamente Firebase Authentication comprueba una identidad de correo/contraseña: el correo técnico es SHA-256 del código + `@shadowfest.invalid`. El código no se almacena en Firestore, GitHub ni en el bundle. La sesión usa almacenamiento de sesión del navegador; el permiso real está en Firestore y se consulta en cada operación. Revocar un vendedor bloquea sus operaciones aunque conserve una sesión de Auth.

El primer administrador se aprovisiona con credenciales del propietario fuera del código público. La web no puede crear otro supremo ni cambiar ese rol. Los vendedores nuevos se crean desde el panel mediante una instancia secundaria de Auth para conservar la sesión del admin. Si falla la creación del permiso, se intenta retirar la identidad nueva; una identidad sin permiso no puede operar.

## Datos y reglas

Las precompras usan `consumptions` (solo el supremo lista y crea; supremo y validadores leen un pedido para canjear), `consumptionCodes` (códigos consultables por personal autorizado), `consumptionPasses/{TOKEN}` (vista del comprador mediante token aleatorio de 256 bits) y `passes/{ticketToken}/consumptions` (pedidos visibles desde el enlace privado de la entrada). No se permite listar todos los pedidos de compradores sin ser supremo. Las vistas públicas omiten UID de staff, comprador y token de entrada.

Registro, aprobación, anulación y canje mantienen las tres representaciones consistentes mediante escrituras atómicas comprobadas por reglas. Solo se crea o aprueba un pedido asociado a una entrada aprobada o ya admitida. El importe en céntimos y el detalle quedan fijos. Los compradores y vendedores no pueden confirmar pagos ni canjes. La entrega exige estado pagado y pasa a `redeemed`; dos entregas simultáneas solo pueden registrar una. Los pedidos no modifican `meta/sales`, `publicStats/sales` ni el estado de entrada. Anular una entrada no anula automáticamente consumos pagados: el admin los revisa por separado.

Las pantallas de pedidos usan listeners de Firestore para recibir cambios, en lugar de consultar toda la lista cada pocos segundos. Los mismos códigos de personal con permiso de validación abren `validar.html` y `canjear.html`; un vendedor mantiene exclusivamente sus permisos de venta de entradas.

La implementación vigente usa `shadowfest_live/2026`. El espacio antiguo `shadowfest_events` permanece bloqueado. `DATAREST` no se usa ni se modifica.

| Colección | Acceso |
| --- | --- |
| `staff` | Admin lista y crea vendedores/validadores; cada persona puede leer su permiso |
| `tickets` | Admin ve todos; vendedor consulta solo los suyos; puerta consulta un QR individual |
| `passes` | Consulta individual mediante token aleatorio de 256 bits; nunca permite listar |
| `codes` | Código de puerta de seis caracteres; consulta solo por personal o vendedor propietario, sin listado público |
| `requests` | Reintentos de emisión por vendedor, sin duplicar QR |
| `meta/sales` | Contador privado y referencia a la última entrada contabilizada |
| `meta/invitations` | Cupos de cortesía; solo admin, cambios ligados a emitir o anular QR en la misma transacción |
| `publicStats/sales` | Solo contador público, sin enlaces de QR ni compradores |

`firestore-live.rules` es el archivo que despliega `firebase.json`. Las reglas verifican permisos, vendedor asignado, cambios permitidos, fechas del servidor y consistencia de las escrituras. Aprobar/invalidate y contador se actualizan juntos; cada ingreso usa una transacción. El acceso público a un QR permite añadir un nombre solo una vez, con consentimiento, sin aprobarlo. El enlace es privado: quien lo tenga puede consultar esa entrada.

El bloqueo de las demás colecciones se conserva del despliegue anterior. Para incorporar otra app a este proyecto se deben integrar y probar sus reglas explícitamente.

## Flujo

1. El vendedor o admin genera QR pendientes, asignados a quien los generó. Un pack crea seis entradas individuales.
2. Entrega el enlace `qr.html#TOKEN` y marca Enviado. El nombre es opcional.
3. Cuando el cliente confirma que pagó, solicita aprobación. Esto no confirma la transferencia.
4. El admin comprueba el pago por interno y aprueba o invalida.
5. En puerta solo se admite un QR aprobado, una vez. Un QR pendiente, invalidado o utilizado se rechaza.

El contador público y el panel muestran únicamente entradas aprobadas; no suman una base histórica. Generar, enviar, solicitar aprobación y poner nombre no suman. Aprobar suma uno; invalidar una entrada aprobada resta uno; entrar no resta. Las cortesías activadas se incluyen en entradas aprobadas, pero el panel del generador las distingue de ventas pagadas. El campo legado `initialSold: 110` se conserva en las escrituras por compatibilidad con las reglas desplegadas, pero no se usa para calcular ni mostrar ventas. Las metas de sorpresa 150/200/300 siguen siendo propuestas.

## Invitaciones y canjes de entrada

`invitaciones.html` requiere el mismo acceso supremo que Administración. Genera QR General gratuitos, con `packageId: invitation`, en lotes de 1/5/10. Cada uno reserva un cupo y conserva vendedor/generador, nombre opcional, estado y fecha de envío. La organización debe activarlo para permitir su ingreso. Su enlace privado abre `invitacion.html#TOKEN`; el código de puerta sigue siendo de seis caracteres y el validador muestra que es cortesía. Un canje de entrada gratuito es diferente del QR de canje de comida o bebida.

La emisión actualiza `meta/invitations` junto con su solicitud y los QR; las reglas permiten esta operación exclusivamente al supremo y comprueban un límite de 110 cupos. La anulación libera exactamente un cupo en la misma transacción. Un QR utilizado conserva su cupo y no puede anularse. Los reintentos conservan los mismos QR sin consumir cupos adicionales. La página pública comunica hasta 110 cupos previstos para invitaciones/canjes, sin presentarlos como ventas pagadas ni como asistentes que ya ingresaron.

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

El emulador requiere Java 21. Las pruebas incluyen aislamiento de vendedores, pack de seis, rechazo de roles falsos, aprobación/contador atómicos, nombre único, revocación e ingreso concurrente único. También verifican emisión exclusiva de cortesías por el supremo, reintentos sin duplicar, límite de 110 bajo concurrencia, liberación de cupos al anular y permanencia de cupos utilizados. Los datos del emulador y de la demo localhost no se migran a producción.

La emisión vigente admite lotes individuales de 1/5/10 y pack de 6. Cada parte contiene hasta tres entradas para respetar los límites de consulta de reglas por transacción. Los códigos se reservan en una transacción, se comprueban colisiones y se reintentan; una reserva existente nunca puede reasignarse. El índice del código corto se mantiene privado y el enlace público del comprador conserva su token largo. Las solicitudes parciales se identifican con UID, clave aleatoria estable e índice de parte.

Los nuevos códigos sugeridos para vendedores usan la inicial sin tilde, `26` y tres letras aleatorias (seis caracteres). Los códigos de este formato aceptan mayúsculas o minúsculas al ingresar. Las credenciales largas anteriores conservan su distinción de mayúsculas; el admin y los validadores mantienen su formato. El código de vendedor es un acceso privado, distinto del código del QR para puerta. Al cambiar una credencial se conserva el UID y sus ventas; las claves reales se entregan por privado y nunca se versionan.
