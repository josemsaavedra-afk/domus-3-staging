
## Incidencia detectada — 2026-10-09 — movimiento genérico Documento

- CONFIRMADO en Staging: serie `5dbe336a-045e-4c8a-81da-1a22ee90c514` vinculada al PDF `G260911-017371-375400-1.pdf`, `source=document`, `type=income`, concepto persistido `Documento`, importe 60,38 €, fecha 09/10/2026, estado pendiente. Actualización de fila posterior al volcado, pero el concepto sigue siendo `Documento`.
- La foto del usuario muestra simultáneamente comisión ONLOGIST, `Documento`, seguro AXA. Son series distintas, no una duplicación visual del mismo ID. NO borrar, cancelar, renombrar ni cambiar el estado sin validar qué representa el ingreso y la edición deseada.
- PENDIENTE CRÍTICO: depurar el origen del concepto genérico del lector/importador de documentos; identificar si los cambios guardados en edición persisten por campo y diferenciar edición del documento vs movimiento económico asociado; validar lectura tras escritura y avisar si la actualización remota no coincide. No declarar guardado exitoso sin readback.
- PENDIENTE UX: no aceptar `Documento` como nombre final por defecto en un ingreso de factura. Exigir una descripción significativa o proponer una reconocible del origen, sin inventar operación ni duplicar el ingreso.

## Ejecución autónoma — 2026-10-09 — datos reales + intercobros + presupuestos

- Producción se ha usado **solo como origen de lectura**. No se ha modificado `jiwfpczmffsjpfvsrrvk`.
- Antes de sustituir los datos de trabajo de Staging se creó un punto de restauración interno: snapshot `1ab53621-3bd8-4dcb-b6df-fccc4d8bc832`.
- Se creó además una copia bruta de los datos reales de producción dentro de Staging: snapshot `e235718b-9a76-45af-8edd-5241a696ace9`. Conserva los registros originales antes de las adaptaciones de compatibilidad.
- Copia real cargada en el hogar Staging `a5c95017-2910-4819-b9d0-9dd8b0f9b23a`: 27 categorías, 3 personas (2 activas), 9 cuentas (7 activas), 1.898 series de movimientos, 1.873 estados, 100 documentos, 73 vínculos documento-movimiento, 75 vínculos entre movimientos y 2 operaciones ONLOGIST.
- Control de integridad: suma nominal de series de ingreso producción/Staging = 88.419,72 €; suma nominal de series de gasto producción/Staging = 102.351,04 €. Los recuentos de series y estados coinciden exactamente.
- Adaptaciones de compatibilidad aplicadas **solo en la copia de trabajo**: `new_line`/`other` → `variable`; ingresos profesionales con factura/cliente profesional → ámbito `business`; estados `done` antiguos sin `actual_date` reciben la fecha efectiva/original para cumplir el modelo RC1. La copia bruta conserva el valor original.
- Los ingresos Lyreco de la copia de trabajo se han normalizado como `Ingreso habitual + Actividad económica`, que es el criterio funcional definido para la previsión intercobros. El histórico original queda intacto en el snapshot bruto.
- Caso real de validación intercobros disponible: serie habitual Lyreco de 3.000 € con ocurrencia base 25/10/2026 y reprogramación real/predicha a 23/10/2026. La UI debe mostrar ventana estimada y días restantes, no una falsa fecha rígida.
- Build 30045 añade el resumen intercobros en **Hoy** y **Tesorería**, calculado exclusivamente con `type=income`, `income_source_type=habitual` y `expense_scope=business`; ingresos variables no desplazan el horizonte.
- Build 30045 añade **Presupuestos / Planes**: creación de plan, partidas, total presupuestado/asentado/restante/desviación, conversión selectiva a movimientos, cancelación de partidas no asentadas y cancelación masiva de movimientos pendientes generados por un plan. Los movimientos ya realizados se conservan por defecto.
- Nuevas tablas Staging: `budget_plans`, `budget_items`, `budget_item_movements`, con RLS por hogar y trazabilidad de autor. Smoke SQL de creación de presupuesto ejecutado con ROLLBACK correctamente.
- Commit principal de aplicación build 30045: `aa5a69ac82928cf2a3fd51b7ca621a460da30ecc`. Metadatos/manifest/service worker actualizados después.
- El JavaScript inline del `index.html` de 30045 ha pasado comprobación de sintaxis. Falta todavía confirmar en navegador real que GitHub Pages sirve 30045 y completar prueba funcional interactiva de intercobros y presupuesto → movimiento → cancelación.

