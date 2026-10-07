# DOMUS RC1 — Tesorería Staging

2026-10-07. Estado: implementación desplegada en Staging; NO declarar SOLUCIONADA sin prueba autenticada desde la app.

- Referencia preservada: RC1 30037, commit 936ada874eed968abd901e285db2fe7d2e263cc8.
- Nueva versión: 3.0.0-rc.1.2, build 30038.
- Repositorio autorizado: josemsaavedra-afk/domus-3-staging, main, domus-3/.
- Supabase autorizado: pmgonotpbmybtwvxbcvf. No tocar producción jiwfpczmffsjpfvsrrvk.
- Último commit de aplicación desplegado: 2d0bdf92adfbbe0b8839105dc4e573120b008b59. GitHub main actualizado mediante conector tras no disponer de credenciales CLI.

## Cambios

Edge Function domus-treasury v1: valida token con Auth.getUser, actor y hogar; reutiliza validación/CSV/huellas de RC1. CORS para el origen de GitHub Pages. Claves privadas nunca en frontend.
RPC public.domus_treasury_execute (SECURITY INVOKER) delega a private.domus_treasury_execute, propiedad de domus_treasury_executor (NOLOGIN, NOSUPERUSER, NOBYPASSRLS). Conserva RLS y pertenencia al hogar. Una transacción incluye escritura y recibo idempotente; bloqueo por hogar, revisiones y errores de conflicto. Recibos no accesibles directamente a authenticated.
La migración concedió SET temporalmente al administrador postgres para asignar el propietario; lo restauró a false. No se concedió el rol técnico al navegador.
Frontend conectado exclusivamente a Staging: saldos, extractos, confirmaciones y revocaciones en cola local, estado Sincronizado solo tras respuesta del servidor. Lectura automática recupera saldos para el cálculo y muestra líneas de extractos e historial.

## Evidencia

- npm test en este repositorio: 74/74 correctos, 0 fallos. Incluye motor, CSV, revisión, cola, cambios de usuario, transporte y RPC PostgreSQL en memoria.
- RPC en memoria: recibos idénticos al repetir; conflictos por clave/revisión; rollback completo de importación inválida; hogares/usuarios ajenos y anon bloqueados; revocación conserva autor/fecha original; authenticated no accede a recibos privados.
- backend/verify-staging.sql ejecutado satisfactoriamente en Supabase Staging: saldo, importación, lectura, confirmación, revocación, idempotencia y aislamiento. Datos ficticios y ROLLBACK completo. Simula contexto de Auth para probar SQL; NO demuestra una sesión web real ni conservación entre sesiones.
- Pruebas heredadas de desarrollo: 33 pruebas de runtime/persistencia/motor/contexto y 51 pruebas SQL/RLS/servidor correctas. La versión de desarrollo es antigua; nunca se usó como frontend de despliegue.
- Advisors: ningún nuevo hallazgo de Tesorería. Advertencias previas de create_household/join_household y protección de contraseñas, ajenas a esta corrección.

- HTTP real Edge Function: OPTIONS 204 con CORS correcto; POST sin token 401. POST autenticado probado desde la app: saldo guardado y recuperado correctamente.
- Despliegue frontend confirmado: https://josemsaavedra-afk.github.io/domus-3-staging/domus-3/version.json devuelve 3.0.0-rc.1.2 build 30038.

## Verificación autenticada — 2026-10-07, segundo intento

- Acceso correcto mediante formulario seguro tras corregir contraseña. Hogar de Staging: casa prueba.
- PWA: primera pestaña mostraba 30037; recarga actualizó a 30038, confirmado en Configuración y con interfaz persistente activa.
- Creada cuenta ficticia RC1 PRUEBA TESORERÍA: 4c85b46f-3296-4012-add0-104143c8a299. Hogar a5c95017-2910-4819-b9d0-9dd8b0f9b23a.
- Saldo ficticio 1234.56 EUR del 2026-10-01: encolar mostró Pendiente de sincronización, enviar mostró Sincronizando y solo después de respuesta mostró Sincronizado. Consultar historial recuperó 1 saldo. Lectura SQL posterior confirma un checkpoint comprometido; no fue rollback.
- Saldo calculado visible recuperado: 1234,56 EUR. Lectura autenticada real y guardado HTTP real verificados.
- Movimiento ficticio RC1 PRUEBA CONCILIACIÓN, 10 EUR, 2026-10-07, estado done: 3ff14509-2754-44cf-b6c1-d9542dd68904. Guardado UI y comprobación SQL correctos.
- CSV de prueba creado: fecha 2026-10-07, concepto RC1 PRUEBA CONCILIACIÓN, importe -10.00. Todavía NO importado desde la app.

## Bloqueo actual y pendientes

El runtime de navegador de Work dejó de permitir observación al preparar el CSV. Error literal: “Browser observation is unavailable because native credential state cannot be safely resumed. Start a new browser runtime to continue.” El restablecimiento del REPL y la creación de una pestaña nueva no resolvieron el bloqueo. No es un rechazo de contraseña ni un error de Tesorería. No inspeccionar ni reconstruir credenciales, tokens o cookies. No sustituir la prueba de UI por acceso a su sesión mediante herramientas externas.

Pendientes: importación CSV por UI, confirmación y revocación por UI, duplicados/conflictos por UI, cerrar sesión/volver a entrar, nuevo contexto/dispositivo, regresión de RC1 autenticado. Aislamiento, conflictos, importación y revocación ya probados en tests SQL/PGlite; falta completar el recorrido del navegador.

Siguiente acción concreta: iniciar un runtime de navegador de Work nuevo, recuperar este documento de main, abrir Staging y autenticar de forma segura si hiciera falta. Continuar con el movimiento y cuenta ficticios ya identificados; no recrearlos ni duplicar el saldo. Recrear el CSV si scratch no conserva el archivo. Cargar extracto, sincronizar, consultar historial, volver a seleccionarlo para revisión con bases remotas y confirmar/revocar. No declarar SOLUCIONADA mientras haya criterios pendientes.
