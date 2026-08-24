const sidebar = document.querySelector('#sidebar');
const storageKey = 'zyra-moods';
let moods = JSON.parse(localStorage.getItem(storageKey) || '[]');
let calendarDate = new Date();
const moodNames = { radiante: 'Radiante', bem: 'Bem', ok: 'Ok', mal: 'Mal', 'pes­sima': 'Péssima' };
const moodEmoji = { radiante: '🌞', bem: '🙂', ok: '😐', mal: '😔', 'pes­sima': '😞' };

document.querySelector('#menu').addEventListener('click', () => sidebar.classList.toggle('open'));
document.querySelectorAll('.tag-row button').forEach((button) => button.addEventListener('click', () => {
  const note = document.querySelector('#moodNote');
  note.value = note.value ? `${note.value}, ${button.textContent.toLowerCase()}` : button.textContent;
  note.focus();
}));
document.querySelector('#saveMood').addEventListener('click', () => {
  const mood = document.querySelector('input[name="mood"]:checked').value;
  const date = getDateKey(new Date());
  moods = moods.filter((entry) => entry.date !== date);
  moods.push({ date, mood, note: document.querySelector('#moodNote').value.trim() });
  localStorage.setItem(storageKey, JSON.stringify(moods));
  document.querySelector('#moodFeedback').classList.add('visible');
  renderAll();
  window.setTimeout(() => document.querySelector('#moodFeedback').classList.remove('visible'), 2200);
});
document.querySelector('#previousMonth').addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() - 1); renderCalendar(); });
document.querySelector('#nextMonth').addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() + 1); renderCalendar(); });

function getDateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function renderCalendar() {
  const year = calendarDate.getFullYear(); const month = calendarDate.getMonth();
  document.querySelector('#calendarTitle').textContent = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(calendarDate);
  const firstDay = new Date(year, month, 1).getDay(); const days = new Date(year, month + 1, 0).getDate(); const cells = [];
  for (let i = 0; i < firstDay; i += 1) cells.push('<span class="mood-day empty-day"></span>');
  for (let day = 1; day <= days; day += 1) { const date = getDateKey(new Date(year, month, day)); const entry = moods.find((item) => item.date === date); const today = date === getDateKey(new Date()) ? ' today' : ''; cells.push(`<span class="mood-day${today} ${entry ? `has-mood mood-${entry.mood}` : ''}" title="${entry ? moodNames[entry.mood] : 'Sem registro'}">${entry ? moodEmoji[entry.mood] : day}</span>`); }
  document.querySelector('#moodCalendar').innerHTML = cells.join('');
}
function renderHistory() {
  const history = [...moods].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  document.querySelector('#moodTotal').textContent = `${moods.length} ${moods.length === 1 ? 'registro' : 'registros'}`;
  document.querySelector('#moodHistory').innerHTML = history.length ? history.map((entry) => `<article class="mood-entry"><span>${moodEmoji[entry.mood]}</span><div><strong>${moodNames[entry.mood]}</strong><small>${new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' }).format(new Date(`${entry.date}T12:00:00`))}</small>${entry.note ? `<p>${entry.note}</p>` : ''}</div></article>`).join('') : '<p class="history-empty">Seus registros aparecerão aqui.</p>';
}
function renderAll() { renderCalendar(); renderHistory(); }
renderAll();
