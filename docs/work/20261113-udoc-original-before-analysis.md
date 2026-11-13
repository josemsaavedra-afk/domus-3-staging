# UDOC · original antes de interpretar y recuperación sin segunda consulta

Requisitos UDOC-05/06/07. Candidato DOMUS 30184, sobre main aa4949364ca063d2368269b73bff5ee070cae031.

El lector confirma primero la copia privada del original y su huella. Una identidad estable por hogar y contenido permite recuperar un alta cuya confirmación se perdió. No reemplaza archivos ni llama al proveedor cuando la conservación no está confirmada. Un intento se registra por versión antes de enviar el archivo; un resultado incierto no autoriza otra generación automática.

La respuesta se conserva antes de presentar la revisión. Si no se confirma su copia en la nube, se intenta conservar una copia local vinculada al usuario, hogar y original. La interfaz informa si tampoco puede conservarla localmente. Documentos ofrece recuperar la lectura guardada sin llamar al proveedor; una revisión abierta no sobrescribe otra posterior. La lectura por sí sola no registra movimientos.

Validación local: `npm test`, 288 pruebas aprobadas, cero fallos u omisiones. Seis pruebas nuevas ejecutan el controlador real con DOM y backend de protocolo: archivo previo, fallo de archivo, respuesta local pendiente, recuperación sin caché, intento incierto y revisión concurrente. El recorrido de `scripts/test-udoc-review.mjs` incluye recarga y recuperación desde Documentos, móvil y escritorio; requiere CI Chromium antes de integrar.

Alcance: pruebas con datos y respuestas sintéticos. No acreditan precisión de OpenAI, Safari físico ni una escritura autenticada real contra Storage. No se han subido originales del usuario, modificado movimientos reales ni realizado llamadas de pago. El archivo remoto privado del servidor compartido y la aceptación desde TransportERP siguen pendientes; esta integración DOMUS no los sustituye.
