# UDOC · recuperar una respuesta perdida sin volver a generar

UDOC-05/07. Candidato DOMUS 30185 sobre 30184. El intento incierto ofrece «Buscar lectura sin repetir IA» desde Documentos. La acción consulta `/v1/documents/recover` por huella, con la sesión actual; no vuelve a enviar el original al endpoint de análisis. Una respuesta encontrada se comprueba contra el original y se conserva como cualquier lectura. Ausencia, error, otra huella o cambio de ámbito mantienen el intento bloqueado; no disparan otra generación ni crean movimientos.

Servidor compartido: commit `43d0ddecc5aaa48fb219db737a69c6dd4e31a41b`, CI `43454854012`, 34 pruebas dirigidas correctas. El endpoint usa exclusivamente la identidad autenticada, consulta el intento del archivo duradero cuando existe o la caché del proceso y no invoca proveedor/presupuesto ante un fallo. La caché del proceso no sobrevive a reinicios; esta recuperación no sustituye activar el archivo duradero pendiente.

DOMUS: 290 pruebas locales aprobadas, cero fallos u omisiones. El recorrido Chromium exige analizar con respuesta cortada, recargar y recuperar desde el botón real en 390/1280 sin una segunda generación. Protocolo sintético, sin llamadas de pago, originales del usuario ni escrituras económicas reales. Antes de publicar, completar CI y verificar los hashes de Pages.
