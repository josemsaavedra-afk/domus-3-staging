## Concordancia entre lecturas y trazabilidad de importe — build 30135 (2026-10-24)

- Versión 3.0.0-rc.1.98. Captura de usuario en 30134: Mercadona sigue sin importe por contradicción. La protección funciona, pero la recuperación de 30133 no bastaba; la prueba con Tesseract.js 7 no equivalía al comportamiento de Tesseract.js 5 del cliente.
- Reproducción adicional con original, rasterizado Poppler a dimensiones de viewport PDF 2.4/3.2, Tesseract.js 5.1.1 y modelo español predeterminado best_int. Primera lectura 70%, cabecera 60%, centro 79%, pie 71%, sin filtro 73%; no es sesión autenticada ni rasterizador PDF.js de navegador. Lectura completa: tarjeta 84,50 e Importe 84,50. Pie: tarjeta 84,50 pero Importe 834,50. Sin filtro: Importe 84,50. Esto reproduce el conflicto entre un recorte aislado y dos lecturas concordantes.
- Resolución exige una lectura internamente concordante entre total e importe de tarjeta y corroboración por otra lectura distinta. Dos resultados internamente corroborados que discrepan, o contradicción fiscal, permanecen bloqueados. Repetir el mismo texto no cuenta como otra lectura. Se admite confusión OCR de letras en TARJETA/VANJETA BANCARIA; no se cambian dígitos para forzar coincidencias.
- Diagnóstico numérico por lectura almacenado en amount_evidence: fuente, totales, pagos, fiscalidad, decisión y selección. No guarda texto ni identificadores de tarjeta. Lectura inglesa de recuperación de fecha excluida del contraste monetario. Si no resuelve, el aviso muestra los importes candidatos; si resuelve, el campo muestra la procedencia.
- Suite local: 209/209 pruebas correctas, cero fallos.
- Propuesta pendiente 6c64962c-63cc-442e-8167-cb0d9b020603 consultada en Staging, mismo tamaño de original. Se intentó actualizar solo extracted_data mediante comparación exacta del valor anterior, con copia local de recuperación. Trigger private.stamp_base_audit rechazó «Sesión requerida». SELECT posterior confirma importe null e incidencia sin modificar. No establecer identidad de usuario artificial ni desactivar el trigger. Archivo y OCR no retenidos en esa propuesta; corregir código no recalcula retrospectivamente una propuesta sin evidencias.
- Flujo local completo con las lecturas originales v5: Mercadona 84,50, 22/10/2026, realizado, sin incidencia de importe. Casos automatizados añaden 834,50 aislado, desacuerdos verdaderos, repetición artificial y contradicción fiscal. Sin creación/modificación de movimientos económicos ni cambios de esquema o producción.

## Cierre automático tras confirmar documentos — build 30134 (2026-10-24)

- Versión 3.0.0-rc.1.97. Corregido el flujo mostrado en la captura del usuario: alert() de éxito detenía la ejecución antes de continueDocumentDraftReview y dejaba debajo el formulario con Crear movimiento hasta pulsar Aceptar.
- Alta, actualización y vinculación avanzan/cierra la revisión justo después de persistir la confirmación, antes de refrescar datos. Éxito se anuncia en docProgress con role=status y aria-live=polite; desaparece el aviso modal de éxito. Los avisos de error y la confirmación previa de sustitución se conservan.
- Última propuesta confirmada cierra el modal y vacía el formulario obsoleto. Si quedan propuestas del documento se conservan y se muestran; si hay documentos en cola se abre el siguiente. Botón para posponer: «Dejar para después», evitando «Cerrar sin crear movimiento» tras guardar otras propuestas.
- Suite local completa: 205/205 pruebas correctas, cero fallos. Publicación verificada: commit 765dabd2b065e2a9fbb23fd053b8f1bd157ca33b; CI 40117633837 success; Pages 40117633683 con build/deploy/report success. Endpoint publicado sirve 3.0.0-rc.1.97 / 30134.
- Regresiones ejecutadas sin escritura remota: cierre y limpieza, conservación de propuesta editada, avance al siguiente documento, guardado simulado con refresco todavía pendiente y ausencia de alert de éxito. QA autenticada no realizada; navegador remoto sin sesión disponible. No se modifican movimientos del usuario, esquema, Supabase ni producción.

## Tickets originales y contraste fiscal — build 30133 (2026-10-24)

- Versión 3.0.0-rc.1.96. Reconoce separador decimal con espacio OCR (6, 62), TOTAL (€), y tabla TIP/BASE/IVA/TOT. No añade una coma ausente. Los totales de BASE/CUOTA se excluyen del importe pagado. Sin total etiquetado no conserva un número arbitrario de la primera lectura.
- Relectura adicional en español, sin filtro de contraste y con segmentación de bloque uniforme, dentro de la recuperación existente. No sustituye automáticamente la evidencia anterior; pasa por los mismos controles de contradicción. Worker terminado también ante error. Motor TransportERP vendorizado y lectores profesionales conservados.
- Original Mercadona 20261022.pdf y foto IMG_9083.jpeg recuperados para inspección y OCR, sin subirlos al repositorio público. Ticket: total/cargo 84,50, subtotal fiscal 77,67; recibo taxi 6,62, fecha 22/10/26. Extraído espacio decimal en OCR nativo del taxi; la simple sustitución por 62 nunca se acepta.
- Comprobación local con bytes originales: PDF rasterizado a 2000 px; Tesseract.js 7 y modelo español tessdata_fast, con equivalente de escala/grises/contraste y recortes del lector, más lectura sin filtro. No es una sesión de producción ni el mismo Tesseract.js 5/modelo remoto del navegador. Confianza inicial 71% Mercadona y 35% taxi. Flujo de interpretación local sobre esas lecturas: Mercadona 84,50 / Mercadona / 22-10-2026 / realizado; taxi comercio reconocido, importe vacío y fecha vacía, ambos señalados para corrección. No se presenta 62 como seguro.
- Recorte central experimental del taxi no recuperó suficiente evidencia: no integrado. Textura de fondo sigue perjudicando OCR; no se atribuye al cambio una recuperación visual completa del taxi.
- Validación local: 202/202 pruebas correctas; integridad de hashes PWA y sintaxis incluidas.
- Regresiones nuevas: subtotal fiscal separado, moneda entre paréntesis, espacio decimal real, tabla fiscal del taxi, cifras contradictorias y número inicial sin total. UI local pendiente: Playwright no tiene navegador instalado y descarga de Chromium devuelve archivo inválido; no se atribuye validación visual ni autenticada.
- Build anterior 30132 comprobada publicada en version.json; Pages 40101905559 y CI 40101906122 success. No usar fetch_commit_workflow_runs para concluir ausencia de workflows de push: ese conector filtra a pull_request; consultar colección Actions por SHA.
- Publicación verificada: commit 9ac503b2217cc424ee7e283f45e48bdd86cb6c29; CI 40116865431 y Pages 40116865077 success. version.json sirve 3.0.0-rc.1.96 / 30133. Navegador remoto abre acceso sin errores de DOMUS registrados (solo error de extensión); no hay sesión autenticada reutilizable, por lo que la revisión dentro de la app queda pendiente.
- No se modifica Supabase, no se crean movimientos ni se cambia producción. Clasificación documental completa, mejor comprensión visual y QA autenticada siguen pendientes. No declarar terminada la misión integral.

## Revisión por campo del lector — build 30132 (2026-10-24)

- 3.0.0-rc.1.95. Adaptador DOMUS posterior a reglas y defaults; no modifica el motor vendorizado de TransportERP ni sus lectores profesionales. Total etiquetado reemplaza cifra inicial; conflictos entre totales/pagos o base + IVA vacían importe. OCR menor de 60 exige corroboración o corrección del total. No se reconstruyen decimales por intuición.
- Nombre comercial impreso reconocido para supermercados y Tele Taxi Jerez. Cadenas con múltiples palabras de una letra o caracteres corruptos se vacían; proveedor, fecha e importe dudosos muestran aviso y comprobación individual obligatoria antes del alta. Detalles avanzados bajo «Revisar detalles».
- Auditoría: Tesseract español tras escala/grises/contraste; PDF.js para PDFs. Relectura dirigida OCR de cabecera 0–38%, centro 22–68% y pie 62–100%; recuperación adicional de fecha sin filtro en inglés. Porcentaje mostrado: confianza global de Tesseract, NO probabilidad de cada campo. Interpretación mediante regex/heurísticas y reglas/catálogos/historial; no se observa llamada a modelo de IA en este pipeline.
- Causa de persistencia de importes: analyzeBlob retenía el primer importe no nulo tanto al fusionar relectura como al consultar motor TransportERP. Corrección minorista dependía del nombre de archivo; suspiciousIssuer no rechazaba cadenas de muchas letras aisladas. Nuevo control contrasta evidencias después de esas etapas. Defaults ya proponen tickets como realizados; fallos anteriores de clasificación y nombres impedían activar las rutas esperadas.
- Suite local completa: 196/196 pruebas, cero fallos; incluye integridad PWA y 59 documentales. Publicación pendiente de comprobación.
- Pruebas nuevas sobre texto sintético de los casos reportados: 84,50 frente a 34,50; 6,62 frente a 62; 6,02 + 0,60; contradicciones, emisor corrupto, baja confianza y conservación del contrato profesional. NO equivalen a ejecutar OCR sobre originales.
- No se modifica Supabase ni se crean movimientos. Producción intacta. Pendientes: OCR original Mercadona (PDF localizado, sin texto extraíble), foto taxi, QA autenticada sin escritura económica, clasificación documental completa y revisión visual/IA. Esta entrega es una protección parcial, no el cierre del motor documental ni de la misión.

## Recordatorio voluntario y formato CSV recordado — build 30131 (2026-10-23)

- Versión 3.0.0-rc.1.94. Inicio ofrece el día 1 revisar el banco del mes pasado. Revisar abre el importador, Más tarde espera hasta mañana, Este mes no lo descarta hasta el siguiente mes. La elección persiste por usuario/hogar en este dispositivo; no bloquea otras tareas ni modifica datos económicos.
- Columnas CSV confirmadas se recuerdan por usuario/hogar/cuenta en este dispositivo. Reutilizar exige mismos encabezados, orden y formato; si cambian se propone detección nueva y mapeo visible. No se guarda el contenido bancario en estas preferencias. Almacenamiento denegado no impide uso de la aplicación.
- Retirada explicación de saldo calculado del panel opcional de importación; mantiene funciones históricas de conciliación accesibles para la transición 3.0.
- Pruebas completas tras integración y corrección de sintaxis: 191/191, cero fallos; incluyen renovación mensual, posposición, persistencia tras recrear controlador, aislamiento de usuario/hogar/cuenta, ruta de revisión, formato desconocido en archivo posterior y encabezados cambiados. PWA verifica hashes y rechaza actualización incompleta con nuevos módulos incluidos.
- Integrado sobre main bffc26682ccaab6119947bb644564ce02b58936b, conservando las correcciones OCR de supermercados y recibos de taxi de 30129/30130. Corregido un paréntesis sobrante en smartDocumentDefaults de 30130 que impedía compilar el script principal; 54/54 pruebas documentales pasan tras corregirlo.
- Sin migración ni modificación económica. Publicación comprobada: código bb508acd9cdc8b6d049be3ebb690b8b1c8795004; CI 40003150161 y 40003201254 success; Pages 40003201183 success. Navegador sirve version.json 3.0.0-rc.1.94 / 30131 y arranca la pantalla de acceso sin errores de script de DOMUS. QA autenticada pendiente: el formulario seguro no se completó y la solicitud se interrumpió; no reintentar credenciales sin nueva petición del usuario. No confundir las pruebas unitarias de fecha con una sesión real el día 1. Persistencia multidispositivo del recordatorio/formato no implementada.

## Build 30130 · 2026-10-23 · correcciones lector tickets y recibos (Staging)

- Recibos Tele Taxi Jerez: importe solo desde etiqueta IMPORTE, fecha corta DD/MM/AA, recibo y fiscalidad 10% cuando cuadre; nunca tomar kilómetros/base como total. Estado pagado para recibo del servicio realizado.
- Tickets de supermercados con nombre explícito de comercio en archivo: recuperar comercio, alimentación y ámbito doméstico cuando el OCR produce cabecera incoherente. Tickets de compra ya realizada: estado pagado.
- Limitación pendiente: con OCR de baja confianza (ej. 32%) no se garantiza recuperación si las etiquetas no están reconocidas; requiere revisión del motor visual antes de confirmación. Sin cambios en producción.

## Tickets supermercados y conciliación OCR — build 30129 (2026-10-23)

- Versión 3.0.0-rc.1.92. Staging únicamente.
- Regresión reportada en Mercadona 20261022.pdf: OCR propuso 34,50 € en lugar de 84,50 €, concepto/proveedor corrupto, estado pendiente, pagador/cuenta/categoría ausentes.
- En el pipeline se reconocen supermercados conocidos por nombre de archivo con fecha válida; se proponen comercio, compra doméstica y Alimentación activa. No se deduce el titular económico de la tarjeta.
- Se detecta pago con tarjeta en formatos TARJ. BANCARIA y terminaciones enmascaradas como ****3011, aplicando reglas de pagador/cuenta existentes.
- El estado se propone realizado cuando existe evidencia de pago o tipo documental ticket.
- La conciliación del importe exige concordancia entre total y cargo; ante OCR contradictorio o cargo no corroborado se bloquea el importe en vez de guardar una cifra potencialmente errónea.
- No se ha modificado ni confirmado ningún movimiento económico. Falta prueba de extremo a extremo con el PDF real en navegador, tras propagación de Pages.

## Seguimiento individual y acceso bancario — build 30128 (2026-10-23)

- Versión 3.0.0-rc.1.91. Detalle de gasto pendiente permite marcar/quitar «Pendiente de liquidación». Mantiene estado pendiente, importe y todas las fechas; no reclasifica automáticamente ningún movimiento de ONLOGIST ni real.
- Inicio e hitos excluyen esas operaciones de urgencias; Dinero conserva su obligación en resultados y muestra un detalle separado de pendientes de liquidación. Corregido el detalle de Resultado realizado, que carecía de su clave de filas.
- Documentos incorpora acceso permanente «Importar movimientos bancarios» al importador opcional existente. NO se considera implementada la nueva elección banco/DOMUS/campo a campo ni auditada toda la conciliación.
- Migración aditiva Staging 20261023103949: columna nullable, RPC invoker con RLS, permiso authenticated, bloqueo y comprobación de revisión. Los dos guardados atómicos conservan el nuevo metadato al editar. Producción intacta.
- Backup recuperable verificado antes del cambio: snapshot d9b54e40-c06a-4443-9191-5199450da2ac, pre_follow_up_30128_20261023; 1960 series y 1961 estados completos, más definiciones previas de ambos RPC en manifest. Restauración por jsonb_populate_record comprobada sin escritura; acceso cliente denegado. Tras migración, 1960/1960 series y 1961/1961 estados iguales a backup ignorando solo columna nueva. No restaurar encima de cambios posteriores del usuario.
- CI ejecutada: 186/186, cero fallos; run 39940598692, job 120370785394. Incluye aislamiento RLS/anon, revisión obsoleta, fechas de recurrencia, pagados/cancelados/ingresos, conservación de marcador al sustituir movimiento/tramo, cálculos y detalles de Tesorería. Las pruebas usan snapshots JSON como API para fechas y números.
- RPC real Staging probado como authenticated en hogar ficticio dentro de BEGIN/ROLLBACK: alta controlada, marcar, rechazar revisión obsoleta, quitar marca, igualdad de datos económicos. Transacción revertida; no quedan movimientos de prueba nuevos.
- Publicación y QA autenticada de interfaz de esta entrega pendientes de verificación. OCR real/lote, iPhone físico, nueva conciliación asistida y recordatorio mensual continúan pendientes. DOMUS 3 conserva capacidades profesionales de transición; 4 aislado conforme al contrato de continuidad.

## Continuidad operativa 3.0 y producto doméstico 4.0 — decisión 23/10/2026

- DOMUS 3.0 sigue en uso como puente y conserva las capacidades profesionales actuales hasta TransportERP. El plan autorizado de mejoras y pruebas de Staging continúa.
- 4.0 debe evolucionar en entorno y datos aislados; no reemplazar ni modificar la base operativa de 3.0 como vía de simplificación. Una rama por sí sola no protege los datos.
- TransportERP aportará ingresos familiares trazables; evitar duplicar los cobros profesionales ya registrados en 3.0. Beneficio profesional y aportación efectiva al hogar son conceptos diferentes.
- Contrato de continuidad, auditoría de producto propuesta y condiciones de traspaso en [docs/DOMUS_3_4_CONTINUITY.md](docs/DOMUS_3_4_CONTINUITY.md). Recomendaciones pendientes de implementación; no se crean entornos ni se migran datos en este cambio documental.
- Sin cambio del código servido: build 30127. No se atribuyen pruebas nuevas a esta decisión documental.

## Compromisos sin repeticiones — build 30127 (2026-10-23)

- Versión 3.0.0-rc.1.90. Inicio elimina el bloque de hitos redundante; cada compromiso conserva su lista y acceso al movimiento. Dinero conserva hitos, pero no repite el mismo cobro como próximo ingreso y cobro habitual.
- Regresión ejecutada: mismo id/ocurrencia en ambos tipos de hito se representa una vez. Pruebas locales disponibles: 150/150; hashes PWA regenerados. Suite completa CI: 177/177, cero fallos (run 39934834490, job 120351719485). Pages 39934922635 completed/success. Cabecera autenticada 30127/3.0.0-rc.1.90 comprobada tras actualización íntegra de PWA y recarga; Inicio muestra una vez el cobro en su lista; Dinero muestra dos hitos distintos sin repetir cobro habitual. Sesión recuperada y datos cargados.
- Sin cambios económicos ni de esquema. Producción no modificada. Resto de requisitos de la misión pendientes conforme a registros siguientes.

## QA autenticada del alta doméstica — build 30126 (2026-10-23)

- Acceso seguro completado y cabecera 3.0.0-rc.1.89 / 30126 comprobada en Staging.
- Alta desde «Añadir sin ticket»: gasto ficticio claramente identificado por 0,01 EUR, persona/pagador Jeni, cuenta y medio seleccionados, categoría doméstica. Guardado desde el formulario corto completado; se observa una sola fila realizada en el detalle mensual.
- Recarga completa: sesión recuperada; búsqueda de la prueba en Movimientos muestra una única fila pagada. Editar recupera importe, fechas prevista/documental/real iguales, ámbito doméstico y medio de pago.
- Prueba cancelada desde Editar → Estado cancelado → Guardar. Se comprueba que deja de figurar en realizados; no se borra historial. Solo se escribe la operación ficticia creada para esta prueba, sin modificar movimientos reales ni producción.
- Dinero abre el detalle de pagos y presenta las seis cifras en el orden solicitado. Esto verifica navegación y recuperación del dato de prueba, no constituye auditoría de todos los importes históricos.
- Hallazgo detectado en 30126 y corregido/comprobado en 30127: Inicio repetía el próximo cobro entre hitos y lista. Los seguros antiguos pendientes siguen en atención; seguimiento de liquidación aún por implementar.
- Continúan pendientes OCR real, documentos múltiples extremo a extremo, iPhone físico, CSV con elección de fuente y demás criterios de la orden. No declarar terminada la misión.

## Transición doméstica: primera interfaz — build 30126 (2026-10-22)

- Versión 3.0.0-rc.1.89. Formulario manual corto sobre el guardado transaccional existente: gasto/ingreso, importe, concepto, fecha, estado, personas, cuenta/medio y categoría. Nuevas entradas domésticas realizadas por defecto; estado editable. Fecha documental y real se sincronizan solo en modo corto; editar conserva fechas históricas y formulario completo. Más detalles permite clasificación profesional transitoria y recurrencias.
- Inicio retira cifras mensuales, disponible bancario y tablas de previsión; ofrece accesos a documentos, alta manual, Agenda, Dinero, Movimientos e Informes. Listas próximas acotadas a siete días; realizados no se muestran como compromisos. Sin afirmaciones sobre dinero disponible.
- Dinero presenta cobrado, por cobrar, pagado, por pagar, resultado realizado y previsto, en ese orden; conserva filtros mensuales y detalle. Retiradas tarjetas de saldos y proyecciones de cortes. Motor y datos de conciliación conservados con acceso opcional.
- Revisión documental pliega referencia, ámbito y vínculos profesionales junto con datos fiscales; conserva todos sus campos y validaciones. Cámara y carga múltiple existentes conservadas; no afirmar mejora de precisión OCR ni prueba móvil física.
- No hay migración, reclasificación ni escritura económica. Producción no modificada.
- Pruebas locales: 149/149 correctas, sincronización de fechas del formulario corto, Inicio sin nodos retirados, filtros siete días, sintaxis y actualización PWA íntegra. El test antiguo que esperaba error ante estado repetido se actualiza a la política ya implantada en 30118: una ocurrencia, mayor revisión, ambos órdenes.
- Suite completa en GitHub Actions: 176/176, cero fallos; job 120061498488, run 39846628154. npm ci y PGlite ejecutados correctamente en CI. Localmente PGlite no estuvo disponible por restricción de red. Navegador web de Staging solicita acceso; validación autenticada, gasto de Jennifer, OCR real, iPhone físico y persistencia de extremo a extremo siguen pendientes.
- Esta entrega NO cierra la misión. Pendientes: seguimiento de liquidación, importación desde Documentos, elección campo a campo de fuente bancaria/DOMUS, recordatorio mensual y pruebas integrales exigidas por la orden. No afirmar que capacidades anteriores del importador cumplen ya esos requisitos nuevos.
- Publicación comprobada: código d6b4a68daa177f584effdbfa1cca2eca010f5509; Pages run 39846721448 completed/success. Navegador remoto abrió version.json y confirmó 3.0.0-rc.1.89 / 30126. Validación autenticada aún pendiente; no confundir versión servida con prueba funcional completa.

