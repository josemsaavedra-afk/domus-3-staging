# DOMUS 30159 — estado de integración UDOC

## Comprobaciones verificadas (03/11/2026)

- Workflow «DOMUS 30159 UDOC safe integration», ejecución 41699545116: **success**.
- Workflow «DOMUS tests», ejecución 41699545090: **failure**.
- Pruebas generales: **211 aprobadas, 1 fallida**.
- Fallo: `test/pwa-update.test.mjs`, «PWA installs a complete, verified build before activation».
- Causa confirmada en log: `Archivo de otro build: index.html`. Se modificó el HTML, pero el SHA-256 de `index.html` en `domus-3/asset-manifest.js` sigue perteneciendo a la compilación anterior.

## Condición de publicación

No fusionar ni desplegar esta rama como build 30159. Para la siguiente versión:
1. Asignar un identificador **nuevo** posterior al 30159, una vez comprobado el último build publicado.
2. Actualizar coherentemente `version.json`, `index.html`, `sw.js` y `asset-manifest.js`.
3. Regenerar los hashes SHA-256 **a partir de los archivos finales**; no desactivar la verificación.
4. Ejecutar toda la suite y probar importación de archivos repetidos en iPhone.
5. Mantener los movimientos reales intactos hasta la validación de la revisión documental.

## Limitación funcional

La detección SHA-256 exacta opera únicamente dentro del lote de importación actual. Los registros históricos no tienen un hash de contenido verificado en esta implementación; las coincidencias de nombre y tamaño son avisos, no pruebas de igualdad.

## Revisión build 30160

- Build 30160 generado en commit `8988542fbf7210cc29ca4fd7e415fe7c1da1980a` por GitHub Actions, con hashes regenerados.
- Las ejecuciones del commit de bot 41701172544 y 41701172546 quedaron en `action_required` sin jobs; **no equivalen a éxito**.
- Este cambio documental dispara una nueva ejecución de pruebas desde un commit ordinario de la rama, sin despliegue.
