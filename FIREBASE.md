# Firebase de Shadow Fest

Proyecto configurado: `comecome-ab1a0`. Base elegida: **Cloud Firestore (default)**. No se usa Realtime Database ni Analytics.

## Arquitectura

La web llama a `/api`, que Firebase Hosting redirige a `shadowfestApi`. La función comprueba códigos, sesiones y permisos y usa Firebase Admin SDK. Las reglas de Firestore rechazan toda lectura y escritura directa del navegador. Admin SDK opera con la cuenta de servicio de la función y no depende de estas reglas; la autorización efectiva está en `functions/service.js`.

No se requiere formulario de usuario ni contraseña. El código supremo se guarda en Secret Manager, nunca en el bundle público. Los códigos de vendedores/validadores se identifican por SHA-256 en la base; entrega códigos aleatorios con el botón “Generar seguro”. Las sesiones usan tokens de 256 bits, duran 8 horas y se comprueba revocación en cada operación. Hay límites de intentos por IP y por vendedor. El vendedor solo lista sus propias ventas; el validador consulta e ingresa entradas, sin listar compradores. El organizador ve todo y revoca accesos o anula entradas válidas.

## Colecciones

Todos los documentos se crean bajo `shadowfest_events/2026`:

| Subcolección | Datos |
| --- | --- |
| `tickets` | Paquete, vendedor, comprador, teléfono, estado, fechas |
| `accesses` | Identificador hash del código, nombre, rol, estado |
| `sessions` | Sesiones con caducidad |
| `tokens` | Índice hash del token de ingreso hacia una entrada |
| `claims` | Índice hash del código de registro hacia una entrada |
| `meta/sales` | Base histórica 110 y número de nuevas entradas no anuladas |
| `issue_requests` | Evita emitir dos veces por reintentos de una venta |
| `rate_limits` | Límites de solicitudes con caducidad |

No es necesario crear documentos a mano. La colección `DATAREST` no se utiliza ni se modifica. El archivo de reglas de este repositorio deniega también otras colecciones: si el proyecto aloja otra app, integrar el bloque `shadowfest_events` en sus reglas existentes y revisar permisos antes de sustituirlas. Una regla general permisiva existente puede invalidar el bloqueo porque las reglas se combinan por OR.

## Activación y despliegue

La configuración web del proyecto no da credenciales administrativas. La CLI debe iniciar sesión con una cuenta autorizada. Cloud Functions requiere un proyecto con facturación habilitada (plan Blaze); no cambiar el plan sin autorización del propietario.

Desde la carpeta del repositorio:

```powershell
npx firebase-tools login
npm ci --prefix functions
npm test
npm run build
npx firebase-tools functions:secrets:set SHADOWFEST_SUPREME_CODE --project comecome-ab1a0
npx firebase-tools deploy --only functions:shadowfest,firestore,hosting --project comecome-ab1a0
```

En el prompt del secreto introducir el código supremo elegido por el organizador. No escribir su valor en argumentos, archivos versionados ni reglas. El paso de despliegue debe ejecutarse después de verificar que este proyecto y sus reglas son exclusivos de Shadow Fest. No se ha desplegado desde esta sesión: no hay una cuenta autorizada en la CLI.

En la consola, la pestaña **Firestore → Reglas** permite pegar el contenido de `firestore.rules` y publicarlo. Esto por sí solo protege la base; no conecta la web ni despliega la función.

## Flujo y contador

1. El organizador crea un acceso de vendedor o validador en `admin.html`.
2. El vendedor entra por código, confirma manualmente el pago y genera una entrada o 6 para un pack.
3. Entrega cada enlace `activar.html#CODIGO` y su código al comprador.
4. El comprador ingresa el código, registra nombre y celular, confirma +18 y uso de sus datos, y abre `qr.html#TOKEN`.
5. El personal consulta y confirma en `validar.html`. Firestore consume la entrada en una transacción; un segundo ingreso se rechaza.

Los enlaces llevan secretos en el fragmento `#`, que no viaja en las peticiones de archivos ni en referencias HTTP. Los datos del comprador se guardan solo una vez y la consulta pública del QR no devuelve el teléfono. Quien tenga el enlace/código de registro puede recuperar el QR; por eso debe entregarse de forma privada.

El contador empieza en **110 ventas históricas**, sin inventar datos ni QR para esas personas. Cada nueva entrada emitida con pago confirmado suma 1, un pack suma 6, una anulación resta 1 y el ingreso no descuenta. El registro del comprador no vuelve a sumar. La portada consulta el contador cada 15 segundos y el panel cada 30 segundos cuando está visible. Si se migran los 110 QR históricos después, deben marcarse e importarse sin incrementar nuevamente este contador.

Metas 150, 200 y 300 son una propuesta de vista previa. Editar `surprises.js` con las metas y contenidos confirmados antes de publicar. Los textos de revelación están en archivos públicos; para sorpresas verdaderamente secretas mover el contenido al servidor antes de publicar.

## Pruebas y vista previa

`npm test` incluye permisos del servidor, aislamiento de ventas, reintentos idempotentes, pack de 6, registro concurrente, ingreso único, anulación, revocación y límite de intentos. Son pruebas unitarias con un adaptador transaccional en memoria, no una prueba contra Firebase desplegado.

La vista `localhost:5173` usa una demo local separada, sin pagos ni compradores reales. El secreto de prueba está en `.shadowfest-local.json` (ignorado por Git). `npm run build` prepara `dist`, fuerza el backend real y excluye este secreto y la demo. No publicar la raíz completa del repositorio.

Para comprobar funciones y reglas en emulador, instalar Java compatible con Firebase CLI y ejecutar:

```powershell
npm run build
npx firebase-tools emulators:start --only firestore,functions,hosting --project demo-shadowfest
```

El secreto del emulador debe configurarse en `functions/.secret.local`, ignorado por Git. No se ha ejecutado el emulador en esta máquina porque Java no está disponible. Verificar ingreso desde dos dispositivos y denegación de escrituras directas después de desplegar, antes de ventas reales.

Documentación oficial: [comparación de bases](https://firebase.google.com/docs/database/rtdb-vs-firestore), [reglas y Admin SDK](https://firebase.google.com/docs/firestore/security/rules-conditions), [secretos](https://firebase.google.com/docs/functions/config-env), [Hosting y Functions](https://firebase.google.com/docs/hosting/functions).
