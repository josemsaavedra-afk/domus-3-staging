# Continuidad DOMUS 3.0 y separación DOMUS 4.0

Decisión del usuario: 23/10/2026. Esta decisión prevalece sobre las propuestas anteriores que supusieran retirar del sistema en uso las capacidades transitorias de actividad económica.

## Continuidad operativa

DOMUS 3.0 continúa como aplicación en uso y puente de economía doméstica y movimientos de actividad hasta la disponibilidad de TransportERP. El plan funcional autorizado sigue vigente en Staging: lectura de tickets, alta sencilla, resultados por período, agenda, seguimiento de liquidación e importación bancaria asistida. Se conservan datos, referencias y capacidades profesionales existentes. Producción permanece fuera del alcance.

DOMUS 4.0 tendrá producto, despliegue, caché PWA y datos aislados. Una rama de código por sí sola no aísla datos. No debe compartir escrituras sobre la base de datos operativa de 3.0. El aislamiento se prepara antes de cualquier migración o publicación de 4.0.

## Límite del producto doméstico

4.0 registra ingresos familiares (nómina, pensión, aportación procedente de actividad económica y variables), gastos domésticos, compromisos y planificación del hogar. El detalle profesional, facturas, comisiones, seguros por transporte, prefinanciación y fiscalidad corresponde a TransportERP.

TransportERP proporcionará una aportación al hogar identificada por su origen y período. Una aportación y su movimiento bancario son dos evidencias de la misma operación cuando corresponda; no dos ingresos. El beneficio profesional calculado no se equipara automáticamente con dinero transferido, cobrado o disponible para la familia. No se inventará una aportación mensual a partir del beneficio.

En 3.0 ya existen cobros profesionales reales. No se añadirá sobre ellos una supuesta nómina doméstica que duplique ingresos. Debe documentarse la correspondencia antes de incorporar el nuevo contrato o migrar.

## Auditoría de producto y propuestas

Hechos comprobados en 30127: formulario corto y guardado/recarga autenticados; seis cifras de resultado mensual con detalle; retirada del disponible calculado de Inicio; navegación a documentos; hitos sin repetición del mismo cobro. No implica validación integral de OCR, CSV o móvil físico.

Propuestas para 4.0, todavía no implementadas: navegación principal Hoy/Dinero/Añadir, consultas e informes agrupados, fotografía y dictado como entradas principales, planificación sencilla de gastos variables y ahorro, avisos de suscripciones/recibos, consulta en lenguaje natural respaldada por cálculos y movimientos verificables.

Para “cuánto dinero tengo”, admitir opcionalmente saldos declarados por el usuario y fechados, mostrados como fotografía confirmada, separados del resultado del período. Si no existe saldo actualizado, indicar desconocido. No volver a generar saldos teóricos ni denominar disponible al margen mensual. Cualquier presupuesto restante debe indicar qué gastos registrados incluye y qué supuestos utiliza.

IA: interpretar y proponer; los cálculos los realiza el motor sobre datos autorizados del hogar y período. Las respuestas enlazan los movimientos que las justifican, explican límites y no escriben cambios económicos sin confirmación. Resolver antes el acceso privado a datos y los permisos; este documento no implementa ni valida un proveedor de IA.

## Traspaso futuro

1. Copia recuperable verificada y mapa de origen/destino.
2. Primera copia aislada, sin reescribir el origen; conservar identidades de procedencia y evidencia documental.
3. Clasificar qué es doméstico, profesional o mixto; lo ambiguo queda para revisión. No borrar ni reclasificar masivamente.
4. Conciliar conteos, importes por período y estado, recurrencias, reprogramaciones, cuentas/personas, vínculos documentales y cancelaciones.
5. Mientras se valida 4.0, 3.0 es la fuente de escritura operativa. Evitar ediciones simultáneas de los mismos datos en ambos sistemas y sincronización bidireccional improvisada.
6. Tras autorización del cambio definitivo, sincronizar diferencias una vez, comprobar que no hay duplicados y conservar 3.0 recuperable para consulta y reversión con procedimiento de regreso que contemple las nuevas escrituras de 4.0.

No se han creado entornos de 4.0 ni migrado datos por registrar esta decisión. Ninguna recomendación de producto de este documento debe anunciarse como funcionalidad publicada.
