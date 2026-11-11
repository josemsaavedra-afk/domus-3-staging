# D05 · Extracto: vista previa perdida al actualizar Dinero

11/11/2026. Referencia consultada: docs/REGISTRO-MAESTRO.md de TransportERP, rama erp05/integracion-lyreco. Destino revisado: josemsaavedra-afk/domus-3-staging, main 35c1640, build público comunicado por el usuario 30177.

El vídeo muestra la lectura correcta de 108 filas y la desaparición posterior de la vista previa. El estado previo a «Validar y preparar revisión» vivía únicamente en el DOM: renderTreasury3 reemplazaba el contenido, sin conservar cuenta, formato ni archivo, y solo abría el panel cuando ya existía activeReviewKey. La sincronización podía reconstruirlo antes de ese paso.

Corrección candidata 30178 / 3.0.0-rc.1.134: conservar el borrador en memoria por sesión, restaurar cuenta/columnas/separador/cabecera y panel, volver a enlazar los manejadores sobre cada render, aceptar lecturas pendientes tras un refresco de la misma sesión y descartarlas al cambiar cuenta/usuario/hogar. La revisión calcula coincidencias sobre los datos vigentes tras la huella asíncrona. Sin movimientos, originales, CSV personales ni IA enviados.

Validación local: 238/238 pruebas correctas incluida regresión de interfaz con JSDOM. El código anterior falla en la nueva regresión al perder la cuenta tras un refresco. Integridad PWA verificada por la suite. Chromium local no inicia por restricción socket(); queda preparada regresión de navegador en scripts/test-statement-preview.mjs y su ejecución en CI. No se afirma aceptación visual ni publicación.

Envío de la rama bloqueado dos veces por revisión automática: primero atribuyó el repositorio a privado y pruebas fallidas; se verificaron visibilidad pública y 238 pruebas finales correctas. Segundo rechazo exige autorización explícita para publicar en ese destino. No se elude mediante otra herramienta. Siguiente paso: autorización del usuario para enviar esta corrección a josemsaavedra-afk/domus-3-staging y desplegarla; después ejecutar CI de Chromium, integrar con HEAD comprobado, verificar la publicación y actualizar el registro maestro remoto con la evidencia final.