## Movimientos: filtros combinables — build 30125 (2026-10-22)

- Versión 3.0.0-rc.1.88.
- Se separan los filtros de Movimientos en dos ejes independientes:
  - Naturaleza: Gastos / Ingresos / Todos.
  - Estado: Pendientes / Realizados / Todos.
- Las combinaciones funcionan simultáneamente: gastos pendientes, ingresos realizados, todos los gastos, todos los pendientes o todos los movimientos.
- Se conserva la búsqueda y la paginación sobre el conjunto ya filtrado.
- El estado inicial mantiene Todos + Pendientes para no cambiar el comportamiento de entrada.
- Producción no modificada.

## Tesorería: terminología y totalización — build 30124 (2026-10-22)

- Versión 3.0.0-rc.1.87.
- Informes unifica estados a «Realizado + pendiente», «Realizado» y «Pendiente». Se elimina la mezcla «Real + previsto» / «Previsto / pendiente».
- La tarjeta «Resultado realizado del mes» muestra Cobrado, Pagado y Resultado; es clicable y abre el detalle de movimientos realizados del mes.
- La tarjeta «Resultado previsto del mes» muestra Ingresos totales, Pagos totales y Resultado esperado; es clicable y abre el conjunto completo del mes.
- Los bloques Ingresos y Pagos añaden Total del mes: cobrado + pendiente y pagado + pendiente, respectivamente.
- Se mantienen separados realizado y pendiente; no se crean terceros estados conceptuales.
- Producción no modificada.

## Informes: desgloses útiles, signos y porcentajes — build 30123 (2026-10-22)

- Versión 3.0.0-rc.1.86.
- El informe impreso deja de repetir desgloses redundantes de una sola línea cuando no aportan información: titular económico, pagador/cobrador, doméstico/actividad y realizado/pendiente.
- Los desgloses económicos imprimen signo explícito: ingresos con + y gastos con −, de modo que el informe sea legible en blanco y negro.
- Gasto por categoría, doméstico/actividad e ingresos habituales/variables e ingresos por cliente/origen muestran porcentaje sobre el total correspondiente.
- La vista en pantalla usa la misma convención de signos y porcentajes.
- Producción no modificada.

## Informe financiero: margen y comparación — build 30122 (2026-10-22)

- Versión 3.0.0-rc.1.85.
- El resumen financiero separa claramente el rendimiento del período de la comparación contra el período anterior.
- Para Ingresos, Gastos y Balance se muestra el importe actual y su peso sobre los ingresos del propio período. En Balance ese porcentaje se etiqueta como «Margen sobre ingresos».
- La comparación queda visualmente separada: importe anterior, porcentaje sobre ingresos anterior, diferencia absoluta en euros y variación porcentual frente al período anterior.
- En el informe impreso/PDF el encabezado se agrupa en «Período actual» y «Comparación con …» para evitar confundir margen con variación intermensual.
- Ejemplo validado con septiembre 2026: 2.159,62 € / 4.914,56 € = 43,94 % de margen; agosto: 2.890,71 € / 6.558,10 € = 44,08 %.
- Producción no modificada.

## Motor de vencimientos por reglas — build 30121 (2026-10-22)

- Versión 3.0.0-rc.1.84.
- La revisión documental muestra siempre Fecha del documento y Vencimiento/fecha prevista de cobro-pago como campos separados. Tesorería usa vencimiento cuando existe; la fecha documental se conserva.
- Las reglas de clasificación admiten account_id y due_policy. due_policy soporta days_after y monthly_days, con ajuste opcional sábado→viernes / domingo→lunes.
- El lector aplica automáticamente due_policy solo cuando el documento no trae vencimiento explícito.
- Regla creada: ONLOGIST ingreso = fecha de factura + 29 días.
- Regla Lyreco ampliada: próximos días 10/25; sábado pasa al viernes y domingo al lunes.
- OTOQI y DriiveMe quedan sin política de vencimiento hasta fijar sus calendarios exactos; no se inventan.
- Reglas antiguas corregidas para usar categorías activas: Mercadona→Alimentación, Vodafone→Suministros, AEAT→Impuestos.
- Se corrigió el patrón de nombre SBILL/OTOQI que había quedado mal escapado en una edición anterior.
- Staging solamente. Producción no modificada.

## Reglas, vencimientos y vínculos documentales — build 30120 (2026-10-22)

- Versión 3.0.0-rc.1.83.
- Las reglas de clasificación ya pueden proponer también account_id, además de categoría, ámbito, titular, pagador/cobrador, tercero, actividad y etiquetas.
- El lector documental separa fecha de factura y vencimiento/fecha prevista. Si existe vencimiento, esa fecha se usa como start_date de Tesorería; la fecha de factura se conserva como document_date.
- La revisión muestra «Vencimiento / fecha prevista» cuando procede y mantiene visible la fecha de factura para trazabilidad.
- Comisión, seguro y coste de prefinanciación se vinculan automáticamente por referencias documentales. El enlace funciona tanto si el ingreso ya existe como si se crea después: el orden de carga de archivos deja de ser determinante.
- Los enlaces explícitos continúan siendo idempotentes por la restricción de movement_links; no se crean vínculos duplicados.
- No se modificaron movimientos económicos ni producción.

## Defaults inteligentes de documentos — build 30119 (2026-10-22)

- Versión 3.0.0-rc.1.82. La revisión documental deja de tratar cada documento como un caso nuevo: si el titular está identificado y no hay evidencia contraria, pagador/cobrador se propone como la misma persona.
- La cuenta y categoría se proponen desde historial confirmado del mismo titular, tercero y naturaleza cuando el antecedente es inequívoco. La equivalencia de categorías antiguas usa la categoría activa actual.
- Familia OTOQI/SBILL: ingreso variable de actividad económica, concepto Factura OTOQI, contraparte OTOQI y nº de factura derivado del nombre SBILL. La propuesta actual de Jeni usa ING Jeni e Ingresos Variables por historial confirmado.
- Se añade Estado a la revisión documental. Tickets/recibos de compra se proponen como Pagados; las facturas siguen pendientes salvo evidencia de cobro/pago.
- Al crear un documento propuesto como Pagado/Cobrado se crea también su estado realizado, evitando que un ticket pagado entre en Tesorería como pendiente.
- La propuesta almacenada SBILL21593_2026_10_0002 se corrigió y se eliminó una referencia de confirmación huérfana a una serie inexistente. No se creó ningún movimiento económico ni se tocó producción.

<!-- pages-republish-30118-20261022 -->
## Estado duplicado transitorio al marcar pagado — build 30118 (2026-10-22)

- Versión 3.0.0-rc.1.81. Corregida la alerta «Estado duplicado para serie|fecha» que podía aparecer después de marcar manualmente una comisión o un seguro como pagado.
- La base de datos mantiene clave primaria (series_id, occurrence_date); no admite dos estados persistidos para la misma ocurrencia. El aviso procedía de la reconstrucción cliente de Tesorería cuando durante una recarga podía recibir temporalmente la misma clave más de una vez.
- snapshot.js deja de abortar la reconstrucción por esa repetición transitoria y conserva determinísticamente el estado más reciente por treasury_revision y updated_at.
- El pago ya se estaba guardando correctamente; la corrección elimina el falso error posterior sin cambiar importes, fechas ni estados económicos existentes.
- Producción no modificada.

## Cobro normal vs prefinanciación — build 30117 (2026-10-22)

- Versión 3.0.0-rc.1.80, aplicada sobre 30116 sin rebajar trabajo posterior. Corregido el flujo de «Marcar cobrado»: ya no pregunta por prefinanciación por el mero hecho de que el ingreso sea prefinanciable.
- «Marcar cobrado» significa cobro normal y registra el ingreso como realizado sin coste de prefinanciación.
- La prefinanciación queda reservada al botón explícito «Prefinanciar», que mantiene su confirmación específica y la lógica RHD/4,9 %.
- Esto elimina el aviso absurdo en la fecha normal de cobro y evita marcar accidentalmente como prefinanciado un cobro ordinario.
- No se modifican datos económicos existentes ni producción.

## Arranque y carga de datos — build 30116 (2026-10-22)

- Versión 3.0.0-rc.1.79. El bloqueo permanente reportado no se ha reproducido en la sesión de escritorio; se corrigen causas verificadas en el arranque sin atribuir una causa única no demostrada.
- Las sincronizaciones simultáneas de un mismo contexto comparten un trabajo y conservan un único reintento posterior. Una renovación de token/aviso de sesión ya cargada no vuelve a ejecutar toda la ruta. La cola offline deja de esperarse dos veces al entrar.
- La carga conjunta tiene límite de 25 segundos. Respuesta tardía, fallo de presupuestos o cambio de contexto no publican datos parciales. Un fallo inicial sustituye el indicador infinito por instrucciones de reintento; no muestra datos vacíos como cero.
- Se renderizan las vistas abiertas. Inicio no calcula Informes, Movimientos, Ajustes ni las previsiones plegadas; cada vista se actualiza al abrirse. La expansión económica indexa estados y series en lugar de buscarlos repetidamente por fila. No cambia reglas, importes ni fechas.
- Regresiones: espera agotada/respuesta tardía, reintento, ráfaga serializada, carga de otro hogar, presupuesto fallido sin publicación parcial y renderizado de Inicio sin vistas ocultas. Suite completa 174/174; sintaxis inline y manifiesto verificados. Comparación sintética de 3000 ocurrencias: snapshot idéntico, 215 ms antes / 32 ms después en esta ejecución (no es una medida de iPhone). Código 3563a424aa3ba7ad39c319e9b7bedc9f1ede4ecd. Pages 39774293969 completed/success. Seis assets publicados coinciden byte a byte con los probados. Cabecera autenticada 30116 y datos de Inicio verificados en dos entradas por recarga; Dinero muestra las cifras mensuales y Movimientos 60 filas en su primera página. Se conserva el cobro reprogramado al 26. El controlador del navegador agotó su espera corta en observaciones iniciales; después confirmó la carga. No se ha reproducido un bloqueo permanente ni se afirma una prueba física del iPhone. Sin escrituras económicas ni cambios en producción.

## Corrección de vencimiento de un cobro reprogramado — 2026-10-22

- La aclaración del usuario confirma que el vencimiento válido es el 26 de octubre. La revisión anterior de tarjetas acumuladas no resolvía esta fecha económica: se había conservado una excepción reprogramada al 23 y cancelado la ocurrencia del tramo sustituto.
- Reparación desde el formulario autenticado de Staging, aplicando solo a esta ocurrencia: se reprograma el único cobro activo al día 26 conservando identidad e importe; el duplicado ya cancelado permanece cancelado. No se crea una serie ni un estado nuevo. Historial before/after conservado por la auditoría de base. El formulario materializa también document_date con la fecha original ya efectiva; sin cambio del mes documental.
- SQL posterior confirma el cambio de fecha, mismo estado pendiente y cancelación de la copia. Inicio muestra el vencimiento correcto; Movimientos muestra una fila en octubre; Tesorería incluye una sola vez el cobro dentro de Por cobrar, conservando el resto de ingresos. No se cambia la recurrencia futura ni producción.
- Regresión añadida con tramo cerrado, excepción reprogramada, copia cancelada y excepciones futuras antiguas: una sola ocurrencia en octubre en la fecha correcta, ninguna en la fecha anterior y noviembre conservado, también al reconstruir. Suite 170/170. Sin cambio del código servido: continúa build 30115.

## Etiquetas de previsión visibles en móvil — build 30115 (2026-10-22)

- Versión 3.0.0-rc.1.78. Causa de la captura: en <=700px forecast-grid pasa a bloque y forecast-head se oculta; las celdas solo mostraban cantidad y número de movimientos. Se perdían tanto el plazo como Por cobrar/Por pagar.
- Cada celda de persona y ámbito lleva una etiqueta propia siempre visible, independiente del encabezado de tabla y del tooltip. Los controles pasan a botones semánticos, con nombre que incluye tipo de flujo, plazo, importe y número de movimientos. Se conserva la explicación del bloque: los horizontes son acumulados y no se suman.
- Conserva importes, selección de pendientes, plazos y acciones de desglose. Dos tarjetas de igual importe no demuestran dos movimientos: pueden ser la misma ocurrencia contenida en dos horizontes. No se deduplica ni cambia la base de datos por semejanza de cantidades.
- Validación local: suite 169/169; ocho combinaciones de flujo/plazo generadas por renderForecastCell comprobadas con etiqueta visible e importe conservado. Código 6366b1e42405d312a2273697bbb6ff350bfd6f3b. Pages 39770943569 completed/success; cuatro assets publicados idénticos byte a byte a los probados. Cabecera autenticada 30115 verificada. DOM: 24 etiquetas por persona y 16 por ámbito visibles (display:block). Ambos controles de JM por 3000 EUR (7 días/fin de mes) abren la misma única fila Lyreco primera quincena, 23/10/2026. Captura interna de escritorio revisada; desglose funcional. La validación en navegador de escritorio no equivale a una prueba física de iPhone. Sin cambios económicos, de esquema, producción ni TransportERP.

## Desgloses mensuales separados — build 30114 (2026-10-21)

- Versión 3.0.0-rc.1.77. La captura del usuario muestra una lista que mezcla cobros pendientes y realizados. Ingresos y pagos ahora ofrecen cuatro controles independientes: Por cobrar, Cobrado, Por pagar y Pagado, con mes/año visible. Se elimina el desglose combinado y su rótulo previstos y cobrados/pagados.
- Cada control usa una selección común de filas por mes efectivo, tipo y estado. Prueba con histórico de enero, vencidos de enero y previsiones hasta enero siguiente: ninguno entra en octubre salvo un cobro con fecha real explícita de octubre. Las fechas previstas originales distintas se muestran en filas móviles/escritorio para explicar esa pertenencia. No se reclasifican fechas ni se modifica historial económico.
- La fecha real de cobro/pago determina el mes de caja. La afirmación de que hay filas de enero en octubre no se ha reproducido sobre la versión actual: el filtro mensual ya existía; se añade regresión de extremo a extremo de selección y trazabilidad de fecha original. No atribuir a un cambio de datos no demostrado.
- Consulta agregada de Staging encuentra cobros/pagos con fecha real octubre y fecha original de agosto, septiembre, octubre y noviembre; no se cambia esa evidencia por el mes de factura. Cotejo de prefinanciación permanece pendiente, según 30112.
- 30113 código ba9b89e5f1acebca4d1d3d41ef40d332be6345a6, Pages 39601429184 success; assets servidos idénticos a los probados. Cabecera autenticada 30113 y cuatro controles verificados. Listas: Por cobrar 2/3068,28; Cobrado 36/6638,06; Por pagar 10/1966,15; Pagado 108/5314,90. Fechas efectivas de las filas contrastadas, todas de octubre. No afirmar corrección de fechas históricas no reproducida.
- QA visual detecta que la lista de tarjetas móvil carecía de ocultación base en escritorio. Se añade display:none fuera del breakpoint móvil para evitar representación duplicada. 30114 sustituye a 30113 para la entrega final. Suite final 169/169. Código 44620753b6789a6ceb1292091af738cff47e8101; Pages 39602176401 completed/success. Seis assets contrastados byte a byte con los probados. Cabecera autenticada 30114 comprobada; Por cobrar abre dos filas, lista móvil oculta en escritorio y tabla visible. La carga inicial produjo timeouts transitorios del controlador y se completó después; no se trató como cero ni se alteró ningún movimiento. Sin cambios de esquema, escrituras económicas, producción ni TransportERP.

## Guardado económico transaccional — build 30112 (2026-10-21)

- Versión 3.0.0-rc.1.75. Altas, cambios de fecha de movimientos individuales y sustituciones de una ocurrencia con cambios de metadatos usan `domus3_save_single_movement`. Los cambios de tramos futuros usan `domus3_save_recurrence_segment`.
- Cada RPC confirma series, estados y cancelación de la versión sustituida en una transacción. Bloqueo de serie, revisión esperada y estado esperado previenen cambios concurrentes y reintentos que creen copias. Las conciliaciones afectadas bloquean el cambio de identidad. No hay fallback a escrituras parciales cliente. Una reprogramación simple conserva la clave de ocurrencia y sigue siendo una única escritura.
- Migraciones `20261021094843_rc1_atomic_recurrence.sql` y `20261021100438_rc1_atomic_single_movement.sql` aplicadas exclusivamente a Staging. SECURITY INVOKER, ejecución solo authenticated, membresía explícita y RLS intacta. Acceso anónimo denegado y permisos contrastados tras aplicar. Advisors sin hallazgos nuevos respecto al control anterior.
- Inicio prioriza una fecha reprogramada explícita frente a ventanas históricas estimadas. Inicio y Dinero esperan la carga del contexto económico del usuario/hogar. Carga pendiente o fallida no se presenta como cero; el snapshot offline conserva contexto de propietario.
- Validación local: suite completa 165/165, incluidos once escenarios SQL transaccionales y transporte/carga/aislamiento. Después se añadió una regresión de fecha reprogramada exacta en Inicio: el grupo afectado pasa 15/15 (166 casos distintos en total). Sintaxis inline y manifiesto PWA correctos.
- La reparación delimitada de la ocurrencia duplicada sigue comprobada. El resto de series y estados conservan las huellas de la copia previa. Detalle financiero privado fuera del repositorio público.
- 30111: Pages completado; cabecera autenticada observada. Inicio se observó con una sola ocurrencia reprogramada y resultado mensual sin saldo inicial. La revisión posterior de Dinero se interrumpió por desconexión del servicio de navegador; lectura y reinicio agotaron el tiempo de espera. No afirmar QA visual completa ni validación autenticada de estas RPC nuevas.
- Pendientes materiales: cotejo de liquidaciones prefinanciadas (netos frente a costes enlazados y costes calculados frente a facturas posteriores), edición/conciliación de extremo a extremo y QA final móvil/recarga/nueva sesión. No declarar cerrada la auditoría integral ni dar por definitivos todos los importes mensuales.
- Reversión: volver primero a la aplicación 30111 y después retirar las funciones añadidas por sus firmas. Las migraciones solo añaden funciones y permisos; no transforman registros económicos existentes.

## Tesorería mensual e integridad — builds 30110/30111 (2026-10-21)

- 30110 / 3.0.0-rc.1.73 integrada mediante PR #4. Pages completado correctamente para 99a854bab1d342c681edd50d764f350774d9a016.
- Resultados mensuales sin saldo inicial, referencias bancarias separadas, expansión de ocurrencias compartida entre interfaces, exclusión de excepciones pendientes antiguas en tramos cerrados y transferencia de estados al editar recurrencias futuras.
- Reparación económica delimitada realizada desde UI autenticada de Staging y contrastada contra copia previa. El detalle privado de la reparación y las huellas permanecen fuera del repositorio público. No se modificó producción.
- 30111 / 3.0.0-rc.1.74 restaura controles de extractos/conciliación dentro de la sección bancaria y corrige cabecera desactualizada. Atención incluye también los vencidos del mes actual. Conserva las restricciones del adaptador de consulta: no habilita escrituras bancarias remotas no soportadas.
- Validación local de 30111: suite 149/149 y prueba adicional de coherencia cabecera/version.json/actualizador. Sintaxis JS y manifiesto PWA correctos.
- Pendientes: QA autenticada de la última versión publicada, persistencia tras recarga/nueva sesión y móvil. El navegador volvió al formulario de acceso tras recargar, sin error de aplicación visible; no atribuir causa sin evidencia. Edición de tramos futuros aún usa compensación cliente; falta atomicidad SQL frente a cierre abrupto. No afirmar auditoría integral cerrada.

## Rediseño de Tesorería — build 30109 (2026-10-21)

- Versión 3.0.0-rc.1.72. Tesorería deja de presentar cuentas bancarias, saldos por cuenta, captura de saldos, diagnósticos por estados y previsiones largas como contenido principal.
- Nueva lectura operativa: Saldo hoy; Ingresos del mes (previsto, cobrado, queda por cobrar); Pagos del mes (previsto, pagado, queda por pagar); Saldo previsto fin de mes; próximos cortes de caja de los días 10 y 25; Atención con vencidos y vencimientos de hoy.
- Los movimientos realizados se usan para cobrado/pagado; los pendientes hasta fin de mes para queda por cobrar/pagar. Los vencidos anteriores al mes se mantienen visibles en Atención y siguen afectando a la caja mientras continúen pendientes.
- Las cuentas siguen existiendo como metadato y fuente técnica del saldo consolidado, pero desaparecen del protagonismo visual: el usuario ve un único saldo total sin importar dónde esté el dinero.
- Inicio cambia “Previsión al acabar el mes” por “Saldo previsto fin de mes” y sus pendientes incluyen vencidos para no ocultar obligaciones o cobros arrastrados.
- Se corrige APP_BUILD, que seguía anclado a 30083 pese a que la aplicación ya estaba en 30108. Producción no modificada.
- Pendiente de QA visual autenticada en móvil/escritorio y de validar cifras reales tras propagación de GitHub Pages.

## QA autenticada completada — build 30108 (2026-10-21)

