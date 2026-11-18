# DOMUS 4.0 BETA FAMILIAS — PLAN DE ENTREGA
Fecha 2026-11-18. Rama domus-4-beta-familias-20261118.
**No publicar ni invitar a terceros sin aprobación del propietario.**
## Bloqueadores de seguridad
1. Confirmar que autenticación, base de datos y almacenamiento de la beta son distintos de producción; no reutilizar claves de servicio.
2. Confirmar que ninguna regla, movimiento, persona, cuenta, documento o dato personal del hogar propietario se sirve a usuarios beta.
3. Probar aislamiento real entre dos hogares y permisos por usuario.
4. Mantener DOMUS 3.0 existente intacto.
## Alcance mínimo
- Alta de hogar y usuarios; datos iniciales genéricos, sin reglas personales.
- Movimientos, cuentas, categorías, presupuestos, previsiones, conciliación e informes funcionales.
- Reglas transparentes: lista, condiciones, acciones, prioridades, activar/desactivar y prueba previa.
- Tutor contextual '?' en todas las pantallas y recorrido de primer uso.
- Documentos con propuesta editable; advertir y registrar fallos de extracción.
- Experiencia iPhone probada.
## Puerta de revisión
Entregar al propietario URL de entorno separado, usuario de prueba, lista de funciones verificadas y defectos conocidos. Solo después de su aprobación se habilitan invitaciones a otras familias.
## Estado
Rama creada. Arquitectura de aislamiento, implementación, pruebas, despliegue y entrega aún NO VERIFICADOS. No declarar beta lista hasta superar las puertas anteriores.

## Implementación en la rama beta

El build 40000 parte de 30185. El tutor inicial abre los formularios que usa la aplicación para registrar ingresos recurrentes, cuentas y gastos previstos. La ayuda contextual incluye conciliación, documentos, reglas y acceso al hogar. El paquete web excluye el viaje precargado y el alta usa categorías genéricas.

La configuración publicada en la rama arranca sin conexión a la nube. Para habilitarla se requiere un proyecto Supabase dedicado con un esquema DOMUS instalado sin datos, Auth separado, altas públicas desactivadas y bucket privado. Tras instalar y comprobar ese esquema, `backend/families/private-review.sql` añade el alta familiar, sus categorías y la comprobación de entorno. El cliente requiere el identificador dedicado, la clave publicable y la respuesta esperada de esa comprobación antes de iniciar Auth. No aplicar el SQL a los proyectos actuales de DOMUS.

Las pruebas locales del recorrido y del SQL de alta usan JSDOM y PostgreSQL embebido. Faltan la verificación de Auth, las políticas entre dos hogares, los archivos y las operaciones reales de extremo a extremo en el proyecto dedicado. La revisión del propietario mantiene deshabilitado el acceso por código heredado. Las invitaciones por correo con permisos requieren implementación y verificación antes de compartir con terceros.

No usar el flujo de GitHub Pages de DOMUS 3.0 para esta entrega. La publicación requiere un origen privado separado con acceso exclusivo del propietario y configuración beta independiente.


## 18/11/2026 — beta Familias, tutor y ayuda (Work)

La orden posterior del propietario da prioridad absoluta a DOMUS 4.0 Beta Familias. Sobre f70f1c790895c5525ae35820d8d329d910cb8d17 se implementa continuación del tutor por usuario/hogar, instrucciones ordenadas por pantalla y ejemplo doméstico en el editor de reglas. Cinco pruebas nuevas y tres regresiones locales aprobadas (8/8); no equivalen a navegador, iPhone, Auth/Storage real ni beta privada entregada. Detalle y siguiente acción en docs/evidence/2026-11-18-families-help-continuity.md. Proyecto dedicado observado existente, sin aprovisionar recursos ni tocar producción. Pendiente probar aislamiento real y configurar origen privado; ninguna URL privada verificada aquí. Invitaciones deshabilitadas hasta revisión. Sin gasto IA ni CI nueva solicitada; informe diario separado.
