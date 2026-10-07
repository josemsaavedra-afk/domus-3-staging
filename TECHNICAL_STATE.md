# DOMUS RC1 — Tesorería Staging

2026-10-07. Estado: implementación desplegable; NO declarar SOLUCIONADA sin prueba autenticada desde la app.

- Referencia preservada: RC1 30037, commit 936ada874eed968abd901e285db2fe7d2e263cc8.
- Nueva versión: 3.0.0-rc.1.2, build 30038.
- Repositorio autorizado: josemsaavedra-afk/domus-3-staging, main, domus-3/.
- Supabase autorizado: pmgonotpbmybtwvxbcvf. No tocar producción ji wfpczmffsjpfvsrrvk (identificador real sin espacio: jiwfpczmffsjpfvsrrvk).
- Último commit de aplicación desplegado: pendiente de publicación; actualizar tras push.

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

## Pendiente obligatorio

1. Iniciar sesión de prueba en el navegador de verificación: ahora muestra formulario de acceso, sin sesión autenticada.
2. Desde un hogar SOLO de pruebas: guardar saldo, importar CSV, confirmar/revocar y comprobar recibos, duplicados/conflictos y otro hogar.
3. Cerrar sesión/volver a entrar; recargar; segundo contexto/dispositivo. Verificar datos realmente comprometidos por HTTP y recuperados.
4. Confirmar build 30038 en Pages y caché PWA actualizada.
5. Verificar funcionalidades RC1 en la app autenticada sin regresiones.

Siguiente acción concreta: autenticar una cuenta de Staging por el formulario seguro y ejecutar la secuencia del punto 2. No pedir secretos en el chat. No fabricar tokens ni desactivar Auth/RLS. No afirmar SOLUCIONADA mientras estos puntos sigan pendientes.