- Acceso seguro recuperado y cabecera autenticada 30108 comprobada. Se completan las dos pruebas específicas pendientes de 30107 y 30108; sin cambios de código ni nueva build.
- Caso sintético de anotación: documento indica un titular y DOMUS ACTIVIDAD con el nombre corto de otro. Revisión muestra JM, ámbito Actividad económica y origen anotación explícita; total 10,00 y fecha 21/10/2026. Pagador/cuenta vacíos. Verificado en controles DOM, sin crear movimiento.
- Caso sintético de pago: tarjeta e IBAN de cuentas distintas. Revisión muestra el aviso La tarjeta y el IBAN señalan cuentas distintas; revisa el pago. Titular documental Jeni conservado; pagador y cuenta Sin especificar. No publicar IBAN ni datos de maestros privados en código, tests o capturas del repositorio.
- Ambas propuestas se cierran con Siguiente sin guardar / Cerrar sin crear movimiento, se reabren desde Archivo de referencias y recuperan titular/ámbito o aviso/pago vacío, respectivamente. Cierre final comprobado. Dos referencias nuevas en review, no dos movimientos económicos; los originales reales del cotejo anterior no se han vuelto a subir.
- Comprobación SQL antes y después: 1952 filas en movement_series, digest bacb94d48c45d6d3eae876d8bb5bb051 idéntico. Sin Crear/Sustituir/Vincular, cambios de esquema, producción ni TransportERP. Suite publicada 142/142 preservada; no se repite por este cambio solo documental.
- Evidencia visual inspeccionada internamente; no se publica con datos personales o bancarios. La restricción del navegador de la sesión anterior ya no bloquea esta comprobación.
- Pendientes generales conservados: sustitución transaccional aislada y QA móvil completa, entre otros registrados más abajo. Estas dos comprobaciones no equivalen a cierre integral de DOMUS.

- Durante el cierre se detectó en main una actualización independiente de Tesorería 30109. Se conserva íntegra; estas pruebas corresponden al lector servido en 30108, no validan el rediseño de Tesorería ni su nueva build.

## Evidencia de pago contradictoria — build 30108 (2026-10-20)

- Versión 3.0.0-rc.1.71. Corregido fallo reproducido: una tarjeta reconocida omitía el contraste con IBAN porque el bloque solo se ejecutaba sin cuenta propuesta. Ahora contrasta ambas evidencias, avisa ante cuentas distintas o varios alias coincidentes y retira sugerencias automáticas de pagador/cuenta. Conserva valores explícitos y titular económico.
- El aprendizaje histórico no rellena pagador/cuenta mientras exista contradicción documental. Tarjeta e IBAN concordantes conservan la pareja; las instrucciones bancarias del emisor de una factura emitida siguen excluidas. No modifica movimientos existentes ni guarda reglas nuevas.
- Regresiones con datos ficticios: contradicción tarjeta/IBAN pese a tres antecedentes unánimes, concordancia, exclusión bancaria del emisor, conservación de selección explícita y ambigüedad de cuentas. Dos fallos reproducidos antes de corregir; archivo de familias 54/54 tras la corrección.
- Navegador bloqueado por native credential state cannot be safely resumed incluso tras reinicio y apertura canónica. Sin intentos de extraer credenciales ni otro canal de autenticación. QA específica de 30107 y 30108 en pantalla pendiente.
- Suite completa 142/142, cero fallos, incluida integridad PWA y sintaxis inline. Código 98a1c08b30c244aedd1bfc5fb8eb15ae96682b0c; Pages 39489989082 completed/success. version.json, index.html, asset-manifest.js y sw.js servidos idénticos byte a byte a los probados. Cabecera autenticada y prueba funcional de esta build no verificadas por bloqueo del navegador.
- Comprobación SQL posterior: 1952 filas en movement_series y digest bacb94d48c45d6d3eae876d8bb5bb051, idénticos al control anterior de 30107. Sin escrituras económicas, nuevas referencias documentales ni cambios de esquema en esta ejecución. Producción y TransportERP intactos.
- Reanudar por la QA específica de anotación de titular y conflicto tarjeta/IBAN cuando exista un navegador utilizable. El cotejo de originales anterior permanece documentado; no afirmar cierre integral del lector, sustitución transaccional ni QA móvil.

## Anotación explícita de titular — build 30107 (2026-10-20)

- Versión 3.0.0-rc.1.70. DOMUS ACTIVIDAD seguido del nombre corto o alias exacto de una única persona activa prevalece sobre el titular leído del documento. El ámbito se marca actividad. No cambia movimientos ya guardados, pagador ni cuenta por esa anotación.
- Ante empate, nombre inactivo, ausencia de nombre o coincidencia parcial conserva el titular documental. Pruebas con identidades ficticias; sin datos privados en código.
- Suite completa 139/139, sintaxis inline e integridad PWA correctas. Código 9eb51218cd88e84be53e08ea53d5826431c1b2e6; Pages 39488436085 completed/success. version.json, index.html, asset-manifest.js y sw.js publicados idénticos byte a byte a los probados. Cabecera autenticada 30107 observada tras recarga; sesión recuperada.
- El error inicial de GitHub Pages desapareció tras una recarga. Acceso seguro completado. Al preparar el caso sintético, navegador bloqueado por retained_data_restricted tras native credential delivery y reinicio del kernel. La prueba funcional de la anotación en UI sigue pendiente; no inferir éxito del caso ni iniciar otra vía de credenciales. No se pulsó Leer/Crear/Sustituir/Vincular en esta ejecución.
- Comprobación económica a las 20:05 UTC: 1952 filas, digest bacb94d48c45d6d3eae876d8bb5bb051. Hay 43 altas con la misma marca 2026-10-20 19:58:13.130686+00 respecto al punto anterior. Autor/origen no atribuidos. Las 1909 filas anteriores conservan exactamente el digest 5d6078f910ecc800d9cc29170e84a0c4: no hay cambios en ese conjunto. No revertir ni tratar las 43 altas como datos de prueba de esta ejecución.
- El ajuste local que figuraba pendiente en 30106 queda publicado con esta build. Pendiente solo su prueba funcional autenticada específica; no equivale a cierre integral del lector, sustitución transaccional ni QA móvil. Producción y TransportERP no modificados.

## Cierre de QA autenticada — build 30106 (2026-10-20)

- Código ef95625d7799797504db38d148b4aaff495b50ca, versión 3.0.0-rc.1.69. Pages 39379684705 completed/success; cabecera autenticada 30106 comprobada tras activar la PWA. Suite completa 137/137.
- Alias de personas y cuentas, y dos reglas de tarjeta confirmadas, guardados desde la UI autenticada. Recarga recupera ambas reglas. JM reconoce José Manuel; se conservan nombres visibles e identificadores. No se publican identidades completas, IBAN ni UUID privados en código o pruebas.
- Cuatro originales releídos y propuestas reabiertas desde Archivo: combustible 25,00, fecha 02/10/2026 recuperada por relectura sin filtro, número del archivo normalizado, titular y categoría Combustibles correctos; autofactura G26 de 293,65 con titular JM, Ingresos Variables/actividad y duplicado existente visible; dos RHD de 12,04 y 21,85 con titulares respectivos, Gastos financieros/actividad y cuenta por IBAN explícito. Pagador permanece vacío donde no hay evidencia; instrucciones bancarias del emisor G26 no se atribuyen al hogar.
- Las dos reglas de tarjeta se comprobaron en navegador con textos sintéticos, no con PDF reales: titular económico distinto del pagador en ambos sentidos y cuenta correspondiente. Cierre mediante Siguiente sin guardar / Cerrar sin crear movimiento.
- Cuatro referencias reales y dos sintéticas quedaron para revisión. Una primera referencia sintética adicional quedó processing sin propuesta por archivo no accesible al navegador; los dos casos se repitieron después con archivos accesibles y dieron resultado correcto. No borrar esa referencia ni confundir referencias documentales con movimientos.
- En esta comprobación no se pulsó Crear, Sustituir ni Vincular sobre movimientos reales. Verificación SQL posterior: 1909 filas en movement_series del hogar, con digest idéntico al anterior (5d6078f910ecc800d9cc29170e84a0c4). Esta igualdad verifica esa tabla, sin afirmar un hash de todas las tablas económicas.
- Pendiente identificado: anotación explícita DOMUS ACTIVIDAD con nombre corto debe resolver coincidencia exacta de nombre/alias activo y prevalecer sobre titular documental. Ajuste local y regresión anonimizada pasan el archivo de familias (50/50), pero no se ejecutó suite completa, no se selló nueva build y no se publicó. No forma parte de 30106.
- Al retomar, ejecución local y navegador no están disponibles. No declarar probado ni desplegado el ajuste pendiente. Conservarlo como trabajo a recuperar y validar cuando vuelva el entorno.
- Continúan pendientes generales de sustitución transaccional aislada y QA móvil completa. Producción y TransportERP no modificados. Este cierre corresponde al cotejo descrito, no al cierre integral de DOMUS.

## Reconocimiento por alias y pago explícito — build 30106 (2026-10-20)

- Versión 3.0.0-rc.1.69; suite completa 137/137. Estado inicial al redactar; publicación y QA completadas según la entrada superior.
- Usuario confirma JM = José Manuel. People/accounts incorporan aliases text[] editables en el mismo editor de maestros; nombres visibles e identificadores económicos se conservan. Reconocimiento ignora inactivos y no decide ante empates. No se codifican personas, NIF, IBAN o UUID privados en frontend ni migración.
- Reglas de tarjetas editables/desactivables en Ajustes, separando titular económico de pagador/cuenta. Terminación se usa solo cuando acompaña etiqueta de tarjeta, y debe corresponder a una regla y maestros activos. IBAN explícito puede proponer cuenta única por alias, sin inferir pagador; no usa instrucciones bancarias del emisor de una factura emitida. Evidencia contradictoria se señala.
- Clasificación por familias hacia categoría única activa: combustible, RHD, ingresos variables y supermercados. No infiere ámbito profesional por combustible/persona. Respeta clasificación explícita y anotaciones DOMUS.
- Proveedor histórico genérico Documento/factura/ticket se considera desconocido al buscar duplicados. Mismo número aparece para revisión, sin autorizar sustitución. Crear desde documento se bloquea si hay candidato con emisor desconocido, evitando duplicación.
- Relectura sin filtro en inglés solo si falta fecha OCR. Prueba local del escaneo recupera 02/10/2026; no se corrigen dígitos ni fechas por inferencia. Fecha existente conserva prioridad; fechas inválidas/ambiguas/futuras lejanas no se adoptan. Validación real de navegador pendiente.
- Esquema aditivo aplicado por SQL solo a pmgonotpbmybtwvxbcvf. Script idempotente generado con CLI en supabase/migrations/20261020061015_rc1_document_recognition_aliases.sql; no se ha anotado como aplicada en migration history por CLI. RLS y políticas existentes intactas; advisors sin hallazgos nuevos.
- Intento de poblar aliases y reglas mediante SQL rechazado por stamp_base_audit: Sesión requerida. Transacción íntegramente revertida, comprobado aliases y reglas vacíos. No se desactivó trigger ni se suplantó sesión; se guardarán desde UI autenticada.
- Pruebas nuevas cubren alias/inactivos/ambigüedad, tarjeta de pagador distinto al titular, IBAN único, exclusión de datos bancarios del emisor, clasificación, bloqueo de duplicado desconocido, fecha alternativa y migración aditiva idempotente/RLS.
- Pendientes inmediatos: publicar, configurar alias y tarjetas ya confirmados desde UI, releer originales autorizados para JM/RHD/Moeve/G26, verificar persistencia de ajustes. Producción/TransportERP y movimientos económicos intactos.

## Cotejo real finalizado y TGSS verificado — 30105 (2026-10-20)

- Código 8a1ebc9a2f01ba15605d8cafc057d4d4b1f67cfc; Pages 39378186252 completed/success. version.json y cabecera autenticada coinciden en 30105 / 3.0.0-rc.1.68. Suite completa 128/128.
- Relectura autorizada de TGSS original desde UI 30105: 302,60, 30/09/2026, Cuota autónomos TGSS, clase standard, sin nº factura; justificante de cargo/revisión obligatoria. Crear desactivado, selector existente vacío, comprobación sin marcar. Ofrece una ocurrencia coincidente de 302,60 en 30/09, sin seleccionarla. Cierre sin crear/vincular/sustituir.
- Recarga posterior y Documentos recuperan las nueve referencias originales nuevas + una relectura TGSS, todas review. Diez nuevas referencias, no diez movimientos. La propuesta TGSS anterior de 30104 permanece para trazabilidad y NO debe usarse como válida: conserva el fallo detectado; la lectura nueva es la corregida. No se han reescrito propuestas antiguas en bloque ni borrado datos.
- Cotejo de los nueve originales realizado; no equivale a cierre integral del lector. Permanecen fecha OCR de combustible, alias JM, categorías/pagador/cuenta y equivalencias de emisor G26. Sin operaciones económicas ni cambios en producción/TransportERP.

## Cotejo autenticado de nueve originales; corrección TGSS — build 30105 (2026-10-20)

- Autorización expresa del usuario recibida para cargar los nueve originales y guardar propuestas sin crear movimientos. Acceso seguro y sesión Staging recuperados, build 30104 comprobada.
- Los nueve PDF procesados desde selector UI; nueve nuevas referencias en review, diez propuestas (RHD múltiple tiene dos). Revisados los nueve mediante Siguiente sin guardar y cierre final sin crear/vincular/sustituir movimientos. No se suben originales privados al repositorio.
- Importes en controles UI: dos G26 293,65/51,91, emitida 72,60, combustible 25,00, RHD 21,85/12,04/18,08+31,20/46,02, justificante 302,60. Fechas leídas correctas salvo combustible: OCR navegador deja fecha vacía (original 02/10); número se toma del archivo según decisión del usuario y coincide. Base/IVA de G26, emitida y combustible coherentes.
- RHD conserva grupos separados y avisa referencias pendientes cuando falta ingreso. Emitida identifica Jeni/cliente; RHD de Jeni y combustible identifican Jeni. Titular de JM queda vacío en G26 y RHD de JM por alias corto en maestros; no inventado. Pagador/cuenta y categorías siguen mayoritariamente vacíos. Combustible muestra duplicado compatible existente. G26 ya figuran en movimientos; revisión no señala equivalencia de emisor, pendiente de corregir/validar.
- Hallazgo real grave: PDF.js ordena encabezados antes que valores en TGSS. Parser anterior caía a lector genérico, proveedor Timestamp/clase comisión y Crear habilitado. Ninguna acción económica ejecutada.
- Corregido: TGSS/adeudo siempre permanece justificante con revisión obligatoria; fila explícita importe/comisión/fecha permite recuperar 302,60 y 30/09. Si no puede leer importe, queda null/revisión y nunca pasa a gasto simple. Prueba anonimizada con orden real de PDF.js y variante incompleta.
- Reproducción local usa PDF.js 4.10.38 y reconstrucción de texto idéntica al navegador sobre los ocho PDF con texto; escaneo tratado aparte. Herramienta de comparación y resultados privados fuera del repositorio.
- Pendientes al redactar: suite completa/publicación de 30105 y releer solo TGSS real para verificar bloqueo de Crear. Los otros defectos (fecha OCR combustible, alias JM, equivalencias de emisor, categorías/pagador/cuenta) permanecen abiertos; no declarar motor terminado.
- Producción, TransportERP, movimientos económicos, saldos y conciliaciones intactos.

## Cotejo de nueve originales y referencia partida — build 30104 (2026-10-20)

- Releídos los nueve PDF originales del lote adicional, extracción local con pdftotext -layout y OCR del escaneo de combustible; sin transferencia a DOMUS ni escrituras económicas. Originales, textos y resultados privados fuera del repositorio.
- Cotejo del lector de 30103 con catálogos ficticios representativos: cuatro RHD generan cinco costes (uno tiene dos grupos), dos autofacturas G26 con total y fiscalidad coherentes, una factura emitida como ingreso, un justificante TGSS de revisión/vinculación obligatoria y un escaneo de combustible con discrepancia de número señalada. El usuario confirma que el número es el nombre del archivo: se prioriza el nombre numérico serie:número, normalizado a serie/número, conservando OCR como trazabilidad y sin confirmación adicional. Fechas e importes contrastados con originales. El harness usa dateKey local de la aplicación, no ISO/UTC del stub unitario.
- Hallazgo corregido: etiqueta Transporte al final de columna, IVA/precio a su derecha y número # en la línea siguiente. Se recupera exclusivamente la referencia explícita tras ese contexto, sin aceptar números de registro aislados. Nueva regresión anonimizada.
- Suite completa final tras sellar build: 127/127, incluida integridad PWA. Código a5e16e22e10667b6601091b9dd6c299b9db6755e; Pages 39377210264 completed/success; version.json devuelve 30104 / 3.0.0-rc.1.67. Cabecera en navegador tras actualización PWA muestra 30104.
- Pendiente auténtico: repetir en UI autenticada con los nueve PDF originales y comprobar duplicados contra datos de Staging. Acceso seguro completado: sesión autenticada mostró Documentos en 30103, y cabecera 30104 comprobada tras actualización. Dos autofacturas G26 del lote ya figuran como ingresos (51,91 y 293,65) y referencias confirmadas en la UI; no se han subido de nuevo. El resto de originales sigue pendiente de nueva lectura autenticada. Autorización específica de transferencia anterior solo cubría los otros dos PDF VS/V26, según 30102; no dar esta comprobación por terminada.
- El cotejo local no es QA autenticada ni prueba del OCR de navegador. No se han creado movimientos, subido originales, modificado saldos/conciliaciones, producción o TransportERP.

## Aprendizaje documental conservador — build 30103 (2026-10-20)

- Versión 3.0.0-rc.1.66. Retoma 30102 sin repetir auditoría ni transferir documentos privados.
- Las sugerencias históricas requieren al menos tres antecedentes confirmados. Categoría/ámbito admiten mayoría >=90%; titular y actividad exigen unanimidad. Campos ausentes cuentan contra la confianza. No altera movimientos existentes.
- Con titular explícito, las sugerencias se limitan a sus antecedentes. Pagador y cuenta se aprenden juntos de una pareja consistente, respetando los campos explícitos y sin mezclar titulares. Roles de gasto separados: un gasto normal no aprende de comisiones/seguros del mismo emisor.
- Regresiones nuevas: mayoría 9/10 frente a identidad contradictoria; pareja pagador/cuenta con faltantes/contradicciones; enriquecimiento completo con dos titulares y roles distintos. Conserva precedencia documental y exclusión de ámbito por estación de combustible.
- Suite completa 126/126, cero fallos; sintaxis inline e integridad PWA verificadas. Código bdf8432f027689275a95a2aa6a0257cb90b8dbe1; Pages 39376308866 completed/success. version.json sirve 30103 / 3.0.0-rc.1.66; index servido muestra Build 30103, contiene historicalPaymentPair y coincide con SHA256 del manifest servido. QA autenticada de este bloque no repetida; no equiparar verificación HTTP con prueba funcional autenticada. No hay escrituras económicas, cambios backend, migraciones ni acceso a producción/TransportERP.
- Continúan pendientes: reglas de tarjetas por evidencia estructurada, sustitución transaccional aislada, aprendizaje persistente de reglas nuevas y QA móvil completa. No declarar cierre integral.

## Comprobación autenticada completada del bloque 30102 — 2026-10-20

- Commit de código bcdd56c9576d59a665723e8a7112d1b2acf24993; Pages workflow 39373608252 completed/success. Endpoint y cabecera autenticada coinciden en 30102 / 3.0.0-rc.1.65. Suite completa 123/123.
- Tras recarga, las cuatro referencias sintéticas nuevas se recuperan en review. RHD abre dos tarjetas de 18,08 y 31,20, scroll de modal/caja cero, prefinanciación de ingreso oculta para ambos gastos. Factura emitida abre como ingreso con prefinanciación visible y clase de gasto oculta; cambiar tipo en pantalla actualiza visibilidad y cerrar sin crear no persiste ese cambio.
- TGSS reabierto sobre 30102: importe 302,60; selección de movimiento vacía; comprobación sin marcar; Crear desactivado. Combustible: 25,00; número de lectura distinto del archivo; comprobación sin marcar; ámbito vacío. Cerrados sin crear/vincular/sustituir.
- Evidencia visual guardada solo para inspección interna. No se publican capturas ni originales privados en el repositorio. No nuevas referencias aparte de las cuatro sintéticas descritas; no escrituras económicas ni cambios en saldo/conciliación.
- Alcance verificado: análisis de nueve PDF reales localmente y flujo navegador con cuatro equivalentes sintéticos. Pendiente repetición autenticada con esos nueve originales: autorización anterior específica de transferencia correspondía a VS-26-154071 y V26-162583; no ampliar silenciosamente a otros PDF con datos fiscales/bancarios.
- Persistencia de confirmación parcial, error al guardar y conservación de edición/asociaciones/predefinición probadas de forma aislada. No se ha ejecutado Crear/Sustituir/Vincular sobre movimientos reales. Continúan los pendientes generales: sustitución transaccional aislada, pagador/medio por evidencia, aprendizaje de reglas y móvil completo. No declarar cierre integral de DOMUS.
- Producción y TransportERP intactos. Reanudar desde 30102 sin repetir auditoría ni pedir permiso para tareas técnicas ordinarias de Staging.

## Conservación completa de revisión pendiente — build 30102 (2026-10-20)

- Versión 3.0.0-rc.1.65; suite completa 123/123. Extiende 30101: conserva selección de prefinanciación, fecha disponible y asociaciones manuales de otras tarjetas cuando se confirma una; una selección vaciada manualmente no se vuelve a inferir al renderizar.
- Factura emitida sintética verificada en navegador sobre 30100: ingreso 72,60, fecha 19/10/2026, nº 20261019, titular Jeni, cliente de prueba como contraparte, base 60 e IVA 12,60; cobrador vacío. Cerrada sin crear movimiento. Cuarta referencia sintética nueva en review.
- Totales acumulados de pruebas de esta ejecución: 7 referencias reales anteriores autorizadas + 7 sintéticas (3 previas, 4 nuevas); ninguna contabilizada por estas pruebas. Nueve originales nuevos solo leídos localmente.
- 30101 código bfc43e2b221cb3e5ac8c8fd0634ed6a98df9d959. 30102 sustituye a 30101 para comprobación final; no se declara QA de 30102 hasta observar cabecera y revisión actualizadas.
- Producción, TransportERP, saldos, conciliaciones y movimientos económicos intactos. Sin cambios de esquema/backend.

