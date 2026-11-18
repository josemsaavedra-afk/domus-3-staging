# UDOC U01/U04/U05 — DOMUS: cancelación de una lectura pendiente

Base DOMUS 79749ee0fa2e0835f8e8ae879c078deb29d1163e (PR10ya fusionada; no reabrir su rama histórica). Corte ERP 05ec61f6e1327ea6ab8245cabe9a809577daac8f, común b3efef28ca8311bf6ae2b82331079bae6f9ac6df. La rama de este cambio es work/udoc-review-context-20261118. No publicación: versión/build30185conservados como base, no se atribuye el parche a los bytes públicos. Manifiesto actualiza solo hash de index para coherencia de fuente; siguiente hito de publicación deberá identificar su propia versión.

## Reproducción y corrección

5de6casos iniciales fallaban: cambio de hogar/usuario/archivo durante la huella final dejaba campos anteriores; cerrar durante esa huella reabría la revisión; finalización antigua sustituía una sesión nueva. El control de lectura conservada válida pasaba. Se usa también un caso nuevo de cambio de hogar durante JSON de recover.

La lectura exige el mismo objeto de sesión después de fetch/JSON y tras calcular huella final, además del usuario/hogar/archivo. La denegación de contexto cierra y limpia solo la revisión que aún le pertenece, sin tocar una nueva. Guardar permanece deshabilitado al iniciar/cerrar/invalidar. Cierre explícito no se revierte por una promesa tardía. No se cambia motor, proveedor, economía, ámbito DOMUS/ERP, lectura de archivos o conservación de intentos inciertos.

43IDs locales correctos,7nuevos+36regresión,0fallos/omisiones finales. NodeVM/JSDOM con datos de protocolo; reproducción de5fallos antes del arreglo. Una aserción entre realms se normalizó con Array.from antes del pase final, no fallo del producto. [Recibo](../evidence/2026-11-18-13-domus-udoc-context.json). Regresiones incluyen fuentes retenidas, recuperación sin nueva generación y guardado CAS; los movimientos/series creados por fixtures son sintéticos.

No navegador nativo, IA real, documentos del propietario, precisión de lectura, iPhone/Windows/EXE o aceptación final.0API de pago/ledger o economía real/recursos/despliegue. Commit con [skip ci]; no se solicita Actions y se comprobará ausencia de runs nuevos. Pages solo se despliega desde main y esta rama no lo modifica.

## Reanudación

Revisar PR y diff frente al HEAD fresco antes de integrar bajo autorización vigente; no modificar main ni publicar en esta ejecución. Confirmar el parche en el próximo hito de staging autorizado con build identificado, no crear otra publicación menor. Hito15continúa abierto por autoridad empresarial accesible, sesión efectiva y lectura/aceptación real. Recuperar respuestas/Bundle solo por ese circuito, sin API nueva ni búsqueda repetida de originales. No atribuir actividad actual a Cline.
