# ShadowFest — propuesta inicial

## Objetivo

Mostrar la experiencia del evento y convertir visitas en solicitudes claras al chat del organizador. Las transferencias y su validación se realizan por interno. Enviar una solicitud no confirma una compra ni genera una entrada válida.

## Dirección visual

Concepto: «El perreo sale de las sombras».

Negro carbón, rojo sangre, blanco hueso y acentos cromados. Titulares grandes y condensados; textos de información sobrios y legibles. Fotografía o ilustración de horror, niebla, grano y manchas de sangre ficticia como elementos de composición. Equilibrar el gore con una estética de festival nocturno profesional.

Portada de alto impacto con ShadowFest, frase principal, fecha/lugar cuando se confirmen y botón «Solicitar entradas». Animaciones breves y opcionales, sin sonido automático, respetando reducción de movimiento. Diseño pensado primero para celular.

## Web pública

1. Portada: identidad, fecha, ciudad, lugar y llamado a solicitar entradas.
2. Experiencia: reggaetón, ambientación de terror y actividades confirmadas. No inventar artistas ni beneficios.
3. Entradas y paquetes: precio, etapa de preventa, cantidad de personas, beneficios, disponibilidad y restricciones. General, grupal y VIP son opciones propuestas, pendientes de confirmación.
4. Preventa de bebidas: productos, cantidades, precios y condiciones de retiro confirmados. Separar entradas de consumos.
5. Solicitud: nombre, contacto, paquete, cantidad y bebidas opcionales; resumen antes de abrir el chat.
6. Cómo comprar: seleccionar → solicitar por chat → coordinar transferencia → organizador verifica → recibir entrada.
7. Ubicación y preguntas frecuentes: horarios, ingreso, edad admitida, documentos, cambios, cancelaciones y contacto, según información del organizador.

El chat recibe un mensaje preparado que el visitante envía voluntariamente. Si se necesita registrar solicitudes en el panel, guardarlas con consentimiento antes de abrir el chat; abrir el chat no demuestra que el mensaje se haya enviado.

## Administración

Acceso con autenticación y permisos de organizador/staff. No usar una contraseña incrustada en la URL o en JavaScript como protección del panel.

- Editar datos del evento, paquetes, precios, cupos y catálogo de bebidas.
- Registrar y consultar solicitudes, comprador, cantidades y total acordado.
- Estados de solicitud: nueva, contactada, pendiente de pago, pago confirmado o cancelada.
- Confirmar manualmente el pago y emitir un QR individual por asistente.
- Enviar/copiar enlaces de entradas desde el panel.
- Escanear QR en puerta y consumirlo una sola vez mediante validación atómica.
- Mostrar claramente entrada válida, utilizada, anulada o inexistente.
- Controlar retiro de bebidas por separado del ingreso, con registro de cantidades entregadas.
- Buscar y filtrar, exportar registros y revisar historial de acciones del staff.

## Referencia ZUMBA

Se revisó ZekturCh/ZUMBA, que usa una web estática con Firebase Firestore, QR individuales, listado de estados y escaneo por cámara. ShadowFest mantiene esas ideas, pero incorpora solicitudes, verificación manual de pago, paquetes y consumos. Usará configuración y datos independientes del evento anterior.

## Modelo de datos propuesto

Evento; paquetes; productos; solicitudes y sus líneas; entradas individuales; pedidos de bebidas y entregas; usuarios/roles; historial de acciones. Congelar el precio y beneficios acordados en cada pedido para que posteriores cambios de catálogo no alteren compras existentes.

## Orden de trabajo

1. Confirmar datos del evento, canal de chat, paquetes y operación del staff.
2. Diseñar portada y catálogo con contenido provisional claramente identificado.
3. Construir la web pública y el armado de solicitudes.
4. Implementar autenticación, gestión de solicitudes, entradas y bebidas.
5. Verificar en celular el flujo completo, pagos manuales, cupos, QR repetidos y retiro de consumos.
6. Publicar cuando estén configurados los datos, cuentas y condiciones reales.

## Pendientes

Fecha, ciudad/lugar, horarios, edad admitida, aforo, moneda, paquetes/precios/beneficios, bebidas, contacto del organizador, staff y hosting. Repositorio solicitado: ShadowFest en la cuenta ZekturCh; creación remota pendiente de acceso a una sesión de GitHub que permita crear repositorios.