## QA autenticada 30100 y ajustes de revisión 30101 — 2026-10-20

- Acceso seguro recuperado, cabecera autenticada Build 30100 y maestros cargados.
- Lote de tres PDF sintéticos leído en navegador: RHD presenta dos tarjetas (18,08 y 31,20) con fecha 03/08/2026, clase prefinance_fee y grupos de referencias separados; TGSS muestra 302,60, fecha 30/09, nº factura vacío, crear desactivado, selección existente vacía y comprobación sin marcar; combustible muestra 25,00, 02/10, ámbito vacío y discrepancia OCR/archivo con confirmación sin marcar.
- Se avanzó y cerró usando Siguiente/Cerrar sin crear. Tres referencias sintéticas nuevas en review; ninguna escritura económica. Los nueve originales nuevos siguen sin transferirse.
- Build 30101 / 3.0.0-rc.1.64: al abrir o avanzar revisión vuelve al principio; opción Ingreso prefinanciable solo en ingresos; confirmar una tarjeta captura las modificaciones de las demás tarjetas pendientes antes de volver a renderizar. Sin cambios fiscales ni de importes.
- Suite completa 122/122. Publicación 30101 y comprobación final de estos ajustes pendientes al redactar. Factura emitida sintética en proceso de revisión, no declarar resultado todavía.
- La confirmación/vinculación económica sigue probada solo mediante stubs; no se ejecutó creación/sustitución/vinculación contra movimientos reales. Producción y TransportERP intactos.

## Publicación 30100 confirmada; QA autenticada bloqueada — 2026-10-20

- Código publicado: 3f2123d0a431ea384e10a6685965eed009db2797. Endpoint público version.json devuelve 3.0.0-rc.1.63 / build 30100. Suite completa previa al commit: 121/121.
- La sesión anterior no existía. Se abrió la URL canónica, que mostró login. Solicitud browserAuth de correo/contraseña agotó tiempo de espera; al intentar navegación de recuperación el runtime había perdido verifyTab. Estado de acceso desconocido; no se infirió éxito ni se reintentaron credenciales por otro canal.
- Pendiente: nueva sesión segura y QA en pantalla de RHD múltiple, factura emitida, prueba TGSS y OCR de combustible. La lectura local y los tests aislados sí están verificados. No se subieron los nueve originales ni se modificaron movimientos económicos.
- No dar por completada esta QA ni el cierre general del producto. Producción y TransportERP intactos.

## Lector documental y revisión múltiple — build 30100 (2026-10-20)

- Versión 3.0.0-rc.1.63. Suite completa 121/121, 0 fallos. Publicación y comprobación autenticada pendientes al redactar esta entrada.
- Análisis local de nueve PDF adicionales: RHD con dos costes en un mismo documento (18,08 y 31,20), grupos de referencias independientes y salto de página; factura emitida 72,60 como ingreso; cargo TGSS 302,60 como justificante; combustible 25,00 con discrepancia OCR/nombre de archivo; dos G26 con totales y fiscalidad coherentes. Los originales privados no se incorporan al repositorio.
- RHD ahora devuelve una propuesta por coste e impide que enriquecerla añada referencias de otros grupos. Confirmar una propuesta conserva las restantes en revisión; cada propuesta almacena su vínculo y el documento se confirma solo al terminar todas. Historial y detalle de movimientos reconocen vínculos múltiples.
- Justificante TGSS no crea factura nueva: exige revisión y selección manual de un movimiento existente. Vincular solo adjunta documento y confirma propuesta, sin modificar importes, fechas ni estado económico. Cobertura aislada de esta escritura; no ejecutada contra movimientos reales.
- Combustible muestra discrepancia de número y exige confirmación antes de crear. No infiere ámbito profesional por estación/producto. Factura emitida identifica titular en el encabezado anterior a Facturar a y usa cliente como contraparte; no infiere pagador/cuenta a partir del IBAN del emisor.
- Pruebas añadidas anonimizadas: separación RHD y referencias tras enriquecimiento; confirmación parcial; error de persistencia; vinculación sin cambios económicos; discrepancia OCR; emisor/cliente; justificante bancario.
- Ningún movimiento económico, saldo, conciliación ni pago/cobro alterado. Nuevos PDF leídos solo localmente; no transferidos todavía a Staging. Sesión del navegador anterior no disponible: página actual solicita acceso. Pendiente QA autenticada de las propuestas nuevas; no declarar validación integral.
- Producción y TransportERP no modificados. Sin migraciones ni despliegue backend. Continúan los pendientes generales de la entrada anterior.

## Validación final real sobre 30099 — 2026-10-19

- Código main 453ab489039d912ce1cd436c4d78d53f8b481236, versión 3.0.0-rc.1.62 / build 30099. version.json y cabecera autenticada coinciden; publicación comprobada.
- Suite completa 114/114, 0 fallos; scripts inline compilan e integridad PWA validada. Los fallos iniciales se resolvieron según entrada 30095, sin relajar la protección de sesión ni cambiar el criterio financiero vigente.
- Arranque inmediato: lectura autorizada de VS-26-154071 mostró Preparando personas y cuentas y continuó al recibir maestros; titular económico identificado de forma concordante con la ficha, pagador vacío. Total 9,44 €, fecha 2026-10-08, insurance; referencia pendiente solo 2624000. No aparece el número de registro espurio.
- V26-162583 leído también sobre 30099: titular concordante, total/base neta 14,25 €, fecha 2026-10-14, sin cuota IVA inventada. Referencia G261014-017735-375400-1 pendiente de asociar y no forzada.
- Ambos resultados verificados mediante controles DOM y cerrados usando Cerrar sin crear movimiento. No se pulsaron Crear, Sustituir, Vincular, pagos/cobros, saldos ni conciliaciones.
- Total de referencias de prueba creadas durante la ejecución: 7 lecturas reales autorizadas de esos dos PDF y 3 sintéticas; todas review sin contabilizar. La tentativa bloqueada en 30098 no creó referencia. Se conservaron las pruebas para trazabilidad, no se borraron documentos ni movimientos anteriores.
- Estado por alcance: A auditada; B VS antiguo en regresión y Baloise real en navegador; C/D asociaciones/detección reforzadas y sustitución limitada, sin ejecutar reemplazo real; E/F evidencia explícita e histórico confirmado, preparación fiable de maestros; G revisión simplificada, recuperación y avance sin contabilizar; H suite verde y despliegue verificado.
- No es cierre integral del producto: faltan casos reales adicionales G26/RHD/combustible, prueba de sustitución transaccional en entorno aislado, pagador/tarjetas por evidencia estructurada, aprendizaje de reglas nuevas y revisión móvil completa. No declarar esas partes completadas.
- Reanudar desde este commit/build sin repetir la auditoría. Los dos PDF ya autorizados no requieren una nueva autorización para esta misma finalidad. No extender autorización de transferencia a otros documentos privados sin verificar su alcance.
- Producción y TransportERP no modificados. Cambios de esta ejecución confinados a DOMUS Staging; contrato backend solo recibió el mensaje de error compatible, sin migración ni despliegue backend.

## Espera de carga concurrente antes de interpretar — build 30099 (2026-10-19)

- Suite completa 114/114, 0 fallos. Dos controles adicionales: una lectura de datos reemplazada por otra no se interpreta como fallo definitivo; cambio de usuario/hogar durante espera bloquea interpretación.
- 30098 60ac0f13a76b651a04dd74780cc52a62a34906b8 publicado y verificado. Prueba inmediata ejerció Preparando personas y cuentas, pero guard detectó aún catálogos no disponibles al retornar refreshAll y bloqueó antes de crear referencia.
- refreshAll puede retornar anticipadamente si otra actualización lo reemplaza. prepareDocumentCatalogs ahora espera evento de datos listos de la carga vigente, no solo el retorno de su llamada; espera acotada a 30 s y verifica actor/hogar. Rechazo/timeout muestra causa clara.
- No se inició lectura del PDF en esa prueba fallida ni se creó otra referencia. Archivo seleccionado quedó preparado para reintento. No hay escrituras económicas.
- Mantener pendientes los controles de titular en arranque hasta verificarlos sobre 30099; no dar por superada esa prueba a partir de los tests aislados. Total/importes/fechas/clases y exclusión de registro como transporte ya verificados en 30096/30097.
- Pendiente comprobar despliegue 30099 y reintentar un PDF autorizado; si falla carga de catálogos, investigar sin inventar titular ni crear movimientos. Producción y TransportERP intactos.

## Preparación de maestros antes de lectura — build 30098 (2026-10-19)

- Suite completa 112/112, 0 fallos. Regresión nueva: preparar maestros una vez y rechazar lectura si no se pueden cargar, en vez de interpretar con listas iniciales vacías.
- Build 30097 a1dc12081b0a49778237a67ba5ab112408260f2e publicado, cabecera/version.json verificadas. Relectura autorizada de VS real en 30097 mantiene 9,44 y 2026-10-08; aviso contiene solo transporte 2624000 y excluye número de registro espurio. Cierre sin crear pendiente al redactar esta entrada.
- Revisión visual detectó titular sin especificar al importar inmediatamente tras apertura, frente a identificación correcta anterior cuando maestros ya estaban cargados. importSelectedDocuments no esperaba a la carga inicial y podía analizar con people/accounts vacíos.
- Corregido: prepareDocumentCatalogs espera datos cargados antes de crear referencias y analizar PDFs; flag se reinicia al cambiar hogar. No obliga a crear ni configurar personas/cuentas y un catálogo vacío cargado correctamente es válido.
- Si la carga falla, mensaje claro y no comienza el bucle de inserción documental. Sin cambios de permisos, esquema o datos económicos.
- Pendiente despliegue 30098 y comprobación de titular leyendo uno de los dos PDF ya autorizados después de recargar. No confirmar Crear/Sustituir/Vincular.
- Las pruebas han creado hasta esta entrada cinco referencias reales en review (dos pares + seguro 30097), además de tres sintéticas. No se han creado/modificado movimientos económicos ni saldos/conciliaciones. Producción y TransportERP intactos.
- Pendientes de producto y validación general siguen en entradas anteriores; no se declara terminado todo A–H.

## Referencias de transporte con contexto — build 30097 (2026-10-19)

- Suite completa: 111/111, 0 fallos. Añadidos controles RHD (coste frente a neto transferido; liquidación incompleta con revisión obligatoria) y rechazo de números de registro como referencias de transporte.
- 30096 publicado/verificado en navegador, cabecera y version.json; carga inicial muestra Cargando referencias y fecha alternativa queda vacía.
- Relectura autorizada de los mismos dos PDF en 30096: seguro 9,44 / 08-10 / insurance; comisión 14,25 / 14-10 / commission, base neta 14,25, cuota IVA vacía con reverse charge. Pagador no inventado. Archivo de referencias confirma fechas 08/10 y 14/10, no día de carga. Se cerró sin crear ni vincular movimientos.
- QA real reveló que el regex genérico de 7/8 cifras trataba un número de registro del asegurador como transporte. Corregido: solo números acompañados por transporte/viaje o referencias INV-ES/ON-ES. No se reclasifican registros históricos ni se corrigen propuestas antiguas automáticamente.
- Referencia G26 de la comisión permanece explícita y se muestra pendiente cuando no hay ingreso coincidente disponible. No se fuerza relación ni se crea ingreso.
- Base: 30096 b81ec59391e90c657872d445bc34bb25ebec2917. Pendiente verificación de publicación y aviso corregido sobre PDF real en 30097. Autorización de esos dos PDF sigue vigente; no pedirla otra vez.
- Se han creado en esta sesión dos pares de referencias/propuestas de los dos PDF (primera lectura 30093 y relectura 30096), además de tres QA sintéticos. Todos permanecen review, sin contabilizar. No eliminados por falta de borrado documental reversible. No confundir referencias de prueba repetidas con movimientos económicos duplicados.
- No se han probado sustituciones sobre movimientos reales. Fases A–H siguen parcialmente pendientes según entradas anteriores; no declarar cierre total. Producción y TransportERP intactos.

## Fecha documental y límites de sustitución — build 30096 (2026-10-19)

- Suite completa 108/108, 0 fallos. Tres regresiones nuevas de fecha/metadatos y sustitución, sin ejecutar escrituras económicas reales.
- Eliminado valor automático de hoy en fecha alternativa de carga; se presenta como Fecha alternativa si no se puede leer. Se usa únicamente si no hay fecha extraída válida.
- Tras lectura, documents.document_date refleja una fecha única válida extraída, en vez de conservar silenciosamente el día de carga. Fechas contradictorias/imposibles no se inventan. Documentos antiguos no se han corregido en bloque.
- Sustitución desde lector preserva start_date del movimiento existente. Movimientos ya realizados o recurrentes se bloquean y remiten a Editar movimiento, evitando alterar sus calendarios desde una factura.
- Base 30095 commit ced41c2a42952693795599da99990a69070dddca, con 105/105 pruebas. Continúa vigente el criterio financiero documentado en 30054 y el mensaje preciso de cambio de sesión.
- Pendiente verificación de publicación 30096 y nueva lectura de los dos PDF autorizados para confirmar metadatos y avisos. Mantener sin pulsar Crear/Sustituir/Vincular. No se ha probado transacción real de sustitución ni conciliaciones.
- Alcance pendiente general: casos G26/RHD/combustible adicionales, pagador/tarjetas por evidencia estructurada y aprendizaje de nuevas reglas. No declarar cierre total del encargo. Producción y TransportERP intactos.

## Cierre de fallos previos de regresión — build 30095 (2026-10-19)

- Suite completa: 105/105, 0 fallos. No equivale al cierre integral de todas las fases del encargo.
- Fallo 1 era expectativa obsoleta: test documental previo a la decisión registrada en 30054. Actualizado a criterio financiero vigente: pendiente por prevista, realizado por actual_date; conserva documentDate independiente. Añadido caso de tres meses distintos. No se ha modificado la lógica de cálculo ni el criterio de informes para satisfacer el test.
- Fallo 2 era mensaje erróneo: protección de cambio de sesión bloqueaba correctamente pero el Error genérico se traducía a integridad del historial. Ahora usa TreasuryError SESSION_CHANGED y conserva el bloqueo antes de enqueue. La prueba original de cambio de usuario pasa sin relajar sus aserciones.
- Mensaje agregado también en copia backend del contrato para preservar paridad exacta; ninguna migración, operación de tesorería, cambio RLS ni despliegue backend. Hashes de módulos cliente e index recalculados; SW/version/manifest 30095 / 3.0.0-rc.1.58.
- Incluye mejoras documentales de 30094 (commit 8976a053d7c56e85bd047b2469d4dab06a9db8a1). Pendiente comprobar publicación de 30095 y repetir lectura de los dos PDF reales ya autorizados; no confirmar movimientos.
- Permisos/seguridad: autorización específica recibida para los dos PDF; no pedirla de nuevo para la misma transferencia. G26/RHD/combustible real adicional no se ha cargado. Producción y TransportERP intactos.

## PDF reales autorizados y asociaciones seguras — build 30094 (2026-10-19)

- Usuario autorizó expresamente la carga de VS-26-154071.pdf y V26-162583.pdf desde Library a DOMUS Staging y el guardado de referencias/propuestas, sin movimientos económicos. Bloqueo de transferencia anterior resuelto por esa autorización.
- Ambos PDF seleccionados juntos y procesados desde UI autenticada de 30093. Seguro: número VS-26-154071, total 9,44, fecha 2026-10-08, expense/business/insurance. Comisión: V26-162583, 14,25, 2026-10-14, expense/business/commission. Titular identificado; pagador en blanco. Comprobado con controles DOM. Pasar al siguiente sin guardar funciona y cierre sin crear completado.
- No se confirmaron ni sustituyeron movimientos; se guardaron únicamente dos nuevas referencias/propuestas documentales en review. Los tres documentos QA sintéticos anteriores siguen review.
- La autofactura relacionada de la comisión no aparecía en el selector; no se forzó ningún vínculo. Añadido aviso de referencia pendiente cuando no existe un ingreso coincidente en los datos cargados.
- Corregida sugerencia bestPendingMatch: fecha/importe parecidos no bastan para ofrecer vinculación. Exige un único candidato con mismo número y emisor, no recurrente. En duplicados múltiples/ambiguos no propone enlace automático.
- La tarjeta ahora muestra el aviso de duplicado antes de pulsar Crear; acción se etiqueta Revisar duplicado / sustitución. Sustitución continúa requiriendo confirmación explícita y no se ha ejecutado sobre datos reales.
- Selector de ingresos conserva las coincidencias exactas aunque queden fuera de las 200 facturas más recientes.
- G26 conserva desglose fiscal coherente del lector genérico. V26 con reverse charge explícito conserva base neta indicada sin inventar cuota IVA.
- Ámbito de compras habituales puede proponerse desde documentos confirmados concordantes; combustible no hereda ámbito por estación.
- Pruebas focalizadas: 21/21 (19 documentales + 2 PWA), incluida referencia pendiente, rechazo de vínculo solo por fecha/importe y factura coincidente más antigua. Suite final: 104 pruebas, 102 correctas y 2 fallos previos. Pendiente verificación UI de 30094 tras desplegar.
- Pendientes generales: ampliar G26/RHD/combustible reales (la autorización recibida cubre estos dos PDF concretos), aprendizaje de nuevas reglas a partir de correcciones, identificación contextual de pagador/tarjetas y sustitución transaccional en aislamiento; resolver dos fallos previos de suite con criterio funcional. No declarar cerrado todo A–H. Producción y TransportERP intactos.

## Comprobación final de esta ejecución — 30093 (2026-10-19)

- Implementación en main: 44d745d0597ac3985cae4e19db7fce289a800e03. version.json sirve 3.0.0-rc.1.56 / 30093; cabecera de aplicación autenticada coincide.
- Tras recargar, Documentos recupera las referencias, incluidos los tres QA. Comisión QA reabierta en 30093: 14,25 y commission; cierre sin crear movimiento completado.
- Una interacción automatizada inmediatamente posterior a reload agotó plazo; inspección posterior y click sobre control visible permitieron continuar. No se atribuye a pérdida de datos ni se oculta la limitación.
- Suite final 30093: 99 pruebas, 97 correctas, 2 fallos previos (mes documental vs financiero de informe; mensaje de cambio de sesión). Focalizadas lector/PWA: 16/16. No se han cambiado expectativas para marcar falsamente suite verde.
- No se pulsaron Crear movimiento, Sustituir, Vincular ni acciones de saldo/conciliación. Solo se crearon tres referencias documentales sintéticas identificadas QA durante la lectura; siguen review. Ningún PDF privado transferido a Staging.
- Reanudación concreta: obtener autorización explícita para trasladar desde Library VS-26-154071.pdf y V26-162583.pdf a DOMUS Staging, guardar referencias y propuestas extraídas, sin confirmar movimientos. Auto-review rechazó esa transferencia por datos privados y persistencia; no se reintentó por otra vía.
- Después: ampliar casos reales G26/RHD/combustible, terminar evidencia de titular/pagador/tarjetas, probar asociaciones/sustitución en aislamiento y resolver los dos fallos de suite con criterio funcional. Las fases A–H no están cerradas en conjunto. Producción y TransportERP no modificados.

## Carga documental sin falso listado vacío — build 30093 (2026-10-19)

- Publicación 30092 commit 16edbb57f92d7f0d0ab76486f07185b7b6d124cf verificada en version.json y cabecera; sesión activa.
- QA detectó listado vacío al entrar inmediatamente después de recargar. No había pérdida de documentos: volver a Inicio y Documentos recuperó los tres QA. Seguro reabierto en 30092 con total 9,44 y clase insurance.
- Causa identificada en refreshAll: documents se asignaba antes de consultas de presupuestos, pero renderDocuments esperaba al renderAll posterior a esas consultas. Entrar antes podía dejar un falso vacío visible durante esa espera.
- Corrección: renderDocuments inmediatamente después de recibir/asignar documentos; estado Cargando referencias antes de primera carga, error específico si falla, vacío solo tras carga correcta. Sin cambios de consultas, esquema ni datos económicos.
- Los 3 registros QA permanecen review sin movimiento vinculado. Se comprobó reapertura/cierre sin crear. PDF privados no transferidos por bloqueo de revisión automática pendiente de autorización específica.
- Estado de alcance y pendientes: entradas 30091/30092. Pendiente verificación UI del arranque de 30093 tras publicar. No se declara terminado el conjunto de fases.

## Aprendizaje desde documentos confirmados — build 30092 (2026-10-19)

- La reutilización histórica de persona/pagador/cuenta/categoría/actividad exige ahora documento confirmado y vínculo series_id; borradores review/processing y movimientos sin respaldo confirmado quedan fuera.
- Conservados filtros de mismo emisor, naturaleza y clase; valores contradictorios no generan propuesta y evidencia documental explícita nunca se sustituye.
- field_sources identifica por campo que la sugerencia procede de documentos confirmados y cuántos registros la respaldan. No genera reglas ni modifica documentos/movimientos anteriores.
- Prueba de regresión: descarta historial pendiente, acepta confirmado, respeta evidencia explícita y no propone sin confirmados. 16/16 controles focalizados, incluida PWA y compilación/render. Suite completa: 99 pruebas, 97 correctas y los mismos 2 fallos previos. Pendiente comprobación de publicación 30092.
- Base: 30091 commit 62bbae48abc152b15d39893b4bb8664a8828cf0d. QA UI de propuestas, importes y clases ya descrita en 30091 (ejecutada sobre 30090).
- La carga de PDF privados sigue esperando autorización específica por rechazo automático. No se ha probado ni declarado completada. Aprendizaje de reglas nuevas, tarjetas/pagador por evidencia bancaria y clasificación contextual completa de combustible siguen pendientes.

