# D05 · Crear movimientos ausentes desde el extracto

Orden del usuario: 11/11/2026, conversación «Verificar proyectos DOMUS TransportERP».
Referencia común: TransportERP, rama erp05/integracion-lyreco, docs/REGISTRO-MAESTRO.md.

## Encargo y criterio de cierre

Completar el circuito bancario existente: cargar → revisar → enlazar lo existente o crear lo ausente → guardar confirmado → actualizar → reabrir sin duplicar. Ayuda comprensible en cada paso; móvil sin desplazamiento horizontal para revisar una operación. Empezar por los pagos con tarjeta de octubre de ING Jeni. No incorporar domiciliaciones, ingresos ni Bizum dentro de ese lote. Revisarlos después, por separado. No modificar datos reales durante el desarrollo. No atribuir titular, pagador, categoría, fecha o ámbito sin evidencia/revisión.

Formatos solicitados: PDF de ING y XLS/XLSX, además de CSV. La lectura de estos formatos está pendiente: este cambio completa exclusivamente la creación revisada desde los CSV que ya se admiten. No cerrar D05 global por este cambio.

## Cambio preparado

Candidato 30177 / 3.0.0-rc.1.133 sobre main e344f807. Se reserva este número para evitar reutilizar 30174; no está publicado.

- Operación sin coincidencia: «Revisar y crear movimiento» abre el formulario real.
- Fecha, importe con dirección y cuenta salen de la línea; persona y clasificación no se adivinan. Se exige revisar pagador/cobrador, categoría y ámbito.
- Guardar utiliza el RPC existente domus3_save_single_movement: movimiento y estado realizado en una transacción. No añade tablas ni otra vía de escritura.
- Identidad estable por hogar, cuenta, fecha, céntimos, concepto, referencia y número de repetición idéntica. El nombre del archivo y la posición entre operaciones diferentes no alteran la identidad. Reintentos no generan otro UUID. La restricción de clave impide sobrescribir o duplicar esa identidad.
- Las operaciones exactamente iguales se distinguen por número de repetición dentro del extracto: si un archivo parcial contiene solo una de varias operaciones idénticas, debe revisarse manualmente su correspondencia. La identidad no sustituye la detección de posibles coincidencias de importaciones anteriores con otra descripción.
- Traspasos propios reconocidos no se ofrecen como ingresos/gastos. Tener candidatos o decisión cerrada bloquea crear.
- Tras guardar se recalculan coincidencias, conservando decisiones cerradas; un cambio externo de movimientos mantiene el bloqueo de revisión obsoleta.
- Guía junto a los controles, distinción entre guardar extracto y guardar movimiento. Revisión en tarjetas mediante CSS a ≤700 px, con importe con signo.

## Evidencia y límites

- Suite local completa final: 237 pruebas aprobadas, cero fallos, con limpieza de identidad del formulario y candidato 30177 incluidos. Duración: 29,5 segundos.
- Prueba del formulario: usa el manejador onsubmit real y el transporte RPC real del HTML con servidor interceptado. Exige clasificación, guarda una vez y rechaza reapertura duplicada/cambio de sesión. No equivale a aceptación remota autenticada.
- Prueba SQL: ejecuta la función transaccional existente sobre PostgreSQL PGlite con tabla de etiquetas reducida de prueba; el reintento conserva una única operación y no cambia el importe anterior.
- CSV reales locales: 159 operaciones de Nómina, 108 pagos con tarjeta, 108 identidades distintas y las mismas 108 al preparar el archivo completo. Cero escrituras. No se incluyen originales, importes, cuentas o identidades personales en Git.
- Chromium local no arranca: el entorno rechaza socket() antes de ejecutar la página. No hay aceptación visual ni prueba de conexión con Supabase real. No se declara entrega disponible.
- GitHub: commits con [skip ci], sin activación de pago ni ejecución remota. No integrar ni publicar este candidato hasta completar el recorrido de navegador autenticado aislado y la revisión del HEAD vigente.

## Reanudación exacta

1. Abrir el candidato en navegador aislado con sesión de prueba. Cargar CSV, crear una operación ausente, cancelar otra, guardar, reabrir y repetir archivo. Comprobar pantalla a 390×844 y errores de red/sesión. No utilizar cuentas reales para las escrituras de aceptación.
2. Verificar que el RPC existente está disponible en el entorno de destino; no es necesaria una migración nueva en este cambio.
3. Rebasar contra main vigente conservando el trabajo de Cline/UDOC, regenerar el manifiesto desde los bytes de Git y repetir las pruebas afectadas.
4. Publicar mediante el procedimiento existente cuando Actions esté disponible o el usuario autorice su coste. No cambiar presupuestos ni contratar servicios.
5. Continuar PDF/XLS/XLSX y aceptación del lector IA (incluidos campos en español, guardar y crear propuesta). D05 y UDOC permanecen abiertos hasta publicación y aceptación correspondiente.