# DOMUS RC1 — Rediseño funcional Staging

2026-10-09. Estado actual: build 30045 preparado con datos reales en Staging, previsión intercobros y presupuestos/planes. Pendiente comprobación final en navegador del build desplegado.

- Base preservada: Tesorería RC1 build 30039, sin reconstrucción desde Alpha.
- Versión actual: 3.0.0-rc.1.9, build 30045.
- Repositorio: josemsaavedra-afk/domus-3-staging, main, domus-3/.
- Supabase autorizado: pmgonotpbmybtwvxbcvf. Producción jiwfpczmffsjpfvsrrvk no modificada.
- Commit de aplicación: 940e26bef1c657c6ced0a158699e4e583395c3fe. GitHub Pages run 37961785483: build y deploy success; HTTP version.json confirma build 30043.
- Edge Function domus-treasury v2 ACTIVE, verify_jwt=true; POST sin token devuelve 401. RPC y garantías de Tesorería conservados.
- npm test: 85/85 correctas, incluidas las 74 originales. verify-staging.sql completado nuevamente con ROLLBACK; ningún nuevo hallazgo de advisors.

## Registro histórico de Tesorería — 2026-10-07

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

### BLOQUEO DE PRUEBAS FUNCIONALES POR INTERFAZ

- ESTADO: **BLOQUEANTE** — Se suspenden las pruebas funcionales de usuario sobre altas/ediciones hasta disponer de una interfaz que represente correctamente el modelo económico y de tesorería. Seguir probando sobre la UI actual produciría resultados engañosos y obligaría a repetir pruebas.
- PRIORIDAD INMEDIATA — Rediseñar primero el flujo de creación/edición de movimientos y su modelo de interacción. Después reanudar pruebas de calendario, informes, tesorería y clasificación sobre esa base.
- CRITERIO DE DESBLOQUEO — No reanudar pruebas generales hasta validar al menos: naturaleza Ingreso/Gasto, evento de caja Cobro/Pago, fecha económica/documental, fecha real de cobro/pago, persona económica, pagador/cobrador, cuenta/medio, tercero, categoría, ámbito, actividad/proyecto, estado y recurrencia.

### PRINCIPIO UX — DOMUS PARA USUARIO BÁSICO

- PENDIENTE CRÍTICO — DOMUS debe poder entenderse sin conocimientos contables, fiscales ni técnicos. Toda pantalla de Configuración debe usar lenguaje cotidiano, ejemplos precargados y ayuda contextual breve.
- PENDIENTE CRÍTICO — Mantener y ampliar comentarios/instrucciones dentro de la propia interfaz: explicar qué significa cada bloque, para qué sirve, cuándo usarlo y cuándo puede dejarse vacío. La ayuda debe estar junto al campo o bloque, no escondida en documentación externa.
- PENDIENTE CRÍTICO — Precargar ejemplos visibles en Staging para enseñar el modelo sin obligar al usuario a deducirlo. Ejemplos mínimos: categorías (Vivienda, Transporte, Alimentación, Suministros, Impuestos, Ocio), terceros (Mercadona, Vodafone, Lyreco, ONLOGIST), actividades/proyectos (Lyreco 722, Traslado vehículos 849) y etiquetas (Extraordinario, Cumpleaños, Viaje).
- PENDIENTE CRÍTICO — Añadir el **Ámbito** como dimensión claramente visible y separada de Categorías: Doméstico / Actividad económica / Mixto, con explicación sencilla y ejemplos.
- PENDIENTE CRÍTICO — Precargar reglas de clasificación de ejemplo, editables y desactivables, expresadas como frases comprensibles del tipo «Si pasa esto → clasificar así».
- PENDIENTE CRÍTICO — Ejemplos de reglas a mostrar: Mercadona → Alimentación + Doméstico; Lyreco + Ingreso → Actividad económica + Lyreco 722; ONLOGIST → Actividad económica + Traslado vehículos 849; Vodafone → Suministros; AEAT → Impuestos; Ingreso → nunca sugerir Doméstico.
- PENDIENTE CRÍTICO — La pantalla de reglas no debe exponer primero prioridades numéricas ni terminología técnica. La prioridad avanzada puede existir, pero detrás de una vista simple con condiciones y resultado en lenguaje natural.
- PENDIENTE CRÍTICO — Conservar la ayuda ya acordada sobre conceptos como «tercero» y extender el mismo patrón a Categoría, Ámbito, Actividad/Proyecto, Etiquetas y Reglas.