## Fecha del resumen y QA UI confirmada — build 30091 (2026-10-19)

- Build 30090 commit 9ce21f45200f368df33680fe26c79d1f7cca9bfd publicado: version.json y cabecera de aplicación confirmados en navegador. Sesión persistió tras recarga.
- Recuperados desde servidor los tres documentos QA tras recarga. Revisar propuesta funciona y abre copia del borrador sin crear movimientos.
- Comisión QA: 14,25 €, invoice V26-999991, expense/business, selector commission. Seguro QA: 9,44 €, invoice VS-26-999991, expense/business, selector insurance. Confirmados mediante controles DOM visibles.
- Detalles secundarios plegados, total primero, Cerrar sin crear movimiento probado: modal cerrado. No pulsado Crear movimiento, Vincular ni Sustituir.
- Corregida prioridad de fecha en ONLOGIST/VS: la fecha junto al número propio del resumen prevalece frente a fechas distintas en anexos. Prueba con estructura VS-26-154071 devuelve 08/10/2026, no 05/10 ni 02/10. Procedencia registrada.
- Controles focalizados: 15/15 (13 documentales + 2 PWA). Suite completa final: 98 pruebas, 96 correctas y 2 fallos preexistentes. No se han cambiado expectativas para ocultar los dos fallos preexistentes.
- Estado de alcance: A auditada; B comprobada con texto real y PDF sintético en UI, pendiente PDF real completo; C/D/E/F/G mejoradas parcialmente; H validación parcial y despliegues. No declarar todo el encargo terminado.
- Bloqueo pendiente específico: autorización explícita para transferir PDFs privados de Library a DOMUS Staging y guardar referencias/extracción de prueba. Auto-review lo rechazó; no se sorteó la protección. La alternativa sintética sí se ejecutó y verificó.
- Próximo paso: probar PDFs reales VS-26-154071 y V26-162583 sin confirmar movimientos si se autoriza; ampliar G26/RHD/combustible; completar aprendizaje de correcciones confirmadas, pagador/cuenta y pruebas seguras de sustitución. Producción y TransportERP intactos.

## QA autenticada y revisión recuperable — build 30090 (2026-10-19)

- Sesión autenticada confirmada en navegador build 30089. Bloqueo de acceso anterior resuelto por el usuario.
- La revisión automática rechazó trasladar PDFs privados desde Library a DOMUS Staging por falta de autorización específica origen/destino. No se cargaron esos PDFs ni se intentó una ruta alternativa para esos documentos. Pendiente autorización explícita para la prueba real.
- Alternativa sin datos privados: creados tres PDFs sintéticos identificados QA, con ingreso, comisión y seguro. Seleccionados juntos en navegador; lectura real cliente/PDF completada; tres registros documentales QA guardados como review sin movimiento vinculado. Sin escrituras en movement_series, saldos ni conciliaciones.
- Primer documento mostrado por el lote: ingreso G261019-999999-999999-1, 114,95 €, 19/10/2026, business; titular y pagador en blanco sin inventarlos. Se seleccionó en último lugar y se revisó primero correctamente.
- Atascos constatados en UI: no había avanzar sin crear y el archivo no permitía reabrir propuestas. Corregidos con Siguiente sin guardar y Revisar propuesta (copia de borrador, sin mutar el original ni escribir movimientos).
- Revisión simplificada: total primero; impuestos, tercero del maestro, actividad y etiquetas plegados; cuenta denominada banco/caja; asociaciones y clase ocultas en ingresos y reactivas al cambiar naturaleza.
- Corregido selector de clase para recuperar commission/insurance/prefinance_fee; antes mostraba standard aunque el lector hubiese identificado la familia. Conservado ámbito profesional del ingreso en revisión y payload, sin forzarlo a null.
- Compilación de scripts y controles PWA/documentales focalizados: 14/14. Suite previa al último ajuste visual: 97 pruebas, 95 correctas y los mismos 2 fallos preexistentes. Pendiente verificación UI tras despliegue 30090, reapertura de los tres QA y clase/total de comisión y seguro.
- Los registros QA no tienen valor económico y no se han borrado (no existe eliminación reversible documental implementada). No confirmar ni vincular esos registros a movimientos reales.
- Producción y TransportERP intactos. Fases generales continúan parcialmente pendientes; aprendizaje confirmado y evidencia contextual de pagador/tarjetas/combustible no completos.

## Comprobación de publicación 30089 — 2026-10-19

- Commit de implementación: fb952b758b3084e9b470a7a1ebef06234aa3ccdc (main).
- Verificado en navegador: version.json sirve 3.0.0-rc.1.52 / 30089; el DOM de la aplicación muestra Build 30089. No se observó error de sintaxis del script en la pestaña nueva.
- Suite final: 96 pruebas, 94 correctas y 2 fallos preexistentes descritos en 30088. Controles focalizados 13/13.
- Acceso seguro intentado: la herramienta confirmó envío, pero la página y una pestaña nueva siguieron en pantalla de acceso, sin mensaje de error visible. Estado de autenticación NO confirmado. No atribuirlo a contraseña incorrecta ni afirmar sesión iniciada.
- Bloqueo concreto: falta sesión autenticada en navegador para validar selección de PDF, extracción, tarjetas, lote y confirmación aislada. No se realizaron escrituras económicas. Reanudar desde acceso seguro del build 30089; no repetir auditoría ya documentada.
- Alcance completado: auditoría inicial, reparación de sintaxis, correcciones parciales de asociaciones/duplicados/clasificación, pruebas aisladas y publicación. NO cerradas fases B–H completas: quedan PDFs/OCR en UI autenticada, casos G26/RHD reales adicionales, aprendizaje de correcciones confirmadas, titular/pagador/cuentas y simplificación integral de revisión.

## Referencias partidas y contraste documental — build 30089 (2026-10-19)

- Build anterior 30088 registrado en main: 68d8102e5f398e5c77628ad10dae10afbad4193e. Publicación verificada en navegador mediante version.json: 3.0.0-rc.1.51 / 30088.
- Contrastado texto completo de documentos reales VS-26-154071 (6 páginas) y V26-162583 (1 página), sin subirlos a DOMUS ni crear movimientos.
- VS: total del resumen 9,44 €, sin sumar primas/anexos. V26: comisión 14,25 €, sin tomar 95,00 / 114,95 / 100,70 como total.
- Corregida reconstrucción de referencias G26 partidas entre líneas en PDF y preservado el primer número documental frente a referencias secundarias. La referencia G261014-017735-375400-1 se conserva en la propuesta de V26-162583.
- Pruebas derivadas de estructura real sin nombres, NIF, direcciones ni datos bancarios. 13/13 controles focalizados (11 documentales/render/sintaxis + 2 PWA). No equivalen a probar selección de PDF/OCR desde navegador autenticado.
- Build 30089 / 3.0.0-rc.1.52, archivos PWA y hash sincronizados. Pendiente comprobar publicación de este build y flujo autenticado. Se mantienen dos fallos preexistentes de suite descritos en 30088.
- Punto de reanudación y fases incompletas: ver entrada 30088. No se han completado clasificación contextual de combustible, identificación fiable de pagador/tarjeta ni rediseño integral de tarjetas. No se modifica TransportERP ni producción.

## Auditoría y correcciones documentales — build 30088 (2026-10-19)

Estado: IMPLEMENTADO Y PROBADO EN AISLAMIENTO; pendiente verificación del despliegue y flujo autenticado con PDF reales. No se declara cerrado el 30087 ni las fases A–H completas.

- Base auditada: main 027b5ec7758d258943f1b5a06d356cf15dde9502, build 30087.
- Defecto crítico preexistente: faltaba un paréntesis en escapeHtml de la familia documental en renderDocDrafts. El script principal del 30087 no compilaba. Corregido y añadido control de compilación de todos los scripts inline y prueba de render del formulario.
- Combustible: ni producto ni estación fuerzan ámbito profesional; se conserva evidencia explícita de ámbito del lector de clasificación. No se reclasifica histórico.
- La interpretación determinista conserva naturaleza/clase aunque el texto mencione comisiones o seguros como deducciones.
- Asociaciones: coincidencia por referencia completa, sin prefijos; números de transporte de 7 u 8 dígitos. Conservadas referencias explícitas de RHD.
- Duplicados: mismo número con emisores diferentes no bloquea. Emisor desconocido conserva candidato para revisión pero no habilita sustitución. Sustituir sigue requiriendo confirmación expresa en interfaz.
- Histórico: solo mismo emisor y clase; datos contradictorios quedan sin propuesta. Campo previamente extraído prevalece y se registra procedencia histórica de cada propuesta.
- Validación: 9 pruebas documentales nuevas + 2 PWA = 11/11. Suite completa: 94 pruebas, 92 correctas, 2 fallos ya presentes en baseline (fechas documentales vs fecha financiera de informes; mensaje al cambiar sesión durante cálculo de identidad). No modificadas expectativas ni lógica ajena al lector para ocultarlos.
- Navegador: página canónica Staging abre pantalla de acceso; sin sesión autenticada reutilizable. No se subieron documentos ni se crearon/modificaron movimientos, saldos o conciliaciones. No se accedió a producción ni se modificó TransportERP.
- PWA: index, version, SW y hash actualizados conjuntamente a 30088 / 3.0.0-rc.1.51.
- Reanudación: comprobar commit/despliegue y build activo; autenticar de forma segura; ejecutar PDFs VS antiguos/Baloise, G26, V26, RHD y combustible sin confirmar movimientos reales; probar lote y sustitución en entorno aislado. Después completar clasificación de titular/pagador, UX simplificada y aprendizaje confirmado. No considerar el histórico por sí solo una corrección confirmada.

## Lector VS-26 Baloise — build 30087 (2026-10-19)

- El lector DOMUS Staging reconoce «Monto total» en el «Resumen de facturas» de Baloise; extrae un único importe y evita sumar filas de anexos.
- Conserva la extracción anterior «Contribución total» para documentos antiguos.
- Solo DOMUS modificado; TransportERP permanece intacto.
- Actualizados versión, service worker y SHA-256 de index.html en el manifiesto.
- Pendiente validación funcional con documentos reales y verificación del despliegue.

## Lector RHD / prefinanciación — build 30086 (2026-10-19)

- Añadida familia determinista `rhd_prefinance` para liquidaciones de RHD Rechnungsstelle AG.
- El importe del gasto de prefinanciación se toma exclusivamente de `Costa de compra` → `Factura emitida nº X` → `Importe neto`.
- Se evita confundir el coste RHD con las comisiones V26, seguros VS-26 o el pago neto final recibido.
- Se genera una referencia estable de documento `RHD-<año>-<nº factura emitida>` solo cuando el nº aparece expresamente en la liquidación; sirve para control de duplicados.
- Se extraen todas las autofacturas G26 relacionadas para preseleccionar los ingresos a los que corresponde el coste de prefinanciación.
- También se conservan referencias V26/VS-26 y el neto de liquidación como metadatos de trazabilidad, sin convertirlos en el importe del gasto RHD.
- La familia se clasifica como gasto de actividad económica, rol `prefinance_fee`, IVA 0%.
- Validación de referencia realizada contra liquidaciones reales RHD de 06/08/2026 (21,85 €) y 31/08/2026 (79,34 €).
- Producción no tocada.

## Lector documental determinista por familias — build 30085 (2026-10-19)

- Prioridad funcional: reducir la introducción manual de movimientos; el lector documental pasa a ser el camino principal de entrada.
- Añadido reconocimiento determinista previo al OCR genérico para familias ONLOGIST y combustible.
- Autofactura G26: usa `total (IVA incluido)` como importe del ingreso y la clasifica como ingreso variable de actividad económica.
- Comisión V26: usa `total (neto)` / `Total` como importe de comisión, evitando confundirlo con `Cantidad` o con el bruto del transporte.
- Seguro VS-26: usa el último importe del bloque `Contribución total`, evitando contribución base e impuestos intermedios.
- Titular económico: intenta identificar automáticamente la persona por nombre y, cuando esté disponible en el maestro, por NIF/IVA.
- Combustible: detecta familia por términos/proveedores habituales y fuerza ámbito actividad económica, reutilizando la lectura fiscal genérica para total/IVA.
- Los resultados deterministas no son sobreescritos después por el intérprete genérico TransportERP.
- Producción no tocada.

## Simplificación de movimientos y recurrencias — build 30084 (2026-10-19)

- «Eliminar serie» pasa a «Eliminar movimiento» en la interfaz.
- Un movimiento no recurrente se edita y elimina directamente.
- En movimientos recurrentes solo se ofrecen «Solo este movimiento» y «Este y los siguientes»; desaparece «Toda la serie (incluye anteriores)».
- La edición recurrente abre por defecto en «Solo este movimiento», evitando cambios futuros involuntarios.
- Al eliminar una recurrencia, se puede quitar únicamente la fecha abierta o cortar desde esa fecha hacia adelante conservando lo anterior.
- La detección de duplicados manuales se basa en número de factura idéntico. Importe, fecha o concepto parecidos ya no bloquean correcciones.
- Se conservan las salvaguardas de presupuesto y conciliación bancaria para borrados completos.
- Producción no se modifica.

## Hotfix borrado real — 30083 (2026-10-15)

- Causa raíz: movement_series tenía una política ALL RESTRICTIVE pero ninguna política PERMISSIVE aplicable a DELETE; PostgreSQL aplicaba default-deny y el borrado devolvía 0 filas.
- Añadida en Supabase Staging una política base_delete para usuarios autenticados miembros del hogar.
- Verificación real con el duplicado ONLOGIST de 6,74 € dentro de transacción con ROLLBACK: domus3_delete_movement_series devolvió deleted=true.
- No se borró ningún dato durante la prueba y producción sigue intacta.

## Borrado transaccional de movimientos — build 30083 (2026-10-14)

- Sustituido el borrado secuencial desde navegador por RPC transaccional `domus3_delete_movement_series(uuid)` en Staging.
- La RPC es SECURITY INVOKER, exige sesión y pertenencia al hogar y respeta RLS; no usa SECURITY DEFINER.
- En una sola transacción: desvincula documentos, elimina enlaces documentales, relaciones entre movimientos, estados y etiquetas, y finalmente la serie.
- Si existe presupuesto o conciliación bancaria, bloquea el borrado con motivo explícito y revierte toda la operación.
- La interfaz exige confirmación del resultado `deleted=true`; ya no acepta silenciosamente borrados de cero filas.
- Build 30083 / 3.0.0-rc.1.46; versión visible en Inicio y Ajustes. Producción no tocada.

## Build visible en Inicio + actualización PWA atómica — build 30082 (2026-10-14)

- La cabecera lateral muestra «DOMUS · 3.0 · RC1 · Build 30082», dejando el build visible junto a la versión desde Inicio.
- Ajustes mantiene también «Ajustes · 3.0 RC1 · Build 30082».
- Cambio de build realizado de forma atómica: index.html, version.json, sw.js, asset-manifest.js y estado técnico entran en un único commit para evitar mezclas temporales entre builds.
- Hash SHA-256 de index.html recalculado antes del commit: 5ef4a707942e146f074560bb94fc2c1629a7c67838040d3c240529b82273d11b.
- Build 30082 / 3.0.0-rc.1.45. Producción no tocada.

## Cabecera de Ajustes — build 30081 (2026-10-14)

### Hotfix 30081 — PWA (2026-10-14)

- Corregido el SHA-256 de `domus-3/index.html` en `asset-manifest.js`.
- Causa de que 30081 no cargara: el service worker detectaba hash de 30080 y rechazaba la instalación, conservando correctamente la versión anterior.
- Build visible se mantiene en 30081 / 3.0.0-rc.1.44.


- La versión pasa a mostrarse directamente en la cabecera de Ajustes: «Ajustes · 3.0 RC1 · Build 30081».
- Eliminada la tarjeta redundante de Información al final de Ajustes.
- Build 30081 / 3.0.0-rc.1.44; caché PWA y manifest sincronizados.

## Duplicados, borrado y lotes documentales — build 30080 (2026-10-14)

- Corregido el borrado de movimientos duplicados en Staging: DOMUS desvincula documentos, relaciones, estados y etiquetas antes de eliminar la serie.
- El borrado se bloquea con mensaje claro si el movimiento pertenece a un presupuesto o tiene conciliación bancaria.
- Añadidos permisos/políticas RLS DELETE de hogar para document_movements y movement_links; producción no tocada.
- Duplicado exacto por nº de factura: el lector ofrece actualizar/sustituir el movimiento existente en lugar de crear otro.
- Lotes: ingresos se revisan primero; al crear/vincular/actualizar se avanza al siguiente documento. Se guarda referencia de transporte y las comisiones/seguros pueden preseleccionar la factura de ingreso por nº de factura o transporte.
- Reglas documentales continúan autocompletando Actividad económica, clase Comisión/Seguro/Prefinanciación y valores históricos dominantes de persona, pagador, cuenta, categoría y actividad.
- Build 30080 / 3.0.0-rc.1.43; JS inline validado, SW/version/manifest sincronizados.

## Lector documental: sustitución, lotes y reglas — build 30079 (2026-10-13)

- Un nº de factura/referencia idéntico pasa a ser duplicado fuerte aunque se hayan corregido importe, cuenta u otros campos.
- Desde el lector, un duplicado fuerte ofrece actualizar/sustituir el movimiento existente; cancelar no crea otro movimiento.
- Si ya existen varios movimientos con el mismo nº de factura, se bloquea la sustitución automática para revisión manual.
- Los lotes se ordenan antes de la revisión: primero documentos interpretados como ingreso/autofactura; después documentos normales; al final comisión/seguro/prefinanciación.
- Se extraen referencias G... y números de transporte del lote para preseleccionar facturas de ingreso relacionadas cuando ya están disponibles.
- Reglas deterministas del documento: V26/comisión => gasto, Actividad económica, Comisión; VS/seguro => gasto, Actividad económica, Seguro; RHD/prefinanciación => coste de prefinanciación.
- Las autofacturas/referencias G... se proponen como ingreso.
- Para persona, pagador, cuenta, categoría y actividad se aprovecha el patrón histórico dominante de movimientos similares; no se inventa un valor si no hay historial.
- Build 30079 / 3.0.0-rc.1.42. Producción no tocada.

## Motor documental compartido con TransportERP — build 30077 (2026-10-13)

- TransportERP pasa a ser la fuente de verdad del motor documental para navegador en `browser/document_engine.js`.
- DOMUS 3 consume una copia vendorizada idéntica en `domus-3/src/documents/transporterp-engine.js`.
- El adaptador browser está alineado con la semántica conservadora de `transporterp/document_interpretation.py` y con la estrategia de OCR/relectura de `transporterp/ocr.py`.
- Se evita seguir evolucionando un motor documental independiente dentro de DOMUS.
- Build 30077 / 3.0.0-rc.1.41 publicado en Staging; SW y hashes actualizados.
- Producción no tocada.

## Lector documental prioritario — build 30076 (2026-10-13)

- Prioridad de producto confirmada: reconocimiento de documentos para DOMUS 3.0.
- Motor de interpretación de tickets/facturas mejorado para:
  - fechas en nombre de archivo YYYYMMDD, YYYY-MM-DD y DD-MM-YYYY;
  - preferir fecha de factura/ticket/emisión frente a vencimientos;
  - selección de total con puntuación contextual, evitando base, IVA, subtotal, cambio y descuentos;
  - detección explícita de proveedor/comercio/emisor/razón social;
  - descarte de emisores claramente espurios.
- Pruebas sintéticas verificadas con Mercadona, Repsol y factura con fecha de vencimiento: fecha, emisor e importe correctos.
- Build 30076 / 3.0.0-rc.1.40 publicado en Staging; SW y manifiesto de integridad actualizados.
- Pagos/cobros parciales descartados como funcionalidad específica por decisión de producto.
- Producción no tocada.

## Inicio: previsiones familiares legibles — build 30075 (2026-10-13)

- Filtrado de personas inactivas y fichas ficticias de pruebas en la vista de previsiones por persona; no se borran datos históricos.
- Ocultación de fichas individuales sin pendientes; total del hogar permanece visible.
- Etiquetas «Por cobrar» y «Por pagar», plazos descriptivos y explicación de acumulados/solapamiento.
- Conservado acceso a detalle de movimientos.
- JavaScript inline validado; manifest de integridad, SW y version.json actualizados a 3.0.0-rc.1.39 / 30075.
- No se han tocado los siete movimientos de tren; usuario los corregirá.
- Pendiente independiente: diseño, persistencia, pruebas y despliegue de pagos y cobros parciales con varias fechas y cuentas. No implementado en 30075.
- Producción no tocada.

## Inicio sincronizado con saldos + histórico sin cuenta — build 30074

