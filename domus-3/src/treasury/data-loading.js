// Only the caller publishes the result. A late response after timeout is discarded.
export async function withLoadDeadline(load, milliseconds = 25000) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(load),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('La carga está tardando demasiado. Pulsa Sincronizar para reintentar.')), milliseconds); })
    ]);
  } finally { clearTimeout(timer); }
}

export async function readAllPages(createQuery, size = 500) {
  if (!Number.isInteger(size) || size < 1 || size > 1000) throw new Error('Tamaño de página inválido');
  const data = [];
  for (let page = 0; page < 10000; page++) {
    const result = await createQuery().range(page * size, (page + 1) * size - 1);
    if (result.error) throw result.error;
    if (!Array.isArray(result.data)) throw new Error('Respuesta de datos incompleta');
    data.push(...result.data);
    if (result.data.length < size) return { data, error: null };
  }
  throw new Error('Historial demasiado extenso; carga cancelada sin publicar datos parciales');
}