### DECISIÓN FUNCIONAL — REDISEÑO COMPLETO DE INTERFAZ

- PENDIENTE CRÍTICO — La interfaz actual de DOMUS 3.0 RC1 se considera **no válida como base final de producto**. No seguir acumulando parches aislados sobre formularios heredados.
- PENDIENTE CRÍTICO — Rediseñar de forma coherente toda la interfaz de alta, edición, consulta, configuración, documentos, informes y tesorería alrededor del modelo real de datos y las reglas de negocio ya existentes.
- PENDIENTE CRÍTICO — Separar explícitamente en UI: **naturaleza económica** (Ingreso/Gasto), **movimiento de caja** (Cobro/Pago), **fecha del documento/operación** y **fecha real de cobro/pago**. Ningún campo genérico «Tipo» o «Fecha» debe mezclar conceptos distintos.
- PENDIENTE CRÍTICO — Revisar navegación, jerarquía visual, nombres de campos, orden lógico, dependencias entre campos, validaciones, estados y comportamiento móvil/escritorio. La interfaz debe guiar y bloquear incoherencias, no limitarse a exponer columnas del backend.
- PENDIENTE CRÍTICO — Antes de cerrar cualquier pantalla, validar que todo lo que existe en Supabase/GitHub y es funcionalmente relevante pueda verse, capturarse y editarse correctamente desde la interfaz.

### PRIORIDAD ALTA — interfaz útil y clasificación lógica

- PENDIENTE — Alta/edición de movimientos: separar claramente **fecha de factura/tique/documento** de **fecha real de pago/cobro**. Tesorería y conciliación deben usar la fecha de pago/cobro; fiscalidad/documentación debe conservar la fecha documental. Si coinciden, se puede proponer/autorrellenar, pero nunca fusionar ambos conceptos en un único campo ambiguo.
- PENDIENTE — Auditoría completa UI ↔ modelo de datos: comprobar que todo dato relevante existente en backend tenga control visible, editable y comprensible en la interfaz cuando corresponda.
- PENDIENTE — Configuración de relaciones: exponer y mantener de forma útil las relaciones entre persona económica, de quién es, quién paga, cuenta, tercero/comercio/proveedor, categoría/subcategoría, actividad/proyecto, etiquetas y documento asociado.
- PENDIENTE — Clasificación con lógica de negocio: impedir combinaciones incoherentes y filtrar opciones según contexto. Ejemplo obligatorio: una **factura de ingreso nunca puede clasificarse como doméstica**. Las reglas deben orientar alta, edición, recurrentes, documentos e informes.
- PENDIENTE — Revisión de formularios de alta/edición/recurrentes para que consuman maestros y reglas de Configuración y no permitan valores incompatibles.
- PENDIENTE — Revisar que Configuración sea realmente editable para todos los maestros relevantes y que sus cambios repercutan en formularios, filtros, informes y clasificación automática.

### VISIBILIDAD INMEDIATA — HOY + TESORERÍA

- PENDIENTE CRÍTICO — La previsión intercobros de ingresos habituales debe mostrarse tanto en **Tesorería** como en la pantalla **Hoy y pendientes**. No debe quedar relegada únicamente a Informes.
- Objetivo UX: al abrir DOMUS, el usuario debe poder hacerse una idea de la situación financiera en segundos, sin tener que investigar fechas ni ejecutar un informe.
- La tarjeta/resumen debe priorizar lenguaje útil: «Te quedan aprox. X días para el próximo cobro habitual», ingreso esperado, pagos pendientes hasta entonces y margen estimado.
- Cuando la fecha habitual sea variable, mostrar rango/ventana estimada y no una fecha rígida falsa. Mantener acceso al detalle del cálculo.
- La pantalla Hoy debe funcionar como resumen ejecutivo de situación inmediata; Tesorería como vista ampliada del mismo cálculo.