- Incidencia 1: Dinero mostraba saldos confirmados mientras Inicio seguía mostrando «Sin confirmar».
- Causa: los checkpoints remotos llegan de forma asíncrona; Dinero se re-renderizaba al recibirlos, pero Inicio no.
- Corrección: cada actualización del ViewModel de Tesorería provoca ahora refresco de Inicio, por lo que ambos consumen el mismo estado confirmado.
- Incidencia 2: «Sin cuenta asignada» aparecía como si fuera una cuenta con 540 €.
- Origen real: 7 movimientos históricos realizados «Tren ()» de JM, importados del Excel original, sin account_id: 5×60 € + 2×120 € = 540 €.
- Ese histórico deja de aparecer como cuenta principal de Dinero. Se conserva como diagnóstico dentro de «Más opciones», con acceso al desglose exacto.
- No se reasignan automáticamente esos 7 movimientos porque no existe evidencia suficiente sobre qué cuenta bancaria los pagó.
- En iPhone, «Dinero por cuenta» deja de ser tabla y pasa a tarjetas con cuenta + disponible.
- Build/version: 3.0.0-rc.1.38 / 30074.
- Producción no tocada.

## Auditoría responsive global iPhone — build 30073

- Se inicia la revisión móvil completa de DOMUS 3, no limitada a pantallas aisladas.
- Base móvil común:
  - padding lateral y fondo útil ajustados para iPhone;
  - topbar más compacta;
  - tarjetas con una columna en Inicio, Planes, Documentos, Informes y Ajustes;
  - formularios de Planes e Informes en una columna;
  - acciones y controles táctiles adaptados.
- Informes:
  - la tabla de 13 columnas queda oculta en móvil;
  - resultados pasan a tarjetas con fecha, estado, concepto, importe, titular, cuenta y categoría;
  - atajos de período se desplazan horizontalmente sin romper el ancho;
  - KPIs en una columna.
- Documentos:
  - botones Cámara / Fototeca / Archivos se apilan;
  - archivo de referencias y acciones dejan de forzar anchos de escritorio.
- Ajustes:
  - rejilla completa pasa a una columna;
  - formularios de alta ocupan el ancho disponible;
  - filas y botones se compactan para uso táctil.
- Planes:
  - formularios a una columna;
  - tabla de partidas sustituida en móvil por tarjetas seleccionables;
  - acciones de plan apiladas y KPIs en 2 columnas.
- Previsiones detalladas:
  - se elimina la rejilla de escritorio en móvil y se convierten los bloques a flujo vertical.
- Escritorio conserva tablas y rejillas completas.
- Build/version: 3.0.0-rc.1.37 / 30073.
- Producción no tocada.

## Correcciones móviles y clasificación — build 30072

- Se elimina el bloqueo especial que impedía renombrar la categoría «Variables». Las categorías se editan con las mismas reglas generales.
- La verificación de `domus3_classification_version()` deja de comparar de forma rígida el tipo devuelto y muestra el error real si falla la RPC. Staging devuelve actualmente versión 20 correctamente.
- El desglose de Dinero en móvil deja de depender de una tabla horizontal: se añade vista de tarjetas con concepto, fecha, estado e importe completo.
- El bloque «Guardado y sincronización» se mueve dentro de «Más opciones», evitando que ocupe espacio principal en iPhone.
- Los modales móviles se adaptan a `100dvh`, safe-area y cabecera sticky para que el título y el botón cerrar no queden cortados al abrir/editar recurrencias.
- Formularios y filas de Ajustes reciben layout móvil de una columna y botones compactos.
- Build/version: 3.0.0-rc.1.36 / 30072. Producción no tocada.

## Edición de categorías con duplicado histórico — build 30071

- Incidencia: editar una categoría activa podía fallar con «Esta categoría ya existe» aunque solo se estuviera cambiando su tipo.
- Caso real: existen dos registros «Impuestos»: uno activo con 70 movimientos y uno histórico inactivo sin movimientos.
- Causa: la validación de duplicados comprobaba cualquier otro registro con el mismo nombre, aunque el nombre de la categoría editada no hubiese cambiado.
- Corrección: al editar una categoría se permite conservar su mismo nombre; la comprobación de duplicado solo se aplica si realmente se renombra.
- Crear una categoría nueva o renombrarla al nombre de otra existente sigue bloqueado.
- Build/version: 3.0.0-rc.1.35 / 30071. Producción no tocada.

## Cuentas y formas de pago configurables — build 30070

- Se elimina de la interfaz el concepto técnico «Orden» en cuentas. El orden interno puede seguir existiendo, pero deja de ser un dato que tenga que entender o editar una familia.
- Las cuentas siguen siendo ilimitadas y representan únicamente lugares donde existe dinero: bancos o caja.
- Se crea el maestro `payment_methods` para formas de pago/cobro configurables por hogar.
- Formas iniciales creadas: Tarjeta, Bizum, Transferencia, Domiciliación, Efectivo y Otra.
- El usuario puede añadir, renombrar, desactivar y reactivar tantas formas como quiera; por ejemplo, un futuro «Trizum».
- `movement_series` incorpora `payment_method_id` con FK al maestro. El campo anterior `payment_method` queda solo como compatibilidad histórica.
- El movimiento «Gasoil (BS)» migrado previamente a Sabadell queda vinculado ahora al registro configurable «Transferencia».
- La función `domus3_save_labeled_movement` admite `payment_method_id`.
- Se verificó RLS y alta temporal de una forma personalizada mediante transacción con rollback.
- La pantalla de Ajustes separa claramente «Cuentas y caja» de «Formas de pago y cobro».
- El formulario de movimientos carga las formas activas del maestro en vez de una lista cerrada.
- Build/version: 3.0.0-rc.1.34 / 30070.
- Producción no tocada.

## Cuenta bancaria vs forma de pago — build 30069

- Se separa conceptualmente y técnicamente dónde está el dinero de cómo se paga/cobra.
- `movement_series` incorpora `payment_method` con valores: card, bizum, transfer, direct_debit, cash, other.
- `account_id` queda reservado para la cuenta/caja real que soporta el saldo.
- En Configuración, «Cuentas / medios» pasa a «Cuentas y caja».
- Tarjeta y Transferencia quedan inactivas como cuentas. Se conservan para histórico.
- El único movimiento que usaba «Transferencia» como cuenta, «Gasoil (BS)» 631,84 €, se reasigna a B. Sabadell y conserva `payment_method=transfer`.
- Cuentas activas actuales: B. Sabadell, ING, Bankinter, CaixaBank y Efectivo.
- El formulario de movimiento muestra dos campos distintos: Cuenta de origen/destino y Forma de pago/cobro.
- La forma de pago no modifica saldos por sí misma.
- La función `domus3_save_labeled_movement` admite el nuevo campo y se verificó mediante transacción con rollback.
- Tesorería excluye cuentas inactivas del cálculo/configuración de saldos.
- «Poner los saldos de hoy» queda visible en Dinero: el usuario puede introducir el saldo actual de cada banco con fecha de hoy; no necesita reconstruir años anteriores.
- Guardar saldo pasa a ser una acción única que prepara y sincroniza el checkpoint.
- Versión 3.0.0-rc.1.33, build 30069. Producción no tocada.

## Corrección permisos al mover fechas desde Agenda — 2026-10-12

- Incidencia: al editar desde Agenda un movimiento no recurrente y cambiar su fecha prevista/documental/real, el formulario podía mostrar `permission denied for table movement_occurrence_states`.
- Causa: el flujo seguro de cambio de fecha elimina el estado de la fecha antigua antes de crear/actualizar el de la nueva, pero `authenticated` tenía SELECT/INSERT/UPDATE y no DELETE sobre `movement_occurrence_states`.
- Corrección en Supabase Staging `pmgonotpbmybtwvxbcvf`: concedido DELETE a `authenticated` y añadida política RLS `base_delete` limitada por `private.can_access_series(series_id)`.
- Verificado en transacción con rollback para los dos usuarios del hogar: José Manuel y Jeni. El flujo update serie → delete estado antiguo → upsert estado nuevo funciona para ambos.
- Producción no tocada.

## Movimientos móvil iPhone — build 30068

- En pantallas <=700 px, Movimientos deja de renderizarse como tabla comprimida y pasa a lista de tarjetas.
- Cada tarjeta prioriza importe completo, concepto y fecha; persona, cuenta, categoría y estado quedan como metadatos secundarios.
- El importe nunca depende del ancho de una columna y usa cifras tabulares.
- Conceptos limitados visualmente a dos líneas; referencias/facturas van en línea secundaria.
- Filtros en chips horizontales con desplazamiento.
- Paginación móvil simplificada: se ocultan primera/última y las etiquetas largas, manteniendo anterior, siguiente e Ir a hoy.
- Tocar una tarjeta abre el detalle existente; edición y cambio de estado siguen en el detalle.
- Escritorio conserva la tabla completa.
- Versión 3.0.0-rc.1.32, build 30068. Producción no tocada.

## Navegación móvil iPhone — build 30067

- La barra inferior móvil deja de mostrar 8 pestañas comprimidas.
- En iPhone quedan 5 accesos principales: Inicio, Dinero, Agenda, Movimientos y Más.
- Más abre un menú con Planes, Informes, Documentos y Ajustes.
- Se sustituyen las etiquetas antiguas Hoy / Calendario / Tesorería / Stats / Docs.
- La barra respeta safe-area de iPhone y usa fondo translúcido con desenfoque.
- Las secciones secundarias activan visualmente Más.
- Versión 3.0.0-rc.1.31, build 30067. Producción no tocada.

## Interfaz doméstica simplificada — build 30066

- Navegación: Inicio, Dinero, Agenda, Movimientos, Planes, Informes, Documentos y Ajustes.
- Inicio prioriza: dinero disponible hoy, pagos pendientes del mes, cobros pendientes del mes y previsión al final de mes.
- Los vencidos quedan como aviso separado.
- Los importes principales abren su desglose real.
- La pantalla Dinero usa el mismo lenguaje doméstico y deja conciliación, diagnósticos y previsiones detalladas en opciones secundarias.
- La previsión de fin de mes no se inventa si falta saldo base.
- Versión 3.0.0-rc.1.30, build 30066.
- Producción no tocada.

## Rediseño conceptual de interfaz — 2026-10-11 — build 30065

- DOMUS deja de organizar la navegación principal por módulos técnicos y pasa a hacerlo por tareas domésticas reales.
- Nueva navegación: Inicio → Flujo y liquidez → Agenda → Movimientos → Planes → Informes → Documentos → Ajustes.
- Se agrupa visualmente el menú en Día a día, Planificar y revisar y Sistema.
- «Tesorería» se renombra a «Flujo y liquidez» para reflejar que el foco del producto es la capacidad de afrontar pagos y anticipar entradas/salidas, no la contabilidad técnica.
- «Calendario» pasa a «Agenda»; «Presupuestos» a «Planes»; «Estadísticas e informes» a «Informes»; «Configuración» a «Ajustes».
- La portada pasa a «Inicio» con el concepto «Liquidez del hogar» y acceso directo al flujo completo.
- Se rehace la jerarquía visual de los KPI de liquidez: tarjetas con más aire, tamaños coherentes, importes con prioridad clara, estados de atención diferenciados y diseño responsivo.
- El objetivo de producto queda fijado: responder primero cuánto dinero hay, qué vence, qué entra, qué sale y cómo queda la liquidez; el histórico y diagnóstico quedan secundarios.
- Build/version: 3.0.0-rc.1.29 / 30065. Producción no tocada.

## Conciliación bancaria segura — 2026-10-11 — build 30064

- Regla operativa fijada: cargar o conciliar un extracto **no crea movimientos**.
- Una línea bancaria solo puede enlazarse con un movimiento DOMUS ya existente.
- Las líneas sin coincidencia quedan pendientes de revisión y se muestran explícitamente como «Sin coincidencia · No se crea movimiento».
- Se mantiene la protección existente que impide confirmar un mismo movimiento DOMUS contra dos líneas distintas del mismo proceso de revisión.
- El extracto completo ya dispone de huella SHA-256 por cuenta; reabrir el mismo archivo reutiliza la revisión local en vez de crear una nueva.
- Los botones y textos se renombraron para distinguir «Conciliar» de «Crear».
- Si en el futuro se permite crear un movimiento desde una línea bancaria, deberá ser una acción separada, explícita y sometida a control anti-duplicado antes de guardar.
- Versión/build: 3.0.0-rc.1.28 / 30064. Producción no tocada.

## Tesorería útil — 2026-10-11 — build 30063

- Se retiran del primer plano los acumulados globales por estado que mezclaban histórico completo y previsiones hasta 2028.
- La vista principal de Tesorería pasa a priorizar datos operativos: disponible calculado hoy, pagos vencidos, próximos 7 días y saldo proyectado a fin de mes.
- Se añade un resumen operativo con: vencido por resolver, próximos 7 días, realizado del mes actual y pendiente hasta fin de mes.
- El saldo proyectado fin de mes se calcula como saldo disponible confirmado + flujo pendiente hasta fin de mes. Si faltan cuentas confirmadas se etiqueta como proyección parcial; si no hay saldo base no se inventa.
- Cada bloque operativo es clicable y muestra los movimientos concretos que forman la cifra.
- Los acumulados por estado (previsto futuro, realizado histórico, reprogramado, prefinanciado, etc.) se conservan únicamente en «Diagnóstico por estados», plegados y fuera del flujo principal.
- Build/version: 3.0.0-rc.1.27 / 30063. Producción no tocada.

## Claridad de cifras de Tesorería — 2026-10-11 — build 30062

- Las tarjetas de estado de Herramientas de Tesorería mostraban importes netos sin explicar su origen ni período.
- Aclarado que no son saldos bancarios: cada tarjeta muestra neto = ingresos − pagos de los movimientos de ese estado.
- Cada tarjeta muestra ahora ingresos, pagos, número de movimientos y rango de fechas real que está sumando.
- «Previsto» pasa a «Previsto futuro» y «Realizado» a «Realizado histórico» para evitar confundirlos con saldos o con períodos cortos.
- Se añade aviso explicativo y se mantiene el desglose clicable movimiento a movimiento.
- Importante: el snapshot de Tesorería genera previsiones recurrentes hasta el 31/12 de dos años después del año de corte; por eso la tarjeta de previsto puede ser muy grande. El histórico realizado incluye todo el histórico cargado.
- Versión/build: 3.0.0-rc.1.26 / 30062. Producción no tocada.

## Corrección Movimientos — Ir a hoy — 2026-10-11 — build 30061

- Corregido «Ir a hoy» en la vista Movimientos.
- El botón ya no se limita a seleccionar la página de 60 filas que contiene la fecha actual; ahora también desplaza la vista hasta el primer movimiento de hoy.
- Si no existe ningún movimiento exactamente hoy, se posiciona en el primer movimiento posterior; si tampoco existe, en el último disponible.
- La fila destino se resalta brevemente para que el usuario identifique dónde ha aterrizado.
- Build/version: 3.0.0-rc.1.25 / 30061. Producción no tocada.

## Motor documental compartido TransportERP → DOMUS — 2026-10-11 — build 30060

- DOMUS incorpora ya un módulo separado `src/documents/transporterp-engine.js` inspirado directamente en el motor conservador de interpretación de TransportERP.
- Se adoptan desde ahora sus principios: varias lecturas como evidencia adicional, no como sustitución; preservación de datos fiables; estados interpretado / pendiente de revisión; no inventar campos; trazabilidad del origen de cada dato.
- El OCR sigue ejecutándose en navegador porque TransportERP no expone actualmente una API HTTP y su OCR Python usa Tesseract/Poppler del sistema, que no puede ejecutarse literalmente dentro de GitHub Pages.
- El motor nuevo arbitra importe, fecha y emisor a partir de primera lectura, relecturas dirigidas y nombre de archivo.
- Caso real de aceptación: `Mercadona 20261010.pdf` + OCR defectuoso `"B10IN4 A."` + importe leído 94,56 € produce: emisor Mercadona, fecha 2026-10-10, importe 94,56 €, con procedencia explícita (importe = primera lectura; emisor/fecha = nombre del archivo).
- El motor está empaquetado dentro de la PWA y validado por hash junto con index.html.
- Versión/build: 3.0.0-rc.1.24 / 30060. Producción no tocada.

## Lector documental — segunda lectura dirigida — 2026-10-11 — build 30057

- Caso real validado: el ticket Mercadona leía correctamente el total 94,56 €, pero fallaba en comercio/fecha. Ese importe fiable debe preservarse.
- Inspirado en el enfoque de TransportERP, DOMUS añade una segunda lectura selectiva cuando la primera OCR es incompleta: cabecera, zona media/fecha y zona inferior/totales se releen por separado a mayor resolución.
- La recuperación es evidencia adicional: no sustituye indiscriminadamente la primera lectura.
- Si la primera pasada ya obtuvo un importe, la segunda no lo sobrescribe. Se usa principalmente para recuperar comercio, concepto y fecha faltantes/dañados.
- La revisión muestra «segunda lectura dirigida» cuando se ha ejecutado.
- Build/version: 3.0.0-rc.1.21 / 30057. Producción no tocada.

## Lector documental — 2026-10-11 — build 30056

- Cambio de enfoque del lector de documentos: las imágenes ya no se envían crudas a OCR.
- Preprocesado previo: reescala, fondo blanco, escala de grises, normalización de rango y aumento de contraste antes de Tesseract.
- PDFs con texto embebido siguen usando extracción nativa; si no hay texto suficiente, la primera página se renderiza a mayor resolución y pasa por OCR mejorado.
- El parser tolera errores habituales de OCR en etiquetas de total (por ejemplo T0TAL) y amplía la búsqueda de fecha y comercio.
- Cada propuesta lleva ahora calidad de extracción (alta/media/baja) y, cuando existe, porcentaje de confianza OCR.
- Si la lectura es baja, DOMUS lo dice explícitamente y obliga a revisar comercio, fecha e importe; deja de presentar campos dudosos como si fueran fiables.
- El texto OCR completo se conserva temporalmente dentro de la propuesta cuando la calidad es baja para facilitar la revisión.
- Build/version: 3.0.0-rc.1.20 / 30056. Producción no tocada.

## Corrección de coherencia PWA — 2026-10-11 — build 30055

- Incidencia observada: el navegador podía cargar index.html nuevo mientras un service worker anterior servía módulos JavaScript viejos. Esto provocó «window.DOMUSReport.financialDay is not a function» tras el build 30054.
- Causa: index.html no formaba parte del paquete versionado del service worker.
- Solución inmediata: Informes dispone de fallback local para cálculo y filtrado por fecha financiera aunque temporalmente llegue un report.js anterior.
- Solución estructural: index.html pasa a formar parte de DOMUS3_ASSETS y se valida/cacha con SHA-256 junto al resto del build. A partir de ahora HTML y módulos se entregan como un paquete coherente por versión.
- Verificaciones: sintaxis index/sw/report correcta; index incluido en manifest; hash de index validado; build 30055 coherente en index, manifest, service worker y version.json.
- Versión/build: 3.0.0-rc.1.19 / 30055. Producción no tocada.

## Corrección de período financiero en Informes — 2026-10-11 — build 30054

- Detectado que Informes filtraba por fecha documental antes que por fecha financiera.
- Nueva regla temporal: movimiento realizado → fecha real de pago/cobro; movimiento pendiente → fecha prevista.
- La fecha documental se conserva como dato económico/documental, pero deja de decidir si un movimiento entra en un informe financiero.
- La tabla y la impresión muestran ahora la misma fecha financiera usada por el filtro, evitando que el listado contradiga los KPI.
- El encabezado del período explica explícitamente el criterio temporal aplicado.
- Prueba sintética validada: un realizado con documento dentro pero pago fuera del período queda excluido; un realizado pagado dentro y un pendiente previsto dentro quedan incluidos.
- Versión/build: 3.0.0-rc.1.18 / 30054. Producción no tocada.

## Corrección de consultas naturales — 2026-10-11 — build 30053

- Informes entiende ahora períodos dinámicos del tipo «desde hoy hasta el próximo ingreso habitual de X».
- El horizonte se calcula con el siguiente ingreso pendiente clasificado como Ingresos habituales + Actividad económica, reutilizando la misma lógica económica de DOMUS.
- Se admiten iniciales personales inequívocas, por ejemplo «JM» → «José Manuel» cuando solo existe una coincidencia.
- La consulta «ingresos y gastos desde hoy hasta el próximo ingreso habitual de JM» se transforma en un informe previsto desde hoy hasta la fecha de ese cobro y filtrado por José Manuel.
- Si las iniciales son ambiguas o no existe un ingreso habitual pendiente en los próximos 370 días, DOMUS explica el problema y no altera el informe anterior.
- Pruebas: sintaxis correcta de index/report-language/report-question; consulta transformada validada; alias JM validado; hashes de integridad actualizados en asset-manifest.
- Versión/build: 3.0.0-rc.1.17 / 30053. Producción no tocada.

## Corrección de navegación — 2026-10-11 — build 30052

- Al cambiar de sección principal, DOMUS vuelve ahora a la cabecera de la vista en lugar de conservar el scroll de la pantalla anterior.
- Corrige específicamente el caso de Estadísticas e informes, que podía abrirse a mitad de página.
- Se mantiene la preservación de posición únicamente dentro de componentes que gestionan su propio scroll; la navegación principal siempre empieza arriba.
- Actualizada también la versión visible en Configuración a build 30052.
- JavaScript inline comprobado sintácticamente. Producción no tocada.

## Decisión de explotación — 2026-10-11 — DOMUS 3 pasa a ser fuente de verdad

