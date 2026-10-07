# DOMUS RC1 — Tesorería Staging

2026-10-07. Estado: implementación desplegada en Staging; NO declarar SOLUCIONADA sin prueba autenticada desde la app.

- Referencia preservada: RC1 30037, commit 936ada874eed968abd901e285db2fe7d2e263cc8.
- Nueva versión: 3.0.0-rc.1.3, build 30039.
- Repositorio autorizado: josemsaavedra-afk/domus-3-staging, main, domus-3/.
- Supabase autorizado: pmgonotpbmybtwvxbcvf. No tocar producción jiwfpczmffsjpfvsrrvk.
- Último commit de aplicación desplegado: 84f869c06399847dfad288ff39fc413bd9c9e6c3. GitHub main actualizado mediante conector tras no disponer de credenciales CLI.

## Cambios

Edge Function domus-treasury v1: valida token con Auth.getUser, actor y hogar; reutiliza validación/CSV/huellas de RC1. CORS para el origen de GitHub Pages. Claves privadas nunca en frontend.
RPC public.domus_treasury_execute (SECURITY INVOKER) delega a private.domus_treasury_execute, propiedad de domus_treasury_executor (NOLOGIN, NOSUPERUSER, NOBYPASSRLS). Conserva RLS y pertenencia al hogar. Una transacción incluye escritura y recibo idempotente; bloqueo por hogar, revisiones y errores de conflicto. Recibos no accesibles directamente a authenticated.
La migración concedió SET temporalmente al administrador postgres para asignar el propietario; lo restauró a false. No se concedió el rol técnico al navegador.
Frontend conectado exclusivamente a Staging: saldos, extractos, confirmaciones y revocaciones en cola local, estado Sincronizado solo tras respuesta del servidor. Lectura automática recupera saldos para el cálculo y muestra líneas de extractos e historial.

## Evidencia

- npm test en este repositorio: 74/74 correctos, 0 fallos. Incluye motor, CSV, revisión, cola, cambios de usuario, transporte y RPC PostgreSQL en memoria.
- RPC en memoria: recibos idénticos al repetir; conflictos por clave/revisión; rollback completo de importación inválida; hogares/usuarios ajenos y anon bloqueados; revocación conserva autor/fecha original; authenticated no accede a recibos privados.
- backend/verify-staging.sql ejecutado satisfactoriamente en Supabase Staging: saldo, importación, lectura, confirmación, revocación, idempotencia y aislamiento. Datos ficticios y ROLLBACK completo. Simula contexto de Auth para probar SQL; NO demuestra una sesión web real ni conservación entre sesiones.
- Pruebas heredadas de desarrollo: 33 pruebas de runtime/persistencia/motor/contexto y 51 pruebas SQL/RLS/servidor correctas. La versión de desarrollo es antigua; nunca se usó como frontend de despliegue.
- Advisors: ningún nuevo hallazgo de Tesorería. Advertencias previas de create_household/join_household y protección de contraseñas, ajenas a esta corrección.

- HTTP real Edge Function: OPTIONS 204 con CORS correcto; POST sin token 401. POST autenticado probado desde la app: saldo guardado y recuperado correctamente.
- Despliegue frontend confirmado: https://josemsaavedra-afk.github.io/domus-3-staging/domus-3/version.json devuelve 3.0.0-rc.1.2 build 30038.

## Verificación autenticada — 2026-10-07, segundo intento

- Acceso correcto mediante formulario seguro tras corregir contraseña. Hogar de Staging: casa prueba.
- PWA: primera pestaña mostraba 30037; recarga actualizó a 30038, confirmado en Configuración y con interfaz persistente activa.
- Creada cuenta ficticia RC1 PRUEBA TESORERÍA: 4c85b46f-3296-4012-add0-104143c8a299. Hogar a5c95017-2910-4819-b9d0-9dd8b0f9b23a.
- Saldo ficticio 1234.56 EUR del 2026-10-01: encolar mostró Pendiente de sincronización, enviar mostró Sincronizando y solo después de respuesta mostró Sincronizado. Consultar historial recuperó 1 saldo. Lectura SQL posterior confirma un checkpoint comprometido; no fue rollback.
- Saldo calculado visible recuperado: 1234,56 EUR. Lectura autenticada real y guardado HTTP real verificados.
- Movimiento ficticio RC1 PRUEBA CONCILIACIÓN, 10 EUR, 2026-10-07, estado done: 3ff14509-2754-44cf-b6c1-d9542dd68904. Guardado UI y comprobación SQL correctos.
- CSV de prueba creado: fecha 2026-10-07, concepto RC1 PRUEBA CONCILIACIÓN, importe -10.00. Todavía NO importado desde la app.

## Continuación verificada — 2026-10-07