### DATOS REALES EN STAGING — COPIA SEGURA DE TRABAJO

- PRIORIDAD INMEDIATA — Las siguientes pruebas de DOMUS 3 deben hacerse con **datos reales**, no únicamente con ejemplos ficticios. Existe suficiente histórico en producción para validar de verdad previsiones, recurrencias, informes, clasificación y Tesorería.
- NO trabajar directamente sobre producción para estas pruebas. Antes de copiar nada, crear una **copia de seguridad/exportación verificable** de los datos de producción que vayan a utilizarse.
- La carga en Staging debe ser una **copia de trabajo independiente**. Producción permanece intacta.
- Preservar, mediante tabla de correspondencias cuando sea necesario, las relaciones entre hogar, personas, cuentas, categorías, series, ocurrencias, documentos, terceros, actividades, etiquetas, reglas, vínculos y datos de Tesorería. No asumir que los UUID de Auth/hogar son idénticos entre producción y Staging.
- El proceso debe ser repetible: exportar → validar copia → importar/migrar a Staging → comprobar recuentos y sumas → ejecutar smoke tests. Debe poder restaurarse/repetirse sin duplicar datos.
- Conservar un manifiesto de la copia con fecha, tablas incluidas, recuentos, importes de control y mapeos de IDs.
- Tras cargar los datos reales, usar esos datos como base principal para validar la previsión intercobros (Lyreco), presupuestos, informes, clasificación y Tesorería.

### PRESUPUESTOS / PLANES CON CONVERSIÓN A MOVIMIENTOS

- PENDIENTE FUNCIONAL — Añadir una función de **Presupuestos / Planes** para gastos futuros (ej.: vacaciones, reforma, celebración, viaje, compra importante).
- Un presupuesto no debe contaminar automáticamente Tesorería ni los movimientos reales mientras siga en fase de planificación.
- Debe permitir definir: nombre del plan, período/fechas, importe total objetivo, partidas previstas, categoría, ámbito, persona, pagador previsto, cuenta prevista, tercero si se conoce, actividad/proyecto y notas.
- Debe mostrar total presupuestado, comprometido/asentado, restante y desviación entre previsto y real.
- Debe existir una acción explícita para **asentar/convertir una partida presupuestada en movimiento real o previsto**, conservando vínculo con el presupuesto de origen.
- La conversión debe evitar duplicados y permitir: convertir una partida concreta, varias seleccionadas o todo el presupuesto cuando proceda.
- PENDIENTE FUNCIONAL — Debe existir una acción masiva para **cancelar/revertir de una sola vez** los movimientos creados desde un presupuesto/plan, sin tener que ir movimiento por movimiento.
- La cancelación masiva debe distinguir entre: movimientos aún previstos/pendientes (se pueden cancelar en bloque) y movimientos ya realizados/conciliados (no borrar silenciosamente; exigir una acción explícita y conservar trazabilidad).
- Desde el propio presupuesto debe poder verse qué movimientos fueron generados por él y aplicar «Cancelar movimientos del presupuesto» a una selección o al conjunto completo.
- La cancelación nunca debe eliminar el presupuesto ni perder su histórico: el plan conserva qué partidas se convirtieron, cuáles se cancelaron y por qué.

- Tras convertir, el movimiento pasa a los módulos normales (Hoy, Calendario, Movimientos, Tesorería, Informes) y el presupuesto conserva trazabilidad de qué partidas ya fueron asentadas.
- El diseño debe ser comprensible para usuario básico: «Planifico» primero; «lo paso a movimientos» cuando decido incorporarlo a la economía real.

### PREVISIÓN INTERCOBROS — INGRESOS HABITUALES

