# DOMUS #28 — eliminación protegida recuperada · 17/11/2026

Base contrastada: 79749ee0fa2e0835f8e8ae879c078deb29d1163e. Trabajo implementado y probado localmente el 16/11; guardado tras interrupción el 17/11, sin repetir esas pruebas. No es entrega ni despliegue.

La pantalla Configuración ofrece Eliminar separado de Desactivar/Reactivar en los siete catálogos, activos e inactivos. El servidor revisa pertenencia al hogar, versión y referencias FK/JSON antes de eliminar un registro sin uso. Impide perder vínculos ON DELETE SET NULL. Repite la validación dentro de la transacción; no hay fallback DELETE de navegador, cola offline ni reintentos. Tiempo limitado y mensajes distinguen resultado incierto de eliminación confirmada con refresco fallido.

La migración usa un ejecutor NOLOGIN/NOBYPASSRLS que hereda authenticated; el cliente no hereda sus permisos. RLS permanece activa. La función pública es SECURITY INVOKER; la función privada estrecha es SECURITY DEFINER del ejecutor. Revoca DELETE directo de navegador en todos los catálogos; no concede UPDATE de tablas operativas al navegador. Los bloqueos SHARE de tablas JSON son conservadores y deben revisarse por concurrencia/carga. La migración se generó con Supabase CLI, pero NO se ha aplicado al staging remoto.

Evidencia: [26 casos locales](../evidence/2026-11-17-master-deletion-preparation.json), 11 SQL/PGlite + 11 UI/VM/jsdom + 4 PWA; 22 nuevos y 4 regresión, sin duplicar reejecuciones. Huellas de los archivos conservadas. No acepta políticas reales, sesión Supabase, iPhone ni recorrido físico. No se han leído/escrito movimientos originales.

## Pendientes y orden de reanudación

1. Revisión SQL con catálogo y políticas actuales, prueba multisesión PostgreSQL para FK/JSON y revocación concurrente. No adoptar el rol si ya existe; inspeccionarlo.
2. Completar propuesta/reasignación controlada para referencias históricas, con autorización explícita y trazabilidad; este bloque NO la implementa ni modifica documentos.
3. Aplicar migración únicamente en staging tras esa revisión, fixture autenticado desechable sin datos reales; crear/desactivar/eliminar/recargar y comprobar denegaciones.
4. Solo después publicar build propuesta 30186 / rc.1.142 y verificar hashes/Pages. Reservar aceptación iPhone; no cerrar #28 antes de evidencia real.

Build 30186 es solo candidata en rama. Main permanece 79749ee0 y la última versión pública comprobada anteriormente es 30185. No se solicita al usuario ninguna operación intermedia.
