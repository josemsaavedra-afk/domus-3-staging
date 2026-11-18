# Corrección de alta en revisión privada

18/11/2026. La captura del propietario muestra Database error saving new user. Logs correlacionados de Auth y Postgres a las 14:02:48 UTC confirman SQLSTATE 42501 del control privado de altas. No era un error de contraseña ni una cuenta necesaria en el proveedor técnico.

Se comprobó que el correo elegido por el propietario no figuraba en la lista privada y se añadió de forma idempotente solo a esa lista del proyecto dedicado. Se conservan los correos autorizados previamente, el trigger, Auth y RLS. Ninguna apertura al público. No se guardan aquí correos, identificadores personales ni credenciales.

Validación del trigger real: inserción con correo autorizado en subtransacción revertida; correo ajeno rechazado con insufficient_privilege; verificación posterior correo permitido=true, ajeno denegado=true y usuarios Auth persistidos=0. Sin llamada signup HTTP, contraseña establecida por el asistente, envío de correos, sesión inventada, datos domésticos ni recursos nuevos. Prueba de control de base de datos, no prueba de confirmación de correo/entrada real.

Siguiente paso de uso: completar el registro normal con el correo elegido y la contraseña del propietario. La autorización ya está corregida en servidor; no necesita nueva publicación web. La revisión de hogar, documentos y movimientos sigue pendiente.