- PENDIENTE CRÍTICO — Recuperar en Tesorería la **previsión intercobros**. No debe limitarse a mostrar una fecha exacta de próximo cobro, porque algunos ingresos habituales (p. ej. Lyreco) pueden adelantarse o retrasarse algunos días.
- La interfaz debe responder primero a una pregunta de usuario básico: **«¿Cuánto me queda para volver a cobrar mis ingresos habituales?»**.
- Debe mostrar el tiempo restante en días hasta el siguiente ingreso habitual previsto y, cuando exista variabilidad histórica o por fin de semana/festivo, expresar una **ventana estimada** en vez de una fecha rígida.
- Debe identificar el siguiente cobro habitual **exclusivamente entre movimientos clasificados como Ingresos habituales + Ámbito Actividad económica**. No usar cualquier ingreso pendiente ni ingresos variables para fijar el horizonte intercobros. Dentro de ese conjunto, puede usar recurrencia, historial, tercero o actividad para estimar la siguiente ventana. Lyreco es el caso de validación principal.
- La tarjeta intercobros debe mostrar al menos: ingreso habitual siguiente, días restantes, importe esperado, gastos pendientes hasta esa ventana, saldo/necesidad estimada y acceso al detalle de los movimientos que componen el cálculo.
- Si ya existe un cobro habitual realizado en el ciclo actual, el horizonte debe saltar al siguiente ciclo; no contar ingresos ya cobrados como dinero futuro disponible.
- No reemplazar esta lógica por «próximo ingreso pendiente» genérico: ingresos variables como ONLOGIST/Driiveme no deben desplazar automáticamente el horizonte principal de los cobros habituales.

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
- PENDIENTE — **Inventariar y preservar las conexiones técnicas reales ya existentes entre ambos proyectos antes de modificar cualquiera de los dos.** Revisar repositorios, módulos, formatos de intercambio, identificadores, nombres de campos, endpoints/RPC/funciones, importadores/exportadores y cualquier referencia cruzada. No sustituir una conexión existente por otra nueva sin documentar la migración.
- PENDIENTE — Definir un contrato estable de integración versionado entre DOMUS y TransportERP: identificador de movimiento/documento de origen, versión del contrato, tipo de evento/registro, fecha documental, fecha de pago/cobro, tercero, cuenta, persona/titular, pagador, categoría/ámbito, actividad/proyecto, impuestos, transporte asociado y estado de conciliación cuando proceda.
- PENDIENTE — Evitar duplicados y bucles de sincronización: cada registro compartido debe conservar source_system, source_id y, cuando exista, source_version/marca de actualización. DOMUS no debe reexportar a TransportERP como nuevo algo que provino originalmente de TransportERP.
- PENDIENTE — Mantener compatibilidad hacia atrás durante cambios de esquema o UI: si TransportERP y DOMUS no se despliegan exactamente a la vez, el contrato debe tolerar una ventana de versiones sin romper importaciones existentes.
- PENDIENTE — La auditoría de interfaz de DOMUS debe comprobar también que los datos recibidos desde TransportERP se muestran y editan con el significado correcto; no basta con que la integración técnica inserte filas en Supabase.

### Disciplina de cierre

Para cualquier mejora futura registrar aquí: estado, build, commit, pantalla afectada, prueba ejecutada y resultado. Eliminar de PENDIENTE solo tras validación real en Staging. Si existe backend sin interfaz utilizable, el estado sigue siendo PENDIENTE.

## Rediseño RC1 — bloque 1 — build 30040

Base: main d5616b7; RC1 30039 preservado. Estado: IMPLEMENTADO, pendiente de comprobación autenticada del despliegue; no se declara terminado el hito completo de interfaz.