- Recuperado main del repositorio antes de continuar; no se recreó cuenta ni saldo.
- CSV rc1-treasury-test.csv importado desde el control visible de la app. Una línea: 2026-10-07, RC1 PRUEBA CONCILIACIÓN, -10.00 EUR. Estado Pendiente → Sincronizando → Sincronizado. Historial remoto: 1 saldo, 1 extracto, 0 conciliaciones.
- Coincidencia revisada y confirmada por UI; guardada mediante cola y HTTP real. Historial: 1 conciliación confirmada.
- Revocación desde UI con motivo “Prueba RC1: revocación con trazabilidad”; sincronizada y recuperada con estado Revocada. Confirmación original conserva autor/fecha: 2026-10-07T19:46:45.271831+00:00. Revocación: 2026-10-07T19:47:30.98464+00:00. Autor en ambos: 7338a6e5-e131-4c62-a0f2-adb53cd034cf.
- Recarga completa recuperó saldo 1234.56 del 2026-10-01, extracto y revocación. Saldo calculado 1224.56 (movimiento realizado -10).
- Reimportación del mismo CSV y sincronización: continúa habiendo un único extracto; no duplicados.
- Cerrar sesión por UI dejó el formulario de acceso. Reentrada por browserAuth seguro verificada. Historial completo recuperado tras reentrada.
- Segunda pestaña/instancia de la app recuperó el mismo historial por backend. Comparte perfil del navegador; NO equivale a un segundo dispositivo físico ni perfil limpio.
- Smoke RC1: listado Todos muestra movimiento realizado de 10 EUR; calendario octubre muestra pagos 10 EUR; informes, documentos y configuración cargan. No se afirma auditoría completa de todas las funciones.
- Correcciones de presentación desplegadas en build 30039: resumen de revisión deja de afirmar “Nada ha sido guardado”; historial muestra autor, fecha original, fecha de revocación y motivo.
- npm test después del cambio: 74/74 correctos. HTTP version.json y Configuración autenticada confirman 3.0.0-rc.1.3 / 30039. PWA precisó segunda recarga para activar el nuevo shell.
- Evidencia visual capturada del historial tras reentrada: rc1-30039-treasury-verified.jpg.

## Pendientes y límite concreto

1. Conflicto concurrente por UI y segundo hogar por UI. Ya cubiertos en SQL/PGlite, pero aún no se ha completado esa comprobación de navegador.
2. Segundo dispositivo o perfil independiente: VALIDADO manualmente por el usuario desde iPhone el 2026-10-07. Recuperados desde backend el saldo 1234,56 EUR, cuenta RC1 PRUEBA TESORERÍA, extracto rc1-treasury-test.csv y conciliación revocada con autor, fechas y motivo. Capturas aportadas por el usuario.
3. No declarar cierre completo de todos los criterios hasta resolver el conflicto concurrente por UI.

Al preparar el segundo CSV para conflicto concurrente, filechooser falló tras el acceso seguro con BrowserCredentialRecoveryError / retained_data_restricted. Navegación explícita al documento canónico recuperó la lectura y navegación UI, pero filechooser volvió a fallar. No es un error de importación de DOMUS: el archivo de conflicto NO se ha cargado. No inspeccionar ni reconstruir credenciales/tokens/cookies, ni ejecutar la sesión desde herramientas externas.

Siguiente acción: en un runtime de navegador capaz de cargar archivos (o mediante control manual del selector), importar CSV ficticio de conflicto en esta misma cuenta, capturar base de confirmación, modificar el movimiento desde otra instancia antes de sincronizar y verificar conflicto conservado. El CSV temporal preparado contiene 2026-10-07, RC1 PRUEBA CONCILIACIÓN CONFLICTO, -10.00 EUR; puede recrearse. No duplicar la cuenta/saldo ya existentes. Validar además perfil/dispositivo independiente y aislamiento por UI.


## Cuaderno vivo de pendientes funcionales y de interfaz

Regla de trabajo: este bloque es la lista de control persistente. Un punto solo pasa de PENDIENTE a VALIDADO cuando está implementado en la interfaz, desplegado en Staging y comprobado. No basta con que exista en Supabase o en el código.

### PRIORIDAD ALTA — interfaz útil y clasificación lógica

