# DOMUS Familias — ayuda publicada y errores de acceso comprensibles
18/11/2026, corte posterior a la corrección de alta. Bloque Work, no informe diario.

## Revisión previa
ERP integración 4db635cbf01540b7d2c0f445d1404b1ec0e8c54c; PR2 abierto/borrador y mismo HEAD; main observado 95cb4f49e88de69ac73bc1013fcc598d003c5b0e; seguridad 758a544bca6f490d7eb3eb80216bf7c5d2617754. Integración 556 commits por delante de main y 338 por delante de seguridad; comparación por nombre con barra rechazada por conector y resuelta por SHA. No se modifica main, Windows ni Cline.
DOMUS beta base 91b42d070f4396a5bfb0143c1df12d0345f6207b. Leídos AGENTS, maestro, estado, cola, referencia UDOC y programa. La orden posterior da prioridad a Familias.
Sites existente appgprj_6afda3e881088191b6123cfeb9a25a8e, versión2, fuente 748b179ee391e998b35c2f948598f7457ef51934, acceso custom solo propietario sin grupos. No se crea otro sitio.

## Cambios
Se incorporan al paquete web las tres mejoras de tutor/ayuda y ejemplo doméstico de reglas que ya estaban en la rama: continuación por usuario y hogar, instrucciones ordenadas y reglas por supermercado/Alimentación. No se cuentan como nuevas funcionalidades de esta hora: ahora se integran para publicación.
El formulario muestra mensajes en español para alta rechazada, credenciales incorrectas, correo sin confirmar, límite de intentos y conexión. No presenta detalles internos desconocidos. Mantiene formulario utilizable tras fallo y no reintenta automáticamente.
Se conserva la configuración del backend dedicado, la entrada y recuperación publicadas, la lista privada de altas y las restricciones del sitio. Ningún correo del propietario en evidencia ni tests. No se prueba su contraseña ni se envían correos.

## Validación
Comando local: node --test test/access-copy.mjs test/access-failures.mjs test/family-help-continuity.test.mjs.
12 casos ejecutados/aprobados, 0 fallidos, 0 omitidos: 4 nuevos de fallos de acceso y 8 de regresión ya existentes. Sin sumar ejecuciones repetidas al acumulado. JSDOM sobre HTML y controles del paquete real, proveedor de Auth simulado. No acredita registro HTTP, entrega de correo, entrada con contraseña real, iPhone físico, precisión documental ni aceptación integral.
Sintaxis del tutor y git diff --check correctos; hashes de cuatro recursos actualizados. Sin nuevas Actions solicitadas ni IA.
URL existente: https://domus-4-beta-familias.earnesteave8.chatgpt.site . Confirmar estado terminal del despliegue de este cambio antes de declararlo publicado. Invitaciones cerradas. Matriz26/40 histórica conservada, sin porcentaje nuevo por tests.

## Siguiente paso
Verificar aislamiento y operaciones del backend dedicado con pruebas controladas revertidas y sin datos del propietario; continuar aceptación del hogar, cuentas, agenda y movimientos. No dar la beta completa por la publicación de ayuda. Mantener sincronizadas rama y fuente Sites, conservando config beta operativa frente al config cerrado del repositorio.


## Publicación comprobada de este bloque
Fuente Sites cb09ca7dafc442270459613323a568ff31edd337; deployment appgdep_6afdb4a9257c8191aa225c8e4089c911, estado succeeded el 18/11/2026 a las 14:22:38 UTC. Versión guardada appgprj_6afda3e881088191b6123cfeb9a25a8e~appgver_3df82482b9088191a8f0627aeedb74fa. Misma URL privada, sin cambiar audiencia. Esto acredita publicación de ayuda y mensajes, no entrada autenticada ni aceptación funcional completa.
