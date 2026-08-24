const sidebar = document.querySelector('#sidebar');
const storageKey = 'habit-items';
const doneKey = 'habit-completions';
const presetCleanupKey = 'habit-presets-removed';
const presetHabitNames = new Set(['Beber água', 'Movimentar o corpo', 'Ler algumas páginas']);
let habits = JSON.parse(localStorage.getItem(storageKey) || '[]');
let completions = JSON.parse(localStorage.getItem(doneKey) || '{}');
let calendarDate = new Date();
let selectedHabitIcon = { icon: '✧', tone: 'gold' };

if (!localStorage.getItem(presetCleanupKey)) {
  habits = habits.filter((habit) => !presetHabitNames.has(habit.name));
  localStorage.setItem(presetCleanupKey, 'true');
}

localStorage.setItem(storageKey, JSON.stringify(habits));
document.querySelector('#menu').addEventListener('click', () => sidebar.classList.toggle('open'));
document.querySelector('#openHabitForm').addEventListener('click', openHabitForm);
document.querySelector('#closeHabit').addEventListener('click', closeHabitForm);
document.querySelector('#cancelHabit').addEventListener('click', closeHabitForm);
document.querySelector('#habitModal').addEventListener('click', (event) => { if (event.target.id === 'habitModal') closeHabitForm(); });
document.querySelectorAll('#habitIconOptions button').forEach((button) => button.addEventListener('click', () => {
  selectedHabitIcon = { icon: button.dataset.icon, tone: button.dataset.tone };
  document.querySelectorAll('#habitIconOptions button').forEach((item) => item.classList.toggle('selected', item === button));
}));
document.querySelector('#habitForm').addEventListener('submit', (event) => {
  event.preventDefault();
  habits.push({ id: crypto.randomUUID(), name: document.querySelector('#habitName').value.trim(), frequency: document.querySelector('#habitFrequency').value, ...selectedHabitIcon });
  localStorage.setItem(storageKey, JSON.stringify(habits));
  event.target.reset();
  selectedHabitIcon = { icon: '✧', tone: 'gold' };
  document.querySelectorAll('#habitIconOptions button').forEach((item, index) => item.classList.toggle('selected', index === 0));
  closeHabitForm(); renderAll();
});
document.querySelector('#previousMonth').addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() - 1); renderCalendar(); });
document.querySelector('#nextMonth').addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() + 1); renderCalendar(); });

function openHabitForm() { document.querySelector('#habitModal').classList.add('open'); document.querySelector('#habitName').focus(); }
function closeHabitForm() { document.querySelector('#habitModal').classList.remove('open'); }
function dateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function todayKey() { return dateKey(new Date()); }
function isDone(habitId, date = todayKey()) { return Boolean(completions[date]?.includes(habitId)); }
function toggleHabit(id) { const date = todayKey(); completions[date] = completions[date] || []; completions[date] = isDone(id) ? completions[date].filter((item) => item !== id) : [...completions[date], id]; localStorage.setItem(doneKey, JSON.stringify(completions)); renderAll(); }
function frequencyLabel(frequency) { return { daily: 'Todos os dias', weekdays: 'Dias úteis', weekends: 'Fins de semana', weekly: '1 vez por semana', three: '3 vezes por semana', four: '4 vezes por semana', five: '5 vezes por semana', custom: 'Quando eu quiser' }[frequency] || 'Todos os dias'; }
function deleteHabit(id) { habits = habits.filter((habit) => habit.id !== id); Object.keys(completions).forEach((date) => { completions[date] = completions[date].filter((habitId) => habitId !== id); if (!completions[date].length) delete completions[date]; }); localStorage.setItem(storageKey, JSON.stringify(habits)); localStorage.setItem(doneKey, JSON.stringify(completions)); renderAll(); }
function renderHabits() {
  document.querySelector('#habitList').innerHTML = habits.map((habit) => `<article class="habit-row ${isDone(habit.id) ? 'completed' : ''}"><span class="habit-badge ${habit.tone}">${habit.icon}</span><div><strong>${habit.name}</strong><small>${frequencyLabel(habit.frequency)}</small></div><button class="habit-toggle" data-id="${habit.id}" aria-label="Marcar ${habit.name}">${isDone(habit.id) ? 'Concluído' : 'Marcar'}</button><button class="delete-habit" data-id="${habit.id}" aria-label="Excluir ${habit.name}">×</button></article>`).join('');
  document.querySelectorAll('.habit-toggle').forEach((button) => button.addEventListener('click', () => toggleHabit(button.dataset.id)));
  document.querySelectorAll('.delete-habit').forEach((button) => button.addEventListener('click', () => deleteHabit(button.dataset.id)));
}
function renderWeek() { const today = new Date(); const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay()); const days = []; for (let i = 0; i < 7; i += 1) { const date = new Date(start); date.setDate(start.getDate() + i); const key = dateKey(date); const count = (completions[key] || []).length; days.push(`<div class="week-bar"><span>${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][i]}</span><i style="height:${Math.max(8, (count / Math.max(habits.length, 1)) * 62)}px"></i><small>${count}</small></div>`); } document.querySelector('#weekBars').innerHTML = days.join(''); const total = habits.length * 7; const done = Object.entries(completions).filter(([key]) => { const date = new Date(`${key}T00:00:00`); return date >= start && date <= new Date(start.getTime() + 6 * 86400000); }).reduce((sum, [, ids]) => sum + ids.length, 0); document.querySelector('#weeklyPercent').textContent = `${total ? Math.round((done / total) * 100) : 0}%`; document.querySelector('#progressCaption').textContent = done ? `${done} check${done === 1 ? '' : 's'} feitos nesta semana.` : 'Comece marcando um hábito hoje.'; }
function renderCalendar() { const year = calendarDate.getFullYear(); const month = calendarDate.getMonth(); document.querySelector('#calendarTitle').textContent = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(calendarDate); const first = new Date(year, month, 1).getDay(); const total = new Date(year, month + 1, 0).getDate(); const cells = []; for (let i = 0; i < first; i += 1) cells.push('<span class="habit-day empty-day"></span>'); for (let day = 1; day <= total; day += 1) { const key = dateKey(new Date(year, month, day)); const count = (completions[key] || []).length; cells.push(`<span class="habit-day ${count ? 'has-progress' : ''} ${key === todayKey() ? 'today' : ''}">${day}</span>`); } document.querySelector('#habitCalendar').innerHTML = cells.join(''); }
function renderAll() { renderHabits(); renderWeek(); renderCalendar(); }
renderAll();
