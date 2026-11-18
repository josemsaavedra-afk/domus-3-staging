# DOMUS Familias — continuidad del tutor y ayuda práctica
Corte: 18/11/2026, ejecución Work horaria. Prioridad del propietario: beta privada de familias antes de UDOC/ERP. No es informe diario.

## Base y coordinación
- Rama domus-4-beta-familias-20261118, base revisada f70f1c790895c5525ae35820d8d329d910cb8d17.
- main observado: 79749ee0fa2e0835f8e8ae879c078deb29d1163e; sin modificaciones.
- Se conservan alta genérica, bloqueo de configuración no dedicada y fixture autenticado de los commits anteriores. No se duplica aprovisionamiento.
- CI previa de f70: run 44307275835 correcta; no acredita estos cambios ni aceptación real.
- Proyecto dedicado de familias observado ACTIVE_HEALTHY y 27 tablas públicas con RLS y cero filas. Inventario de lectura, no prueba de aislamiento Auth/Storage. No se crean recursos, usuarios ni invitaciones.

## Implementado en esta ejecución
- El tutor recuerda el paso pendiente por usuario y hogar en este dispositivo. Conserva el formato anterior de recorrido terminado y tolera datos locales dañados. Copia el contexto para impedir que su mutación cambie la clave.
- Ayuda ordenada y práctica en ocho pantallas y en reglas/compartir. Explica previsión frente a realizado, revisión documental y evitar duplicados.
- Ejemplo doméstico de regla por supermercado/Alimentación, también en el editor existente. Ningún cambio al motor de reglas ni al lector.
- Hashes de tres recursos actualizados en asset-manifest.js; build 40000 conservado.

## Pruebas y límites
Comando local: `node --test --test-reporter=tap test/family-beta.test.mjs test/family-help-continuity.test.mjs`.
Resultado final: 8 ejecutadas, 8 aprobadas, 0 fallidas, 0 omitidas: 5 nuevas de continuidad/ayuda y 3 de regresión existentes.
Primer intento: 7/8; la aserción de foco falló porque el doble de navegación no mostraba Ajustes. Se corrigió el fixture para mostrar la vista real y se repitió el conjunto tras esa corrección. No se cuenta la repetición como nuevas pruebas.
Categorías: JSDOM y PostgreSQL embebido local; no navegador ejecutado en este bloque, EXE, iPhone físico, despliegue ni Auth/Storage real. No se afirma aceptación beta ni precisión del lector.
Sin lecturas IA, movimientos reales, publicación, invitaciones ni nuevas ejecuciones Actions solicitadas. Commit con [skip ci].
La matriz histórica 26/40 no se recalcula con estos tests. No hay denominador de entrega beta auditado ni porcentaje nuevo.

## Pendientes y siguiente acción ejecutable
Verificar políticas y almacenamiento del proyecto dedicado con dos ámbitos autorizados, Auth cerrado y revocación, sin datos personales. Revisar cambios remotos de aprovisionamiento antes de escribir. Después preparar origen privado usando recursos existentes y entregar URL solo tras comprobar acceso exclusivo del propietario. Actualmente no hay URL privada verificada por esta ejecución.
Invitaciones siguen deshabilitadas y requieren revisión del propietario antes de terceros. DOMUS3/producción permanecen intactos.
