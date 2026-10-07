# DOMUS RC1 — Tesorería Staging

2026-10-07. Estado: implementación desplegada en Staging; NO declarar SOLUCIONADA sin prueba autenticada desde la app.

- Referencia preservada: RC1 30037, commit 936ada874eed968abd901e285db2fe7d2e263cc8.
- Nueva versión: 3.0.0-rc.1.3, build 30039.
- Repositorio autorizado: josemsaavedra-afk/domus-3-staging, main, domus-3/.
- Supabase autorizado: pmgonotpbmybtwvxbcvf. No tocar producción jiwfpczmffsjpfvsrrvk.
- Último commit de aplicación desplegado: 84f869c06399847dfad288ff39fc413bd9c9e6c3. GitHub main actualizado mediante conector tras no disponer de credenciales CLI.

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

## Continuación verificada — 2026-10-07

- Recuperado main del repositorio antes de continuar; no se recreó cuenta ni saldo.
- CSV rc1-treasury-test.csv importado desde el control visible de la app. Una línea: 2026-10-07, RC1 PRUEBA CONCILIACIÓN, -10.00 EUR. Estado Pendiente → Sincronizando → Sincronizado. Historial remoto: 1 saldo, 1 extracto, 0 conciliaciones.
- Coincidencia revisada y confirmada por UI; guardada mediante cola y HTTP real. Historial: 1 conciliación confirmada.
- Revocación desde UI con motivo “Prueba RC1: revocación con trazabilidad”; sincronizada y recuperada con estado Revocada. Confirmación original conserva autor/fecha: 2026-10-07T19:46:45.271831+00:00. Revocación: 2026-10-07T19:47:30.98464+00:00. Autor en ambos: 7338a6e5-e131-4c62-a0f2-adb53cd034cf.
- Recarga completa recuperó saldo 1234.56 del 2026-10-01, extracto y revocación. Saldo calculado 1224.56 (movimiento realizado -10).
- Reimportación del mismo CSV y sincronización: continúa habiendo un único extracto; no duplicados.
- Cerrar sesión por UI dejó el formulario de acceso. Reentrada por browserAuth seguro verificada. Historial completo recuperado tras reentrada.
- Segunda pestaña/instancia de la app recuperó el mismo historial por backend. Comparte perfil del navegador; NO equivale a un segundo dispositivo físico ni perfil limpio.
- Smoke RC1: listado Todos muestra movimiento realizado de 10 EUR; calendario octubre muestra pagos 10 EUR; informes, documentos y configuración cargan. No se afirma auditoría completa de todas las funciones.
- Correcciones de presentación desplegadas en build 30039: resumen de revisión deja de afirmar “Nada ha sido guardado”; historial muestra autor, fecha original, fecha de revocación y motivo.
- npm test después del cambio: 74/74 correctos. HTTP version.json y Configuración autenticada confirman 3.0.0-rc.1.3 / 30039. PWA precisó segunda recarga para activar el nuevo shell.
- Evidencia visual capturada del historial tras reentrada: rc1-30039-treasury-verified.jpg.

## Pendientes y límite concreto

1. Conflicto concurrente por UI y segundo hogar por UI. Ya cubiertos en SQL/PGlite, pero aún no se ha completado esa comprobación de navegador.
2. Segundo dispositivo o perfil independiente: todavía no probado.
3. No declarar cierre completo de todos los criterios hasta resolver esos pendientes.

Al preparar el segundo CSV para conflicto concurrente, filechooser falló tras el acceso seguro con BrowserCredentialRecoveryError / retained_data_restricted. Navegación explícita al documento canónico recuperó la lectura y navegación UI, pero filechooser volvió a fallar. No es un error de importación de DOMUS: el archivo de conflicto NO se ha cargado. No inspeccionar ni reconstruir credenciales/tokens/cookies, ni ejecutar la sesión desde herramientas externas.

Siguiente acción: en un runtime de navegador capaz de cargar archivos (o mediante control manual del selector), importar CSV ficticio de conflicto en esta misma cuenta, capturar base de confirmación, modificar el movimiento desde otra instancia antes de sincronizar y verificar conflicto conservado. El CSV temporal preparado contiene 2026-10-07, RC1 PRUEBA CONCILIACIÓN CONFLICTO, -10.00 EUR; puede recrearse. No duplicar la cuenta/saldo ya existentes. Validar además perfil/dispositivo independiente y aislamiento por UI.