- A partir de este punto **DOMUS 3.0 Staging se usa con datos reales y como aplicación operativa principal**.
- **DOMUS 2.5.8 queda congelado como histórico/consulta**. No se realizarán nuevas cargas masivas, sincronizaciones ni migraciones periódicas desde 2.5.8 hacia DOMUS 3.
- Todo movimiento nuevo, corrección, cambio de estado, recurrencia, clasificación, documento y dato de tesorería debe registrarse directamente en DOMUS 3.
- Los usuarios reales del hogar (incluida Jeni) deben trabajar directamente en DOMUS 3 para que las pruebas sean uso real, multiusuario y con persistencia efectiva.
- 2.5.8 solo podrá consultarse de forma excepcional para recuperar un dato histórico concreto o resolver una discrepancia de auditoría solicitada expresamente. Cualquier dato recuperado se incorporará manualmente y con trazabilidad, no mediante reimportación general.
- No borrar todavía 2.5.8 ni sus datos: se conserva como respaldo histórico hasta que DOMUS 3 complete su fase de estabilización.
- Queda prohibido usar 2.5.8 como origen habitual para corregir DOMUS 3; desde ahora las inconsistencias se corrigen en DOMUS 3, que es la fuente de verdad operativa.

## Corrección de interacción — 2026-10-11 — build 30051

- Corregido el fallo por el que al pulsar «Marcar pagado/cobrado» dentro de una ventana de resumen el movimiento sí se guardaba, pero permanecía visible y parecía que no había ocurrido nada.
- El botón de estado muestra ahora «Guardando…»/«Actualizando…», queda bloqueado durante la operación y evita clics repetidos.
- Tras confirmar el cambio, el modal abierto se reconstruye con el estado actual. En resúmenes de pendientes, el movimiento realizado desaparece inmediatamente de la lista; el resumen mensual superior también se recalcula.
- El calendario/día abierto se refresca igualmente si la acción se ejecuta desde su modal.
- En caso de error, el botón recupera su estado anterior y se muestra el error; no se deja la interfaz bloqueada.
- Prueba estática: JavaScript inline de index.html parseado correctamente. Build/version: 3.0.0-rc.1.15 / 30051. Producción no tocada.

## Rediseño Hoy + Tesorería — 2026-10-10 — build 30050

- Nuevo criterio de producto: **Hoy** responde primero a cuatro preguntas normales: cuánto dinero disponible puede calcular DOMUS, qué requiere atención, qué balance se espera de hoy a 7 días y qué balance se espera hasta fin de mes.
- Se elimina de la portada el protagonismo de «pagos hasta próximo cobro habitual». El cobro habitual pasa a **Hitos próximos**, al mismo nivel que el próximo pago y el próximo ingreso.
- Hoy queda reorganizado en: situación resumida → resolver hoy → hitos próximos → próximos pagos/ingresos. Las previsiones por persona y por ámbito se conservan, pero dentro de «Ver previsiones detalladas».
- Tesorería abre ahora con lenguaje cotidiano: disponible calculado, balance a 7 días, balance hasta fin de mes y vencidos. Después muestra saldo por cuenta y una referencia del próximo movimiento de dinero.
- Saldos, previsiones por estado, cuadre bancario, importación de extractos y conciliación no se eliminan: quedan agrupados dentro de **Herramientas de Tesorería** para evitar que la pantalla principal parezca un panel técnico.
- Prefinanciación se conserva como herramienta específica plegada; deja de competir visualmente con la situación general.
- El resumen de Hoy reutiliza el saldo calculado real de Tesorería mediante un resumen de solo lectura expuesto por el módulo RC1. Si no existen saldos confirmados, muestra explícitamente «Sin confirmar» en vez de inventar disponibilidad.
- Pruebas estáticas: JavaScript inline de index.html válido; ui.js de Tesorería válido tras retirar sintaxis de módulo para parseo; sin IDs duplicados; eliminadas referencias a tarjetas antiguas; integridad SHA-256 de src/treasury/ui.js verificada contra asset-manifest.
- Versión/build: 3.0.0-rc.1.14 / 30050. Producción no tocada.


## Corrección visual — 2026-10-10 — build 30049

- Corregido el bajo contraste detectado en Calendario: los movimientos realizados ya no aplican opacidad al bloque completo.
- Los realizados siguen diferenciados con fondo gris, texto más oscuro y tachado, pero permanecen legibles a simple vista.
- El tooltip mantiene fondo oscuro sólido, texto blanco/gris claro y contraste independiente del estado del movimiento.
- Build/version: 3.0.0-rc.1.13 / 30049. Producción no tocada.

## Corrección UX — 2026-10-10 — build 30048

- Calendario de escritorio: cada movimiento muestra al pasar el cursor (y al recibir foco de teclado) un globo legible con concepto, importe, naturaleza, estado y fechas prevista/real cuando existe.
- Los movimientos realizados continúan diferenciados en la celda y aparecen tachados también dentro del globo; el globo no hereda el tachado completo para mantener legibilidad.
- Cierre de modales unificado: clic en el fondo oscuro cierra dayModal, movementDetailModal, docAnalysisModal, movementModal y masterModal. Movimiento y editor de maestros avisan antes de descartar cambios sin guardar; tras un guardado/eliminación confirmado se cierran sin aviso espurio.
- Build/version: 3.0.0-rc.1.12 / 30048. JavaScript inline de index.html comprobado sintácticamente después del cambio. Producción no tocada.

## Incidencia detectada — 2026-10-09 — movimiento genérico Documento

- CONFIRMADO en Staging: serie `5dbe336a-045e-4c8a-81da-1a22ee90c514` vinculada al PDF `G260911-017371-375400-1.pdf`, `source=document`, `type=income`, concepto persistido `Documento`, importe 60,38 €, fecha 09/10/2026, estado pendiente. Actualización de fila posterior al volcado, pero el concepto sigue siendo `Documento`.
- La foto del usuario muestra simultáneamente comisión ONLOGIST, `Documento`, seguro AXA. Son series distintas, no una duplicación visual del mismo ID. NO borrar, cancelar, renombrar ni cambiar el estado sin validar qué representa el ingreso y la edición deseada.
- PENDIENTE CRÍTICO: depurar el origen del concepto genérico del lector/importador de documentos; identificar si los cambios guardados en edición persisten por campo y diferenciar edición del documento vs movimiento económico asociado; validar lectura tras escritura y avisar si la actualización remota no coincide. No declarar guardado exitoso sin readback.
- PENDIENTE UX: no aceptar `Documento` como nombre final por defecto en un ingreso de factura. Exigir una descripción significativa o proponer una reconocible del origen, sin inventar operación ni duplicar el ingreso.

## Ejecución autónoma — 2026-10-09 — datos reales + intercobros + presupuestos

- Producción se ha usado **solo como origen de lectura**. No se ha modificado `jiwfpczmffsjpfvsrrvk`.
- Antes de sustituir los datos de trabajo de Staging se creó un punto de restauración interno: snapshot `1ab53621-3bd8-4dcb-b6df-fccc4d8bc832`.
- Se creó además una copia bruta de los datos reales de producción dentro de Staging: snapshot `e235718b-9a76-45af-8edd-5241a696ace9`. Conserva los registros originales antes de las adaptaciones de compatibilidad.
- Copia real cargada en el hogar Staging `a5c95017-2910-4819-b9d0-9dd8b0f9b23a`: 27 categorías, 3 personas (2 activas), 9 cuentas (7 activas), 1.898 series de movimientos, 1.873 estados, 100 documentos, 73 vínculos documento-movimiento, 75 vínculos entre movimientos y 2 operaciones ONLOGIST.
- Control de integridad: suma nominal de series de ingreso producción/Staging = 88.419,72 €; suma nominal de series de gasto producción/Staging = 102.351,04 €. Los recuentos de series y estados coinciden exactamente.
- Adaptaciones de compatibilidad aplicadas **solo en la copia de trabajo**: `new_line`/`other` → `variable`; ingresos profesionales con factura/cliente profesional → ámbito `business`; estados `done` antiguos sin `actual_date` reciben la fecha efectiva/original para cumplir el modelo RC1. La copia bruta conserva el valor original.
- Los ingresos Lyreco de la copia de trabajo se han normalizado como `Ingreso habitual + Actividad económica`, que es el criterio funcional definido para la previsión intercobros. El histórico original queda intacto en el snapshot bruto.
- Caso real de validación intercobros disponible: serie habitual Lyreco de 3.000 € con ocurrencia base 25/10/2026 y reprogramación real/predicha a 23/10/2026. La UI debe mostrar ventana estimada y días restantes, no una falsa fecha rígida.
- Build 30045 añade el resumen intercobros en **Hoy** y **Tesorería**, calculado exclusivamente con `type=income`, `income_source_type=habitual` y `expense_scope=business`; ingresos variables no desplazan el horizonte.
- Build 30045 añade **Presupuestos / Planes**: creación de plan, partidas, total presupuestado/asentado/restante/desviación, conversión selectiva a movimientos, cancelación de partidas no asentadas y cancelación masiva de movimientos pendientes generados por un plan. Los movimientos ya realizados se conservan por defecto.
- Nuevas tablas Staging: `budget_plans`, `budget_items`, `budget_item_movements`, con RLS por hogar y trazabilidad de autor. Smoke SQL de creación de presupuesto ejecutado con ROLLBACK correctamente.
- Commit principal de aplicación build 30045: `aa5a69ac82928cf2a3fd51b7ca621a460da30ecc`. Metadatos/manifest/service worker actualizados después.
- El JavaScript inline del `index.html` de 30045 ha pasado comprobación de sintaxis. Falta todavía confirmar en navegador real que GitHub Pages sirve 30045 y completar prueba funcional interactiva de intercobros y presupuesto → movimiento → cancelación.

# DOMUS RC1 — Rediseño funcional Staging

2026-10-09. Estado actual: build 30045 preparado con datos reales en Staging, previsión intercobros y presupuestos/planes. Pendiente comprobación final en navegador del build desplegado.

- Base preservada: Tesorería RC1 build 30039, sin reconstrucción desde Alpha.
- Versión actual: 3.0.0-rc.1.9, build 30045.
- Repositorio: josemsaavedra-afk/domus-3-staging, main, domus-3/.
- Supabase autorizado: pmgonotpbmybtwvxbcvf. Producción jiwfpczmffsjpfvsrrvk no modificada.
- Commit de aplicación: 940e26bef1c657c6ced0a158699e4e583395c3fe. GitHub Pages run 37961785483: build y deploy success; HTTP version.json confirma build 30043.
- Edge Function domus-treasury v2 ACTIVE, verify_jwt=true; POST sin token devuelve 401. RPC y garantías de Tesorería conservados.
- npm test: 85/85 correctas, incluidas las 74 originales. verify-staging.sql completado nuevamente con ROLLBACK; ningún nuevo hallazgo de advisors.

## Registro histórico de Tesorería — 2026-10-07

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
2. Segundo dispositivo o perfil independiente: VALIDADO manualmente por el usuario desde iPhone el 2026-10-07. Recuperados desde backend el saldo 1234,56 EUR, cuenta RC1 PRUEBA TESORERÍA, extracto rc1-treasury-test.csv y conciliación revocada con autor, fechas y motivo. Capturas aportadas por el usuario.
3. No declarar cierre completo de todos los criterios hasta resolver el conflicto concurrente por UI.

Al preparar el segundo CSV para conflicto concurrente, filechooser falló tras el acceso seguro con BrowserCredentialRecoveryError / retained_data_restricted. Navegación explícita al documento canónico recuperó la lectura y navegación UI, pero filechooser volvió a fallar. No es un error de importación de DOMUS: el archivo de conflicto NO se ha cargado. No inspeccionar ni reconstruir credenciales/tokens/cookies, ni ejecutar la sesión desde herramientas externas.

Siguiente acción: en un runtime de navegador capaz de cargar archivos (o mediante control manual del selector), importar CSV ficticio de conflicto en esta misma cuenta, capturar base de confirmación, modificar el movimiento desde otra instancia antes de sincronizar y verificar conflicto conservado. El CSV temporal preparado contiene 2026-10-07, RC1 PRUEBA CONCILIACIÓN CONFLICTO, -10.00 EUR; puede recrearse. No duplicar la cuenta/saldo ya existentes. Validar además perfil/dispositivo independiente y aislamiento por UI.


## Cuaderno vivo de pendientes funcionales y de interfaz

Regla de trabajo: este bloque es la lista de control persistente. Un punto solo pasa de PENDIENTE a VALIDADO cuando está implementado en la interfaz, desplegado en Staging y comprobado. No basta con que exista en Supabase o en el código.

### BLOQUEO DE PRUEBAS FUNCIONALES POR INTERFAZ

- ESTADO: **BLOQUEANTE** — Se suspenden las pruebas funcionales de usuario sobre altas/ediciones hasta disponer de una interfaz que represente correctamente el modelo económico y de tesorería. Seguir probando sobre la UI actual produciría resultados engañosos y obligaría a repetir pruebas.
- PRIORIDAD INMEDIATA — Rediseñar primero el flujo de creación/edición de movimientos y su modelo de interacción. Después reanudar pruebas de calendario, informes, tesorería y clasificación sobre esa base.
- CRITERIO DE DESBLOQUEO — No reanudar pruebas generales hasta validar al menos: naturaleza Ingreso/Gasto, evento de caja Cobro/Pago, fecha económica/documental, fecha real de cobro/pago, persona económica, pagador/cobrador, cuenta/medio, tercero, categoría, ámbito, actividad/proyecto, estado y recurrencia.

### PRINCIPIO UX — DOMUS PARA USUARIO BÁSICO

- PENDIENTE CRÍTICO — DOMUS debe poder entenderse sin conocimientos contables, fiscales ni técnicos. Toda pantalla de Configuración debe usar lenguaje cotidiano, ejemplos precargados y ayuda contextual breve.
- PENDIENTE CRÍTICO — Mantener y ampliar comentarios/instrucciones dentro de la propia interfaz: explicar qué significa cada bloque, para qué sirve, cuándo usarlo y cuándo puede dejarse vacío. La ayuda debe estar junto al campo o bloque, no escondida en documentación externa.
- PENDIENTE CRÍTICO — Precargar ejemplos visibles en Staging para enseñar el modelo sin obligar al usuario a deducirlo. Ejemplos mínimos: categorías (Vivienda, Transporte, Alimentación, Suministros, Impuestos, Ocio), terceros (Mercadona, Vodafone, Lyreco, ONLOGIST), actividades/proyectos (Lyreco 722, Traslado vehículos 849) y etiquetas (Extraordinario, Cumpleaños, Viaje).
- PENDIENTE CRÍTICO — Añadir el **Ámbito** como dimensión claramente visible y separada de Categorías: Doméstico / Actividad económica / Mixto, con explicación sencilla y ejemplos.
- PENDIENTE CRÍTICO — Precargar reglas de clasificación de ejemplo, editables y desactivables, expresadas como frases comprensibles del tipo «Si pasa esto → clasificar así».
- PENDIENTE CRÍTICO — Ejemplos de reglas a mostrar: Mercadona → Alimentación + Doméstico; Lyreco + Ingreso → Actividad económica + Lyreco 722; ONLOGIST → Actividad económica + Traslado vehículos 849; Vodafone → Suministros; AEAT → Impuestos; Ingreso → nunca sugerir Doméstico.
- PENDIENTE CRÍTICO — La pantalla de reglas no debe exponer primero prioridades numéricas ni terminología técnica. La prioridad avanzada puede existir, pero detrás de una vista simple con condiciones y resultado en lenguaje natural.
- PENDIENTE CRÍTICO — Conservar la ayuda ya acordada sobre conceptos como «tercero» y extender el mismo patrón a Categoría, Ámbito, Actividad/Proyecto, Etiquetas y Reglas.

### DECISIÓN FUNCIONAL — REDISEÑO COMPLETO DE INTERFAZ

- PENDIENTE CRÍTICO — La interfaz actual de DOMUS 3.0 RC1 se considera **no válida como base final de producto**. No seguir acumulando parches aislados sobre formularios heredados.
- PENDIENTE CRÍTICO — Rediseñar de forma coherente toda la interfaz de alta, edición, consulta, configuración, documentos, informes y tesorería alrededor del modelo real de datos y las reglas de negocio ya existentes.
- PENDIENTE CRÍTICO — Separar explícitamente en UI: **naturaleza económica** (Ingreso/Gasto), **movimiento de caja** (Cobro/Pago), **fecha del documento/operación** y **fecha real de cobro/pago**. Ningún campo genérico «Tipo» o «Fecha» debe mezclar conceptos distintos.
- PENDIENTE CRÍTICO — Revisar navegación, jerarquía visual, nombres de campos, orden lógico, dependencias entre campos, validaciones, estados y comportamiento móvil/escritorio. La interfaz debe guiar y bloquear incoherencias, no limitarse a exponer columnas del backend.
- PENDIENTE CRÍTICO — Antes de cerrar cualquier pantalla, validar que todo lo que existe en Supabase/GitHub y es funcionalmente relevante pueda verse, capturarse y editarse correctamente desde la interfaz.

### PRIORIDAD ALTA — interfaz útil y clasificación lógica

- PENDIENTE — Alta/edición de movimientos: separar claramente **fecha de factura/tique/documento** de **fecha real de pago/cobro**. Tesorería y conciliación deben usar la fecha de pago/cobro; fiscalidad/documentación debe conservar la fecha documental. Si coinciden, se puede proponer/autorrellenar, pero nunca fusionar ambos conceptos en un único campo ambiguo.
- PENDIENTE — Auditoría completa UI ↔ modelo de datos: comprobar que todo dato relevante existente en backend tenga control visible, editable y comprensible en la interfaz cuando corresponda.
- PENDIENTE — Configuración de relaciones: exponer y mantener de forma útil las relaciones entre persona económica, de quién es, quién paga, cuenta, tercero/comercio/proveedor, categoría/subcategoría, actividad/proyecto, etiquetas y documento asociado.
- PENDIENTE — Clasificación con lógica de negocio: impedir combinaciones incoherentes y filtrar opciones según contexto. Ejemplo obligatorio: una **factura de ingreso nunca puede clasificarse como doméstica**. Las reglas deben orientar alta, edición, recurrentes, documentos e informes.
- PENDIENTE — Revisión de formularios de alta/edición/recurrentes para que consuman maestros y reglas de Configuración y no permitan valores incompatibles.
- PENDIENTE — Revisar que Configuración sea realmente editable para todos los maestros relevantes y que sus cambios repercutan en formularios, filtros, informes y clasificación automática.

### VISIBILIDAD INMEDIATA — HOY + TESORERÍA

- PENDIENTE CRÍTICO — La previsión intercobros de ingresos habituales debe mostrarse tanto en **Tesorería** como en la pantalla **Hoy y pendientes**. No debe quedar relegada únicamente a Informes.
- Objetivo UX: al abrir DOMUS, el usuario debe poder hacerse una idea de la situación financiera en segundos, sin tener que investigar fechas ni ejecutar un informe.
- La tarjeta/resumen debe priorizar lenguaje útil: «Te quedan aprox. X días para el próximo cobro habitual», ingreso esperado, pagos pendientes hasta entonces y margen estimado.
- Cuando la fecha habitual sea variable, mostrar rango/ventana estimada y no una fecha rígida falsa. Mantener acceso al detalle del cálculo.
- La pantalla Hoy debe funcionar como resumen ejecutivo de situación inmediata; Tesorería como vista ampliada del mismo cálculo.

### DATOS REALES EN STAGING — COPIA SEGURA DE TRABAJO

- PRIORIDAD INMEDIATA — Las siguientes pruebas de DOMUS 3 deben hacerse con **datos reales**, no únicamente con ejemplos ficticios. Existe suficiente histórico en producción para validar de verdad previsiones, recurrencias, informes, clasificación y Tesorería.
- NO trabajar directamente sobre producción para estas pruebas. Antes de copiar nada, crear una **copia de seguridad/exportación verificable** de los datos de producción que vayan a utilizarse.
- La carga en Staging debe ser una **copia de trabajo independiente**. Producción permanece intacta.
- Preservar, mediante tabla de correspondencias cuando sea necesario, las relaciones entre hogar, personas, cuentas, categorías, series, ocurrencias, documentos, terceros, actividades, etiquetas, reglas, vínculos y datos de Tesorería. No asumir que los UUID de Auth/hogar son idénticos entre producción y Staging.
- El proceso debe ser repetible: exportar → validar copia → importar/migrar a Staging → comprobar recuentos y sumas → ejecutar smoke tests. Debe poder restaurarse/repetirse sin duplicar datos.
- Conservar un manifiesto de la copia con fecha, tablas incluidas, recuentos, importes de control y mapeos de IDs.
- Tras cargar los datos reales, usar esos datos como base principal para validar la previsión intercobros (Lyreco), presupuestos, informes, clasificación y Tesorería.

### PRESUPUESTOS / PLANES CON CONVERSIÓN A MOVIMIENTOS

- PENDIENTE FUNCIONAL — Añadir una función de **Presupuestos / Planes** para gastos futuros (ej.: vacaciones, reforma, celebración, viaje, compra importante).
- Un presupuesto no debe contaminar automáticamente Tesorería ni los movimientos reales mientras siga en fase de planificación.
- Debe permitir definir: nombre del plan, período/fechas, importe total objetivo, partidas previstas, categoría, ámbito, persona, pagador previsto, cuenta prevista, tercero si se conoce, actividad/proyecto y notas.
- Debe mostrar total presupuestado, comprometido/asentado, restante y desviación entre previsto y real.
- Debe existir una acción explícita para **asentar/convertir una partida presupuestada en movimiento real o previsto**, conservando vínculo con el presupuesto de origen.
- La conversión debe evitar duplicados y permitir: convertir una partida concreta, varias seleccionadas o todo el presupuesto cuando proceda.
- PENDIENTE FUNCIONAL — Debe existir una acción masiva para **cancelar/revertir de una sola vez** los movimientos creados desde un presupuesto/plan, sin tener que ir movimiento por movimiento.
- La cancelación masiva debe distinguir entre: movimientos aún previstos/pendientes (se pueden cancelar en bloque) y movimientos ya realizados/conciliados (no borrar silenciosamente; exigir una acción explícita y conservar trazabilidad).
- Desde el propio presupuesto debe poder verse qué movimientos fueron generados por él y aplicar «Cancelar movimientos del presupuesto» a una selección o al conjunto completo.
- La cancelación nunca debe eliminar el presupuesto ni perder su histórico: el plan conserva qué partidas se convirtieron, cuáles se cancelaron y por qué.