- PENDIENTE — Alta/edición de movimientos: separar claramente **fecha de factura/tique/documento** de **fecha real de pago/cobro**. Tesorería y conciliación deben usar la fecha de pago/cobro; fiscalidad/documentación debe conservar la fecha documental. Si coinciden, se puede proponer/autorrellenar, pero nunca fusionar ambos conceptos en un único campo ambiguo.
- PENDIENTE — Auditoría completa UI ↔ modelo de datos: comprobar que todo dato relevante existente en backend tenga control visible, editable y comprensible en la interfaz cuando corresponda.
- PENDIENTE — Configuración de relaciones: exponer y mantener de forma útil las relaciones entre persona económica, de quién es, quién paga, cuenta, tercero/comercio/proveedor, categoría/subcategoría, actividad/proyecto, etiquetas y documento asociado.
- PENDIENTE — Clasificación con lógica de negocio: impedir combinaciones incoherentes y filtrar opciones según contexto. Ejemplo obligatorio: una **factura de ingreso nunca puede clasificarse como doméstica**. Las reglas deben orientar alta, edición, recurrentes, documentos e informes.
- PENDIENTE — Revisión de formularios de alta/edición/recurrentes para que consuman maestros y reglas de Configuración y no permitan valores incompatibles.
- PENDIENTE — Revisar que Configuración sea realmente editable para todos los maestros relevantes y que sus cambios repercutan en formularios, filtros, informes y clasificación automática.

### Tesorería RC1

- VALIDADO — Guardado y recuperación de saldos.
- VALIDADO — Importación y recuperación de extractos.
- VALIDADO — Confirmación y revocación con trazabilidad.
- VALIDADO — Persistencia tras recarga y cierre/reapertura de sesión.
- VALIDADO — Reimportación sin duplicados.
- VALIDADO — Segundo dispositivo físico (iPhone) recupera estado remoto.
- VALIDADO — Suite automatizada 74/74.
- PENDIENTE — Conflicto concurrente por interfaz real.

### Recuperados de conversaciones anteriores — revisar/validar en RC1

Estos puntos fueron pedidos explícitamente en conversaciones previas. Se registran como **REVISAR/VALIDAR** cuando no hay evidencia suficiente en este archivo para afirmar que siguen pendientes o que ya están cerrados. No se eliminan hasta comprobarlos en Staging.

#### Navegación y presentación

- REVISAR/VALIDAR — Paginación: controles accesibles también arriba y/o flotantes, no únicamente al final de listados largos.
- REVISAR/VALIDAR — Resúmenes azules/KPI: deben reflejar el mes o período consultado, no quedarse anclados al mes actual.
- REVISAR/VALIDAR — Calendario móvil: rediseño para lectura clara en pantalla estrecha; se pidió específicamente mejorar la legibilidad móvil.
- REVISAR/VALIDAR — Comportamiento móvil a ~390 px: tablas, formularios y controles sin desbordamientos ni pérdida de funciones.

#### Informes

- REVISAR/VALIDAR — Filtros completos por persona, mes/período, categoría y demás dimensiones relevantes; ejemplo pedido: consultar ingresos de una persona en agosto dentro de una categoría concreta.
- REVISAR/VALIDAR — Toda cifra agregada debe permitir **drill-down** hasta los movimientos que la componen.
- REVISAR/VALIDAR — Impresión real del informe como documento/PDF, no solo vista en pantalla.
- REVISAR/VALIDAR — Informes de previsión futura: ingresos y gastos previstos por intervalo, enumerando cada previsión y mostrando totales; los días 10/25 deben funcionar como fechas normales, sin lógica especial artificial.
- REVISAR/VALIDAR — Consultas directas del tipo «cuánto hemos gastado en hosting en tal mes» deben resolverse desde los datos de DOMUS sin búsquedas manuales.

#### Movimientos, recurrentes y maestros

- REVISAR/VALIDAR — Defecto histórico: editar recurrentes de importe variable debía guardar correctamente; caso citado: AEAT de Jeni trimestral.
- REVISAR/VALIDAR — Fecha de cargos recurrentes/alarmas debe poder corregirse de forma efectiva y propagarse en recurrencias futuras cuando corresponda; caso citado: mover alarma del 30/9 al 5/10 y sucesivas al día 5 del mes siguiente.
- REVISAR/VALIDAR — Alta y edición de movimientos deben ofrecer la **misma clasificación y los mismos maestros**, sin catálogos distintos o “batiburrillo”.
- REVISAR/VALIDAR — Miembros del hogar: añadir, desactivar/reactivar y conservar históricos sin romper referencias.
- REVISAR/VALIDAR — Soportar titular/de quién es, pagador/quién paga y cuenta como dimensiones separadas, incluido valor «Compartido» cuando proceda.
- REVISAR/VALIDAR — Maestros precreados pero totalmente editables: crear, editar, desactivar/reactivar categorías, cuentas, terceros y demás catálogos; permitir alta contextual desde un movimiento cuando tenga sentido.

#### Documentos y reconocimiento

