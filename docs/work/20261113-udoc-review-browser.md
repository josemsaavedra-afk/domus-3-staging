# UDOC · cierre del recorrido de revisión · 13/11/2026

Requisitos U01/U02/U04/U05 y UDOC-05/06. Prioridad del usuario: cerrar lo previsto para el primer hito, dejando DOMUS funcional mientras se completa el lector compartido.

Se continúa PR #14 sobre 4f4e47fa, sin duplicar su rama ni reemplazar las mejoras de conciliación/reglas/informes de main 30182. En la inspección de pantalla real aparecen dos bloqueos que los fixtures anteriores no detectaban: falta el botón `udocReviewSaveBtn` referenciado por el código, y una factura válida revisada conserva `review_required=true`, que la bloquea como si fuera una liquidación ambigua. Se restaura el botón y se habilita únicamente la propuesta simple validada, pendiente de la acción explícita Crear movimiento. INVALID_PROPOSAL y clases que no son facturas simples no obtienen una propuesta económica.

Aceptación técnica nueva: pantalla y handlers reales de selección/revisión/guardado/creación/confirmación/archivo; backend de protocolo aislado y sintético. Corregir importe, guardar con fila confirmada y versión, confirmar exactamente una vez, recargar, abrir desde Archivo de referencias sin petición IA, conservar historial/huella y resolver nombre cambiado por SHA. Conflicto de versión y cambio de hogar no crean ni reenvían una mutación. Chromium a 390 y 1280. Preflight DOM ejecuta el renderer y guardado reales antes del navegador.

Los 279 tests locales de la candidata pasan; el workflow ejecuta también el navegador. No es aceptación de precisión de OpenAI ni de Safari físico. No se han enviado originales, usado sesiones reales, llamado al proveedor ni creado movimientos del usuario.

Comprobación remota de sólo lectura: Render tiene un despliegue live 52e32545, servicio Free y autoDeploy off; /healthz confirmó modo openai. Storage DOMUS tiene el bucket privado household-documents, 9 objetos/606447 bytes al corte. No existe todavía el bucket dedicado del adaptador de archivo de servicio. Esta medición no acredita la cuota/egreso global ni el saldo del límite acumulado de IA. Las tablas de aplicación no contienen un ledger llamado UDOC; se continúa buscando el presupuesto remoto vigente sin reinicializarlo.