- Alta y edición comparten formulario dividido en operación, fechas/dinero, personas/cuenta, clasificación, recurrencia/notas y opciones avanzadas.
- Naturaleza Gasto/Ingreso y movimiento de dinero Pago/Cobro son controles separados; Pago/Cobro se deriva de la naturaleza para impedir combinaciones incoherentes. Estado pendiente/realizado/cancelado independiente.
- Fecha económica/documental persistida por ocurrencia en movement_occurrence_states.document_date. Fecha real editable en actual_date; requerida al guardar realizado. Fecha prevista conserva start_date/rescheduled_date y claves de ocurrencia. Botón para copiar la fecha documental a la real.
- Cambiar periodicidad conserva fechas documentales de excepciones. La fecha documental seleccionada solo afecta a la ocurrencia seleccionada; no se inventan fechas de documentos futuros.
- Informes, comparación de períodos e impresión usan fecha documental; registros previos sin document_date conservan su fecha original de ocurrencia como referencia histórica. Tesorería conserva su motor y utiliza actual_date para realizados.
- Ámbito visible para ambos tipos; no se confunde con categoría. Ingresos con factura, actividad o Lyreco/ONLOGIST bloquean ámbito doméstico/mixto. Categorías incompatibles se filtran y validan. Reglas no sugieren Doméstico/Mixto en ingresos y admiten Actividad económica.
- Migración rc1_movement_model aplicada SOLO a pmgonotpbmybtwvxbcvf: columna documental por ocurrencia; CHECK de ingresos profesionales NOT VALID para no reescribir ni reclasificar históricos. Nuevas escrituras se validan. Sin cambios de RLS/privilegios ni funciones de Tesorería; producción intacta.
- 79/79 pruebas correctas: las 74 previas más 5 de clasificación, fechas de informe, propuestas y persistencia PostgreSQL/PGlite. verify-staging.sql vuelve a completar saldo, importación, idempotencia, aislamiento, confirmación, revocación y rollback en Staging tras el cambio.
- Comprobación estática: sintaxis JS, estructura HTML del formulario, IDs únicos y git diff --check correctos.
- Navegador remoto disponible después de reiniciar el controlador. La página canónica de Staging muestra formulario de acceso; no existe sesión autenticada reutilizable en este navegador. Requiere acceso seguro para comprobar el formulario y guardar/recuperar un movimiento de prueba. No usar contraseñas/tokens en chat ni herramientas externas.
- Bloques siguientes (Configuración con ejemplos, reglas en lenguaje natural e importador guiado) siguen PENDIENTES. Conforme a la orden, comprobar este bloque en UI antes de continuar. No declarar el rediseño completo terminado.
- TransportERP localizado mediante conector: josemsaavedra-afk/TransportERP, main d5d603d12177e938d9a227d0247b5c4a86379469. Inventario disponible: bank_import_service.py, content.py, ocr.py, document_interpretation.py, economic_interpretation_service.py, settlement_service.py y reference_extractor.py. No se ha creado ningún parser nuevo ni modificado TransportERP. Lectura detallada/inventario de contratos pendiente antes del bloque de importación.

### Bloque 1 — comprobación autenticada completada

- Aplicación build 30040, commit d6b34a6b00ea59f2520e943e52d42e381e4bd7c4. GitHub Pages workflow 37958377334: build y deploy success.
- Acceso por browserAuth seguro correcto. Recarga activó el shell nuevo; sesión recuperada tras recarga.
- Creado desde UI en casa prueba: RC1 UI 30040 FECHAS · PRUEBA, 0,01 EUR, cuenta RC1 PRUEBA TESORERÍA. ID afc40416-4692-45e3-a58c-6015753cb7bd.
- Abrir Editar recupera las fechas independientes: documento 2026-09-30, prevista 2026-10-09, real 2026-10-08. Consulta SQL confirma el estado comprometido, no rollback.
- Cambiar naturaleza a Ingreso muestra Cobro y Quién cobra. Añadir referencia de factura cambia Ámbito a Actividad económica y deshabilita Doméstico/Mixto. Borrador descartado por Cancelar; el gasto original no cambia.
- En listado se detectó una etiqueta heredada Pago bajo Naturaleza. Corregida a Gasto en build 30041.

## Rediseño RC1 — bloque 2 — build 30041

