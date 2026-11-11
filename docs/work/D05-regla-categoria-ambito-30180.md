# Regla: categoría existente → ámbito

11/11/2026. Orden del usuario: crear una regla básica «si es Gastos de actividad económica, el ámbito es Actividad económica». Registro maestro vigente consultado; DOMUS main f3be59e / 30179.

Diagnóstico confirmado: Categoría solo existía entre propuestas del formulario. Faltaba en condiciones del formulario, su serialización y la lista permitida del validador JavaScript y del trigger SQL. Poner categoría y ámbito como resultados dejaba la regla sin condición y producía el error de la captura.

30180 / 3.0.0-rc.1.136: añade «Categoría que ya tiene el movimiento» en «SI ocurre esto», serializa category_id en conditions y lo admite en ambos validadores. La regla puede proponer únicamente expense_scope=business, sin inventar proveedor, concepto o cuenta ni reasignar la categoría. El motor existente compara el ID de categoría y mantiene propuestas revisables; no modifica históricos.

Servidor: migración category_rule_condition aplicada en pmgonotpbmybtwvxbcvf. Extiende solo la lista de condiciones del validador vigente mediante sustitución comprobada; mantiene SECURITY INVOKER, search_path vacío, referencias del mismo hogar, revisión y privilegios. No crea reglas de usuario. Prueba transaccional con tabla temporal y ROLLBACK: acepta categoría existente del mismo hogar. Metadatos confirman condición admitida e invocador sin privilegios ampliados. Avisos de seguridad iguales a los previos, ninguno nuevo sobre el validador. Sin modificar movimientos ni documentos ni llamar a IA.

Validación local: 245 pruebas correctas. Nuevas regresiones: condición solo por categoría; no aplica a otra categoría o sin categoría; rechazo de referencia de otro hogar; formulario real guardar/reabrir/aplicar con transporte simulado; trigger SQL real en PGlite rechaza antes de migrar, acepta después, rechaza categoría ajena/inexistente y permite repetir la migración sin alterar el contrato. Chromium móvil/escritorio preparado en scripts/test-category-rule.mjs y CI. Publicación/evidencia final se registrará en el maestro.
