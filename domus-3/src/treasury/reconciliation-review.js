const freezeRows = rows => Object.freeze(rows.map(row => Object.freeze({ ...row, candidates: Object.freeze([...row.candidates]), rejectedCandidates: Object.freeze([...(row.rejectedCandidates || [])]) })));

function candidateList(result) {
  const rows = [result.candidate, ...(result.alternatives || []).map(item => item.movement)].filter(Boolean);
  return rows.filter((movement, index) => rows.findIndex(item => item.id === movement.id) === index);
}

export function createReviewSession(results) {
  const rows = results.map(result => {
    const candidates = candidateList(result);
    return {
      statement: result.statement,
      matchStatus: result.status,
      score: result.score,
      candidates,
      selectedMovementId: result.status === 'propuesto' ? result.candidate?.id || null : null,
      decision: 'pendiente'
    };
  });
  return Object.freeze({ rows: freezeRows(rows) });
}

// After creating one missing movement, keep the other reviewed choices when
// their underlying candidates have not changed.
export function refreshReviewSession(previous, results) {
  const fresh = createReviewSession(results);
  const same = (a,b) => a && b && ['id','date','signedAmount','concept','accountId'].every(key=>a[key]===b[key]);
  return Object.freeze({rows:freezeRows(fresh.rows.map(row=>{
    const old=previous.rows.find(item=>item.statement.id===row.statement.id);
    if(!old)return row;
    if(old.decision!=='pendiente')return old;
    const rejected=(old.rejectedCandidates||[]).filter(item=>row.candidates.some(candidate=>same(item,candidate)));
    const candidates=row.candidates.filter(item=>!rejected.some(candidate=>candidate.id===item.id));
    const selected=candidates.find(item=>item.id===old.selectedMovementId&&same(item,old.candidates.find(candidate=>candidate.id===item.id)));
    return {...row,candidates,rejectedCandidates:rejected,
      selectedMovementId:selected?.id || (rejected.length ? null : row.selectedMovementId),
      matchStatus:rejected.length ? (candidates.length?'revisar':'sin_coincidencia') : row.matchStatus};
  }))});
}

export function selectReviewCandidate(session, statementId, movementId) {
  const target = session.rows.find(row => row.statement.id === statementId);
  if (!target) throw new Error('Línea de extracto no encontrada');
  if (target.decision !== 'pendiente') throw new Error('La decisión ya está cerrada');
  if (movementId && !target.candidates.some(candidate => candidate.id === movementId)) throw new Error('El movimiento no pertenece a las propuestas de esta línea');
  const rows = session.rows.map(row => row.statement.id === statementId ? { ...row, selectedMovementId: movementId || null } : row);
  return Object.freeze({ rows: freezeRows(rows) });
}

// Reject a proposed link, never the bank line or the underlying movement.
export function rejectReviewCandidate(session, statementId, movementId) {
  const target = session.rows.find(row => row.statement.id === statementId);
  if (!target || target.decision !== 'pendiente') throw new Error('La línea ya no está pendiente de revisión.');
  const candidate = target.candidates.find(item => item.id === movementId);
  if (!candidate) throw new Error('La propuesta ya no está disponible.');
  const candidates = target.candidates.filter(item => item.id !== movementId);
  return Object.freeze({ rows: freezeRows(session.rows.map(row => row !== target ? row : {
    ...row, candidates, rejectedCandidates: [...(row.rejectedCandidates || []), candidate],
    selectedMovementId: null, matchStatus: candidates.length ? 'revisar' : 'sin_coincidencia'
  })) });
}

export function restoreReviewCandidates(session, statementId) {
  const target = session.rows.find(row => row.statement.id === statementId);
  if (!target || target.decision !== 'pendiente') throw new Error('La línea ya no está pendiente de revisión.');
  return Object.freeze({ rows: freezeRows(session.rows.map(row => row !== target ? row : {
    ...row, candidates: [...row.candidates, ...(row.rejectedCandidates || [])], rejectedCandidates: [],
    selectedMovementId: null, matchStatus: 'revisar'
  })) });
}

export function decideReview(session, statementId, decision) {
  if (!['confirmada', 'descartada'].includes(decision)) throw new Error('Decisión de conciliación no válida');
  const target = session.rows.find(row => row.statement.id === statementId);
  if (!target) throw new Error('Línea de extracto no encontrada');
  if (target.decision !== 'pendiente') throw new Error('La decisión ya está cerrada');
  if (decision === 'confirmada' && !target.selectedMovementId) throw new Error('Selecciona un movimiento antes de confirmar');
  if (decision === 'confirmada' && session.rows.some(row => row.decision === 'confirmada' && row.selectedMovementId === target.selectedMovementId)) throw new Error('Ese movimiento DOMUS ya está confirmado para otra línea');
  const rows = session.rows.map(row => row.statement.id === statementId ? { ...row, decision } : row);
  return Object.freeze({ rows: freezeRows(rows) });
}

export function reviewSummary(session) {
  return session.rows.reduce((summary, row) => {
    summary.total += 1;
    summary[row.decision] += 1;
    return summary;
  }, { total: 0, pendiente: 0, confirmada: 0, descartada: 0 });
}

export function confirmedReviewDraft(session) {
  return Object.freeze(session.rows.filter(row => row.decision === 'confirmada').map(row => Object.freeze({
    statementId: row.statement.id,
    movementId: row.selectedMovementId,
    statementDate: row.statement.date,
    signedAmount: row.statement.signedAmount,
    source: 'revision_local_no_persistida'
  })));
}