- REVISAR/VALIDAR — Lector de documentos/tickets: decidir con evidencia si se mantiene y mejora o se elimina; no dejar un control visible que no funcione.
- REVISAR/VALIDAR — Reconocimiento de PDF/ticket debe distinguir ingreso, gasto, transferencia y liquidación; extraer fecha, proveedor/tercero, número, base, IVA y retención cuando existan; marcar dudas y **no inventar importes**.
- REVISAR/VALIDAR — Caso de prueba pendiente citado: PDF de ONLOGIST rellenaba datos incorrectos.
- REVISAR/VALIDAR — Separación conceptual entre documento y movimiento: un documento puede tener su propia fecha y metadatos sin obligar a igualarlos con fecha de pago/cobro.

#### Autenticación, PWA y acceso normal

- REVISAR/VALIDAR — Recuperación de contraseña extremo a extremo desde la propia app/PWA, incluida entrada normal de Jeni desde el icono sin depender de un enlace de invitación antiguo.
- REVISAR/VALIDAR — Login/logout, sesión persistente y reapertura desde PWA instalada.
- REVISAR/VALIDAR — PWA/offline independiente de DOMUS 2.5.8 y sin volver a una ruta antigua como index-258.html.
- REVISAR/VALIDAR — Pruebas reales en iPhone para instalación, actualización de caché y apertura correcta de RC1.

#### Tesorería y lógica económica

- PENDIENTE — Conflicto concurrente por interfaz real (ya registrado como último criterio de cierre de Tesorería RC1).
- REVISAR/VALIDAR — Prefinanciación ONLOGIST/RHD: mover la previsión sin duplicarla, conservar vencimiento original, coste parametrizable, distinguir prefinanciado de cobrado/liquidado, permitir conciliación y mantener auditoría.
- REVISAR/VALIDAR — La vista de Tesorería debe mantener separación real vs previsión y mostrar, cuando proceda: saldos por cuenta, realizado, pendiente, vencido, reprogramado, prefinanciado y liquidado; próximo cobro; pagos hasta próximo cobro; evolución por cuenta; horizontes 7 días/fin de mes/30 días/fin de año y desglose explicativo.

#### Datos históricos/auditoría — no mezclar con nuevas funciones

- REVISAR ESTADO — Importaciones/correcciones históricas mencionadas en septiembre (Mercadona 2026, tickets de Jeni, clasificación DIA) pertenecen a trabajo de depuración de datos y no deben darse por resueltas sin comprobar su estado actual. No ejecutar correcciones masivas ni tocar producción desde RC1 Staging.

### Relación DOMUS ↔ TransportERP — decisión de arquitectura a preservar

- PENDIENTE — Definir y documentar el contrato de integración entre DOMUS 3.0 y TransportERP. No deben evolucionar como dos sistemas aislados que dupliquen lógica.
- PENDIENTE — TransportERP debe concentrar la lógica especializada de la actividad profesional de transporte: importación documental, lectura de facturas/autofacturas/seguros/comisiones/prefinanciación, asociación por transporte, duplicados, conciliación operativa, beneficio operativo/neto, IVA/IRPF, ROI/intracomunitarias, vencimientos y métricas por transporte/hora/km.
- PENDIENTE — DOMUS debe concentrar la visión financiera global del hogar y de sus miembros: cuentas, personas, titularidad económica, quién paga, categorías, ámbitos doméstico/actividad, presupuestos, recurrentes, calendario, tesorería global, documentos y reporting familiar.
- PENDIENTE — La integración debe permitir que movimientos y documentos profesionales procesados en TransportERP lleguen a DOMUS ya estructurados, con trazabilidad de origen, evitando reintroducción manual y evitando que DOMUS tenga que reinterpretar la lógica fiscal/operativa del transporte.
- PENDIENTE — DOMUS debe poder distinguir que un movimiento viene de TransportERP y conservar identificadores de origen suficientes para reconciliar actualizaciones, evitar duplicados y navegar hasta el detalle profesional cuando proceda.
- PENDIENTE — El motor documental común debe reutilizar, cuando sea viable, las herramientas de lectura ya desarrolladas/planteadas en TransportERP. DOMUS no debe mantener un parser independiente que duplique y diverja.
- PENDIENTE — Definir claramente la dirección de sincronización y la fuente de verdad por cada dato. Como principio: detalle operativo/fiscal de transporte en TransportERP; visión financiera agregada y de hogar en DOMUS. No crear escrituras bidireccionales ambiguas sin reglas de propiedad del dato.
- PENDIENTE — Probar con casos reales del ecosistema del usuario: ONLOGIST, Driiveme, RHD, AXA, gastos etiquetados por transporte (#nº transporte) y gastos generales sin etiqueta; comprobar que DOMUS recibe el resultado financiero correcto sin perder el vínculo al origen.

### Disciplina de cierre

Para cualquier mejora futura registrar aquí: estado, build, commit, pantalla afectada, prueba ejecutada y resultado. Eliminar de PENDIENTE solo tras validación real en Staging. Si existe backend sin interfaz utilizable, el estado sigue siendo PENDIENTE.
