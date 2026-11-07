# UDOC: aceptación real y activación de DOMUS — 2026-11-07

Estado: recorrido archivo → IA real → revisión editable verificado con el código de este PR, navegador Chromium móvil y autenticación real Supabase en dos hogares aislados. Todavía no implica cierre de UDOC ni de TransportERP.

## Evidencia
- Backend Render Free: commit a42d855ce0a7686b4a25fc3305e263752aac3b26, deployment dep-dbnmbr49v7es73d5qnh0, estado live, /healthz mode=openai.
- Modelo único GPT-5.4, snapshot gpt-5.4-2026-03-05; original PDF real de 11 páginas. HTTP 200, NEEDS_REVIEW, 26 campos editables; total 13,34 € y seis referencias relacionadas. El resumen y sus anexos se mantienen diferenciados. El tipo raíz sigue por confirmar: no se presenta como una factura nueva automática.
- Primer análisis real: 13.861 tokens de entrada y 2.313 de salida. Tarifa nominal aproximada de esa generación: 0,06935 USD; no es una factura de uso ni un porcentaje de precisión.
- Repetición del mismo original/hogar sin nueva reserva en el proceso actual: una reserva de 575.665 microEUR. La caché actual es de proceso: no se promete lectura gratuita tras reiniciar el servidor.
- Control acumulado durable en Supabase: 5.000.000 microEUR; reserva previa conservadora 200.000 microEUR tras cotejar captura de uso ($0,07 / 14 solicitudes / 37.204 tokens). Reservas fallidas o inciertas no se liberan. Sin recargas ni alojamiento de pago.
- Prueba real de RLS: A ve su hogar y no B; B ve su hogar y no A. El backend obtiene el hogar de la sesión verificada, no de una cabecera elegida por el cliente.
- El navegador de verificación sirvió los recursos del PR bajo el origen de Pages y trasladó las solicitudes HTTP a los servidores reales desde el entorno de pruebas. No se simuló la respuesta de IA. No equivale a una comprobación física en Safari/iPhone.
- No se guardaron movimientos económicos durante la aceptación. Se conserva el archivo original del usuario. Los datos de cuenta y documentos no se publican en el repositorio.
- Cuatro comprobaciones de contrato de interfaz y todos los hashes del manifiesto correctos.

## Disponibilidad
Se activa udocReview en config.js para el servidor común. Build 30165. Enlace previsto: https://josemsaavedra-afk.github.io/domus-3-staging/domus-3/ . La publicación se comprueba tras integrar; no anticipar que Pages ya lo sirve.

## Pendientes concretos
La pantalla permite leer y corregir; aún no transfiere los cambios revisados al guardado de movimientos ni archiva una propuesta durable. Quedan aceptación real de Driiveme multipágina/reembolso, documento escaneado de dos páginas, contexto de actividad y segunda aplicación con autorización por empresa. No declarar universalidad ni porcentaje de acierto con un único caso. El tiempo máximo actual de worker (45 s) limita documentos complejos y requiere resolverlo antes de generalizar cargas extensas. La verificación de precios caduca el 14/11/2026 y bloquea el proveedor si no se renueva.