- Configuración explica qué es Categoría, Ámbito, Tercero, Actividad/Proyecto, Etiqueta y Regla. Ámbitos visibles en bloque independiente; ayuda junto a cada bloque.
- Ejemplos precargados mediante RPC SECURITY INVOKER con RLS de hogar, transacción y bloqueo concurrente: seis categorías, terceros Mercadona/Vodafone/AEAT/Lyreco/ONLOGIST, dos actividades y tres etiquetas. Nunca crea movimientos ni modifica clasificación histórica.
- Marcador de inicialización por hogar: no reintroduce ejemplos después de que el usuario los edite/desactive; llamadas repetidas son idempotentes. Hogares ajenos/anon rechazados. Migración aplicada solo a pmgonotpbmybtwvxbcvf.
- Reglas muestran SI [condiciones] → [clasificación]. Nombre, condiciones principales y resultado en modo normal; prioridad, importes y otras condiciones en Opciones avanzadas. Editar y desactivar mantienen el mismo modelo y auditoría.
- Regla de protección de ingresos visible, siempre aplicada: nunca sugerir Doméstico. Se permite ámbito doméstico elegido manualmente para ingresos personales sin factura/actividad.
- Prueba PGlite de inicialización, aislamiento y conservación de edición/desactivación correcta. RPC real en Staging probada dentro de BEGIN/ROLLBACK. Advisors: ningún hallazgo nuevo; permanecen advertencias anteriores.
- 80/80 pruebas. Comprobación autenticada de Configuración y reglas pendiente después del despliegue de este bloque.

### Corrección de actualización PWA — build 30042

- Durante QA autenticada de 30041 apareció shell nuevo con rules-ui.js antiguo; una recarga llegó a recuperar shell 30040. Los ejemplos persistidos eran correctos. NO se dio por validada la pantalla de reglas.
- Service worker ahora exige manifest del build esperado y descarga cada asset con parámetro de build. Verifica SHA-256 de todos los archivos antes de escribir/activar la nueva caché. Si falta un archivo o llega otro build, conserva el worker anterior; no publica una caché mezclada. Backend/sesiones/datos nunca se cachean.
- Build 30042 sustituye a 30041 para completar la misma comprobación. Sin cambios de esquema ni de datos adicionales.

## RC1 build 30043 — importación guiada (2026-10-09)
- Build 30042 comprobada en navegador autenticado: configuración con ámbitos independientes, ejemplos persistidos y reglas SI → CLASIFICAR; editor simple con opciones técnicas plegadas.
- Extractos: cuenta → archivo → detección CSV/TSV → vista previa → mapeo editable → validación completa → revisión y guardado RC1. Separador y fila de encabezados ajustables. Errores concretos «No importado» sin modificar historial previo.
- Mismo lector compartido cliente/Edge Function; mapeo opcional compatible con clientes anteriores. SHA-256 conserva CSV original; cuenta, idempotencia, ordinales y transacciones RPC existentes no cambian.
- Inventario TransportERP en docs/DOMUS_TRANSPORTERP_INVENTORY.md: reutilizado contrato financiero neutral; sin nuevo motor profesional PDF/OCR/Excel. Este importador bancario admite CSV/TSV, no archivos Excel binarios.
- Despliegue confirmado: commit 940e26bef1c657c6ced0a158699e4e583395c3fe; Pages build y deploy success. Endpoint version.json devuelve 30043. Navegador autenticado mostró el primer paso del importador nuevo después de activar íntegramente la PWA.
- 85/85 pruebas: 74 originales + clasificación/fechas/esquema, ejemplos idempotentes, integridad de actualización PWA, mapeo de encabezados libres, TSV/cargo-abono/prefacios, errores y paridad cliente-servidor.
- Sesión web: saldo previo 1234,56 y calculado 1224,55 recuperados; extracto y revocación previos siguen visibles. El nuevo gasto ficticio de 0,01 explica el céntimo de diferencia; no se cambió saldo inicial.
- Bloqueo real de QA: al comenzar la selección de cuenta/archivo, el controlador informó retained_data_restricted tras native credential delivery, reinició el kernel y después rechazó recuperar la pestaña con “native credential state cannot be safely resumed”. Un reinicio explícito del runtime tampoco recuperó la pestaña. No se inspeccionaron credenciales ni se evitó la protección.
- Pendiente para cierre: navegador → archivo de encabezados libres → mapeo → revisión → guardado/sincronización → recuperación; repetir archivo sin duplicar; archivo con fecha inválida sin alterar historial. Son pruebas pendientes, no fallos constatados del importador. Segundo dispositivo físico no repetido en esta sesión; cobertura original preservada.