- Tras convertir, el movimiento pasa a los módulos normales (Hoy, Calendario, Movimientos, Tesorería, Informes) y el presupuesto conserva trazabilidad de qué partidas ya fueron asentadas.
- El diseño debe ser comprensible para usuario básico: «Planifico» primero; «lo paso a movimientos» cuando decido incorporarlo a la economía real.

### PREVISIÓN INTERCOBROS — INGRESOS HABITUALES

- PENDIENTE CRÍTICO — Recuperar en Tesorería la **previsión intercobros**. No debe limitarse a mostrar una fecha exacta de próximo cobro, porque algunos ingresos habituales (p. ej. Lyreco) pueden adelantarse o retrasarse algunos días.
- La interfaz debe responder primero a una pregunta de usuario básico: **«¿Cuánto me queda para volver a cobrar mis ingresos habituales?»**.
- Debe mostrar el tiempo restante en días hasta el siguiente ingreso habitual previsto y, cuando exista variabilidad histórica o por fin de semana/festivo, expresar una **ventana estimada** en vez de una fecha rígida.
- Debe identificar el siguiente cobro habitual **exclusivamente entre movimientos clasificados como Ingresos habituales + Ámbito Actividad económica**. No usar cualquier ingreso pendiente ni ingresos variables para fijar el horizonte intercobros. Dentro de ese conjunto, puede usar recurrencia, historial, tercero o actividad para estimar la siguiente ventana. Lyreco es el caso de validación principal.
- La tarjeta intercobros debe mostrar al menos: ingreso habitual siguiente, días restantes, importe esperado, gastos pendientes hasta esa ventana, saldo/necesidad estimada y acceso al detalle de los movimientos que componen el cálculo.
- Si ya existe un cobro habitual realizado en el ciclo actual, el horizonte debe saltar al siguiente ciclo; no contar ingresos ya cobrados como dinero futuro disponible.
- No reemplazar esta lógica por «próximo ingreso pendiente» genérico: ingresos variables como ONLOGIST/Driiveme no deben desplazar automáticamente el horizonte principal de los cobros habituales.

### Tesorería RC1

- VALIDADO — Guardado y recuperación de saldos.
- VALIDADO — Importación y recuperación de extractos.
- VALIDADO — Confirmación y revocación con trazabilidad.
- VALIDADO — Persistencia tras recarga y cierre/reapertura de sesión.
- VALIDADO — Reimportación sin duplicados.
- VALIDADO — Segundo dispositivo físico (iPhone) recupera estado remoto.
- VALIDADO — Suite automatizada 74/74.
- PENDIENTE — Conflicto concurrente por interfaz real.

### Recuperados de conversaciones anteriores — revisar/validar en RC1

Estos puntos fueron pedidos explícitamente en conversaciones previas. Se registran como **REVISAR/VALIDAR** cuando no hay evidencia suficiente en este archivo para afirmar que siguen pendientes o que ya están cerrados. No se eliminan hasta comprobarlos en Staging.

#### Navegación y presentación

- REVISAR/VALIDAR — Paginación: controles accesibles también arriba y/o flotantes, no únicamente al final de listados largos.
- REVISAR/VALIDAR — Resúmenes azules/KPI: deben reflejar el mes o período consultado, no quedarse anclados al mes actual.
- REVISAR/VALIDAR — Calendario móvil: rediseño para lectura clara en pantalla estrecha; se pidió específicamente mejorar la legibilidad móvil.
- REVISAR/VALIDAR — Comportamiento móvil a ~390 px: tablas, formularios y controles sin desbordamientos ni pérdida de funciones.

#### Informes

- REVISAR/VALIDAR — Filtros completos por persona, mes/período, categoría y demás dimensiones relevantes; ejemplo pedido: consultar ingresos de una persona en agosto dentro de una categoría concreta.
- REVISAR/VALIDAR — Toda cifra agregada debe permitir **drill-down** hasta los movimientos que la componen.
- REVISAR/VALIDAR — Impresión real del informe como documento/PDF, no solo vista en pantalla.
- REVISAR/VALIDAR — Informes de previsión futura: ingresos y gastos previstos por intervalo, enumerando cada previsión y mostrando totales; los días 10/25 deben funcionar como fechas normales, sin lógica especial artificial.
- REVISAR/VALIDAR — Consultas directas del tipo «cuánto hemos gastado en hosting en tal mes» deben resolverse desde los datos de DOMUS sin búsquedas manuales.

#### Movimientos, recurrentes y maestros

- REVISAR/VALIDAR — Defecto histórico: editar recurrentes de importe variable debía guardar correctamente; caso citado: AEAT de Jeni trimestral.
- REVISAR/VALIDAR — Fecha de cargos recurrentes/alarmas debe poder corregirse de forma efectiva y propagarse en recurrencias futuras cuando corresponda; caso citado: mover alarma del 30/9 al 5/10 y sucesivas al día 5 del mes siguiente.
- REVISAR/VALIDAR — Alta y edición de movimientos deben ofrecer la **misma clasificación y los mismos maestros**, sin catálogos distintos o “batiburrillo”.
- REVISAR/VALIDAR — Miembros del hogar: añadir, desactivar/reactivar y conservar históricos sin romper referencias.
- REVISAR/VALIDAR — Soportar titular/de quién es, pagador/quién paga y cuenta como dimensiones separadas, incluido valor «Compartido» cuando proceda.
- REVISAR/VALIDAR — Maestros precreados pero totalmente editables: crear, editar, desactivar/reactivar categorías, cuentas, terceros y demás catálogos; permitir alta contextual desde un movimiento cuando tenga sentido.

#### Documentos y reconocimiento

- REVISAR/VALIDAR — Lector de documentos/tickets: decidir con evidencia si se mantiene y mejora o se elimina; no dejar un control visible que no funcione.
- REVISAR/VALIDAR — Reconocimiento de PDF/ticket debe distinguir ingreso, gasto, transferencia y liquidación; extraer fecha, proveedor/tercero, número, base, IVA y retención cuando existan; marcar dudas y **no inventar importes**.
- REVISAR/VALIDAR — Caso de prueba pendiente citado: PDF de ONLOGIST rellenaba datos incorrectos.
- REVISAR/VALIDAR — Separación conceptual entre documento y movimiento: un documento puede tener su propia fecha y metadatos sin obligar a igualarlos con fecha de pago/cobro.

#### Autenticación, PWA y acceso normal

- REVISAR/VALIDAR — Recuperación de contraseña extremo a extremo desde la propia app/PWA, incluida entrada normal de Jeni desde el icono sin depender de un enlace de invitación antiguo.
- REVISAR/VALIDAR — Login/logout, sesión persistente y reapertura desde PWA instalada.
- REVISAR/VALIDAR — PWA/offline independiente de DOMUS 2.5.8 y sin volver a una ruta antigua como index-258.html.
- REVISAR/VALIDAR — Pruebas reales en iPhone para instalación, actualización de caché y apertura correcta de RC1.

#### Tesorería y lógica económica

- PENDIENTE — Conflicto concurrente por interfaz real (ya registrado como último criterio de cierre de Tesorería RC1).
- REVISAR/VALIDAR — Prefinanciación ONLOGIST/RHD: mover la previsión sin duplicarla, conservar vencimiento original, coste parametrizable, distinguir prefinanciado de cobrado/liquidado, permitir conciliación y mantener auditoría.
- REVISAR/VALIDAR — La vista de Tesorería debe mantener separación real vs previsión y mostrar, cuando proceda: saldos por cuenta, realizado, pendiente, vencido, reprogramado, prefinanciado y liquidado; próximo cobro; pagos hasta próximo cobro; evolución por cuenta; horizontes 7 días/fin de mes/30 días/fin de año y desglose explicativo.

#### Datos históricos/auditoría — no mezclar con nuevas funciones

- REVISAR ESTADO — Importaciones/correcciones históricas mencionadas en septiembre (Mercadona 2026, tickets de Jeni, clasificación DIA) pertenecen a trabajo de depuración de datos y no deben darse por resueltas sin comprobar su estado actual. No ejecutar correcciones masivas ni tocar producción desde RC1 Staging.

### Relación DOMUS ↔ TransportERP — decisión de arquitectura a preservar

- PENDIENTE — Definir y documentar el contrato de integración entre DOMUS 3.0 y TransportERP. No deben evolucionar como dos sistemas aislados que dupliquen lógica.
- PENDIENTE — TransportERP debe concentrar la lógica especializada de la actividad profesional de transporte: importación documental, lectura de facturas/autofacturas/seguros/comisiones/prefinanciación, asociación por transporte, duplicados, conciliación operativa, beneficio operativo/neto, IVA/IRPF, ROI/intracomunitarias, vencimientos y métricas por transporte/hora/km.
- PENDIENTE — DOMUS debe concentrar la visión financiera global del hogar y de sus miembros: cuentas, personas, titularidad económica, quién paga, categorías, ámbitos doméstico/actividad, presupuestos, recurrentes, calendario, tesorería global, documentos y reporting familiar.
- PENDIENTE — La integración debe permitir que movimientos y documentos profesionales procesados en TransportERP lleguen a DOMUS ya estructurados, con trazabilidad de origen, evitando reintroducción manual y evitando que DOMUS tenga que reinterpretar la lógica fiscal/operativa del transporte.
- PENDIENTE — DOMUS debe poder distinguir que un movimiento viene de TransportERP y conservar identificadores de origen suficientes para reconciliar actualizaciones, evitar duplicados y navegar hasta el detalle profesional cuando proceda.
- PENDIENTE — El motor documental común debe reutilizar, cuando sea viable, las herramientas de lectura ya desarrolladas/planteadas en TransportERP. DOMUS no debe mantener un parser independiente que duplique y diverja.
- PENDIENTE — Definir claramente la dirección de sincronización y la fuente de verdad por cada dato. Como principio: detalle operativo/fiscal de transporte en TransportERP; visión financiera agregada y de hogar en DOMUS. No crear escrituras bidireccionales ambiguas sin reglas de propiedad del dato.
- PENDIENTE — Probar con casos reales del ecosistema del usuario: ONLOGIST, Driiveme, RHD, AXA, gastos etiquetados por transporte (#nº transporte) y gastos generales sin etiqueta; comprobar que DOMUS recibe el resultado financiero correcto sin perder el vínculo al origen.
- PENDIENTE — **Inventariar y preservar las conexiones técnicas reales ya existentes entre ambos proyectos antes de modificar cualquiera de los dos.** Revisar repositorios, módulos, formatos de intercambio, identificadores, nombres de campos, endpoints/RPC/funciones, importadores/exportadores y cualquier referencia cruzada. No sustituir una conexión existente por otra nueva sin documentar la migración.
- PENDIENTE — Definir un contrato estable de integración versionado entre DOMUS y TransportERP: identificador de movimiento/documento de origen, versión del contrato, tipo de evento/registro, fecha documental, fecha de pago/cobro, tercero, cuenta, persona/titular, pagador, categoría/ámbito, actividad/proyecto, impuestos, transporte asociado y estado de conciliación cuando proceda.
- PENDIENTE — Evitar duplicados y bucles de sincronización: cada registro compartido debe conservar source_system, source_id y, cuando exista, source_version/marca de actualización. DOMUS no debe reexportar a TransportERP como nuevo algo que provino originalmente de TransportERP.
- PENDIENTE — Mantener compatibilidad hacia atrás durante cambios de esquema o UI: si TransportERP y DOMUS no se despliegan exactamente a la vez, el contrato debe tolerar una ventana de versiones sin romper importaciones existentes.
- PENDIENTE — La auditoría de interfaz de DOMUS debe comprobar también que los datos recibidos desde TransportERP se muestran y editan con el significado correcto; no basta con que la integración técnica inserte filas en Supabase.

### Disciplina de cierre

Para cualquier mejora futura registrar aquí: estado, build, commit, pantalla afectada, prueba ejecutada y resultado. Eliminar de PENDIENTE solo tras validación real en Staging. Si existe backend sin interfaz utilizable, el estado sigue siendo PENDIENTE.

## Rediseño RC1 — bloque 1 — build 30040

Base: main d5616b7; RC1 30039 preservado. Estado: IMPLEMENTADO, pendiente de comprobación autenticada del despliegue; no se declara terminado el hito completo de interfaz.

- Alta y edición comparten formulario dividido en operación, fechas/dinero, personas/cuenta, clasificación, recurrencia/notas y opciones avanzadas.
- Naturaleza Gasto/Ingreso y movimiento de dinero Pago/Cobro son controles separados; Pago/Cobro se deriva de la naturaleza para impedir combinaciones incoherentes. Estado pendiente/realizado/cancelado independiente.
- Fecha económica/documental persistida por ocurrencia en movement_occurrence_states.document_date. Fecha real editable en actual_date; requerida al guardar realizado. Fecha prevista conserva start_date/rescheduled_date y claves de ocurrencia. Botón para copiar la fecha documental a la real.
- Cambiar periodicidad conserva fechas documentales de excepciones. La fecha documental seleccionada solo afecta a la ocurrencia seleccionada; no se inventan fechas de documentos futuros.
- Informes, comparación de períodos e impresión usan fecha documental; registros previos sin document_date conservan su fecha original de ocurrencia como referencia histórica. Tesorería conserva su motor y utiliza actual_date para realizados.
- Ámbito visible para ambos tipos; no se confunde con categoría. Ingresos con factura, actividad o Lyreco/ONLOGIST bloquean ámbito doméstico/mixto. Categorías incompatibles se filtran y validan. Reglas no sugieren Doméstico/Mixto en ingresos y admiten Actividad económica.
- Migración rc1_movement_model aplicada SOLO a pmgonotpbmybtwvxbcvf: columna documental por ocurrencia; CHECK de ingresos profesionales NOT VALID para no reescribir ni reclasificar históricos. Nuevas escrituras se validan. Sin cambios de RLS/privilegios ni funciones de Tesorería; producción intacta.
- 79/79 pruebas correctas: las 74 previas más 5 de clasificación, fechas de informe, propuestas y persistencia PostgreSQL/PGlite. verify-staging.sql vuelve a completar saldo, importación, idempotencia, aislamiento, confirmación, revocación y rollback en Staging tras el cambio.
- Comprobación estática: sintaxis JS, estructura HTML del formulario, IDs únicos y git diff --check correctos.
- Navegador remoto disponible después de reiniciar el controlador. La página canónica de Staging muestra formulario de acceso; no existe sesión autenticada reutilizable en este navegador. Requiere acceso seguro para comprobar el formulario y guardar/recuperar un movimiento de prueba. No usar contraseñas/tokens en chat ni herramientas externas.
- Bloques siguientes (Configuración con ejemplos, reglas en lenguaje natural e importador guiado) siguen PENDIENTES. Conforme a la orden, comprobar este bloque en UI antes de continuar. No declarar el rediseño completo terminado.
- TransportERP localizado mediante conector: josemsaavedra-afk/TransportERP, main d5d603d12177e938d9a227d0247b5c4a86379469. Inventario disponible: bank_import_service.py, content.py, ocr.py, document_interpretation.py, economic_interpretation_service.py, settlement_service.py y reference_extractor.py. No se ha creado ningún parser nuevo ni modificado TransportERP. Lectura detallada/inventario de contratos pendiente antes del bloque de importación.

### Bloque 1 — comprobación autenticada completada

- Aplicación build 30040, commit d6b34a6b00ea59f2520e943e52d42e381e4bd7c4. GitHub Pages workflow 37958377334: build y deploy success.
- Acceso por browserAuth seguro correcto. Recarga activó el shell nuevo; sesión recuperada tras recarga.
- Creado desde UI en casa prueba: RC1 UI 30040 FECHAS · PRUEBA, 0,01 EUR, cuenta RC1 PRUEBA TESORERÍA. ID afc40416-4692-45e3-a58c-6015753cb7bd.
- Abrir Editar recupera las fechas independientes: documento 2026-09-30, prevista 2026-10-09, real 2026-10-08. Consulta SQL confirma el estado comprometido, no rollback.
- Cambiar naturaleza a Ingreso muestra Cobro y Quién cobra. Añadir referencia de factura cambia Ámbito a Actividad económica y deshabilita Doméstico/Mixto. Borrador descartado por Cancelar; el gasto original no cambia.
- En listado se detectó una etiqueta heredada Pago bajo Naturaleza. Corregida a Gasto en build 30041.

## Rediseño RC1 — bloque 2 — build 30041

- Configuración explica qué es Categoría, Ámbito, Tercero, Actividad/Proyecto, Etiqueta y Regla. Ámbitos visibles en bloque independiente; ayuda junto a cada bloque.
- Ejemplos precargados mediante RPC SECURITY INVOKER con RLS de hogar, transacción y bloqueo concurrente: seis categorías, terceros Mercadona/Vodafone/AEAT/Lyreco/ONLOGIST, dos actividades y tres etiquetas. Nunca crea movimientos ni modifica clasificación histórica.
- Marcador de inicialización por hogar: no reintroduce ejemplos después de que el usuario los edite/desactive; llamadas repetidas son idempotentes. Hogares ajenos/anon rechazados. Migración aplicada solo a pmgonotpbmybtwvxbcvf.
- Reglas muestran SI [condiciones] → [clasificación]. Nombre, condiciones principales y resultado en modo normal; prioridad, importes y otras condiciones en Opciones avanzadas. Editar y desactivar mantienen el mismo modelo y auditoría.
- Regla de protección de ingresos visible, siempre aplicada: nunca sugerir Doméstico. Se permite ámbito doméstico elegido manualmente para ingresos personales sin factura/actividad.
- Prueba PGlite de inicialización, aislamiento y conservación de edición/desactivación correcta. RPC real en Staging probada dentro de BEGIN/ROLLBACK. Advisors: ningún hallazgo nuevo; permanecen advertencias anteriores.
- 80/80 pruebas. Comprobación autenticada de Configuración y reglas pendiente después del despliegue de este bloque.

### Corrección de actualización PWA — build 30042

- Durante QA autenticada de 30041 apareció shell nuevo con rules-ui.js antiguo; una recarga llegó a recuperar shell 30040. Los ejemplos persistidos eran correctos. NO se dio por validada la pantalla de reglas.
- Service worker ahora exige manifest del build esperado y descarga cada asset con parámetro de build. Verifica SHA-256 de todos los archivos antes de escribir/activar la nueva caché. Si falta un archivo o llega otro build, conserva el worker anterior; no publica una caché mezclada. Backend/sesiones/datos nunca se cachean.
- Build 30042 sustituye a 30041 para completar la misma comprobación. Sin cambios de esquema ni de datos adicionales.

## RC1 build 30043 — importación guiada (2026-10-09)
- Build 30042 comprobada en navegador autenticado: configuración con ámbitos independientes, ejemplos persistidos y reglas SI → CLASIFICAR; editor simple con opciones técnicas plegadas.
- Extractos: cuenta → archivo → detección CSV/TSV → vista previa → mapeo editable → validación completa → revisión y guardado RC1. Separador y fila de encabezados ajustables. Errores concretos «No importado» sin modificar historial previo.
- Mismo lector compartido cliente/Edge Function; mapeo opcional compatible con clientes anteriores. SHA-256 conserva CSV original; cuenta, idempotencia, ordinales y transacciones RPC existentes no cambian.
- Inventario TransportERP en docs/DOMUS_TRANSPORTERP_INVENTORY.md: reutilizado contrato financiero neutral; sin nuevo motor profesional PDF/OCR/Excel. Este importador bancario admite CSV/TSV, no archivos Excel binarios.
- Despliegue confirmado: commit 940e26bef1c657c6ced0a158699e4e583395c3fe; Pages build y deploy success. Endpoint version.json devuelve 30043. Navegador autenticado mostró el primer paso del importador nuevo después de activar íntegramente la PWA.
- 85/85 pruebas: 74 originales + clasificación/fechas/esquema, ejemplos idempotentes, integridad de actualización PWA, mapeo de encabezados libres, TSV/cargo-abono/prefacios, errores y paridad cliente-servidor.
- Sesión web: saldo previo 1234,56 y calculado 1224,55 recuperados; extracto y revocación previos siguen visibles. El nuevo gasto ficticio de 0,01 explica el céntimo de diferencia; no se cambió saldo inicial.
- Bloqueo real de QA: al comenzar la selección de cuenta/archivo, el controlador informó retained_data_restricted tras native credential delivery, reinició el kernel y después rechazó recuperar la pestaña con “native credential state cannot be safely resumed”. Un reinicio explícito del runtime tampoco recuperó la pestaña. No se inspeccionaron credenciales ni se evitó la protección.
- Pendiente para cierre: navegador → archivo de encabezados libres → mapeo → revisión → guardado/sincronización → recuperación; repetir archivo sin duplicar; archivo con fecha inválida sin alterar historial. Son pruebas pendientes, no fallos constatados del importador. Segundo dispositivo físico no repetido en esta sesión; cobertura original preservada.

- Corrección 09/10/2026 — build 30046: la previsión intercobros toma como fuente de verdad la **categoría Ingresos habituales + ámbito Actividad económica**, no el campo técnico `income_source_type`. Caso que reveló el fallo: `Venta palets IVA` ya estaba en categoría `Variables` pero conservaba `income_source_type=habitual`, por lo que seguía apareciendo como próximo cobro habitual. Desde 30046, cambiar la categoría a Variables lo excluye inmediatamente del cálculo; además el formulario sincroniza automáticamente el campo técnico con la categoría para evitar futuras incoherencias.
