# Importación ChatGPT → Planes

Preparación **sin despliegue ni escritura en datos de usuario** sobre rama derivada de `work/udoc-ai-review-30165`.

La fixture representa presupuesto 120000 céntimos, gasto previsto 117749, margen 2251. Estados: `reserved` no equivale a `paid`; `planned` y `estimate` tampoco. Importación futura idempotente por `external_id` y por `items[].id`, con previsualización y confirmación explícita. No generar movimientos reales al importar; enlazar los pagos reales durante conciliación, sin duplicados.

**Pendiente:** localizar código exacto de la pestaña Planes, determinar modelo de datos y fuente efectiva del despliegue 30163, implementar adaptador y pruebas antes de cualquier fusión. La rama 30165 no está verificada como desplegada.
