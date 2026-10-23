const pad = n => String(n).padStart(2, '0');
const month = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
const day = date => `${month(date)}-${pad(date.getDate())}`;
const key = (userId, householdId) => `domus3:bank-reminder:${userId}:${householdId}`;

export function reminderVisible(saved, now = new Date()) {
  if (saved?.month === month(now)) {
    return saved.choice === 'later' && typeof saved.until === 'string' && day(now) >= saved.until;
  }
  return now.getDate() === 1;
}

export function reminderDecision(choice, now = new Date()) {
  if (!['review', 'later', 'skip'].includes(choice)) throw new Error('Opción desconocida');
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { month: month(now), choice, ...(choice === 'later' ? { until: day(tomorrow) } : {}) };
}

export function createBankReminder(storage) {
  const transient = new Map();
  return {
    read(userId, householdId) {
      const id = key(userId, householdId);
      if (transient.has(id)) return transient.get(id);
      try { return JSON.parse(storage.getItem(id)); } catch { return null; }
    },
    choose(userId, householdId, choice, now = new Date()) {
      const saved = reminderDecision(choice, now), id = key(userId, householdId);
      transient.set(id, saved);
      try { storage.setItem(id, JSON.stringify(saved)); return true; } catch { return false; }
    }
  };
}

export function bindMonthlyReminder({ root, reminder, userId, householdId, onReview, now = new Date() }) {
  if (!root) return;
  root.replaceChildren();
  root.classList.add('hidden');
  if (!userId || !householdId || !reminderVisible(reminder.read(userId, householdId), now)) return;
  root.classList.remove('hidden');
  const title = document.createElement('h3');
  title.textContent = '¿Revisamos los movimientos del banco del mes pasado?';
  const note = document.createElement('p');
  note.textContent = 'Es opcional. También puedes hacerlo desde Documentos cuando quieras. Tu elección se recuerda en este dispositivo.';
  const actions = document.createElement('div'); actions.className = 'actions';
  for (const [choice, label] of [['review', 'Revisar ahora'], ['later', 'Recordármelo más tarde'], ['skip', 'Este mes no']]) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = choice === 'review' ? 'btn primary' : 'btn'; button.textContent = label;
    button.onclick = () => {
      reminder.choose(userId, householdId, choice, now);
      root.classList.add('hidden');
      if (choice === 'review') onReview();
    };
    actions.appendChild(button);
  }
  root.append(title, note, actions);
}
