const sidebar = document.querySelector('#sidebar');
const menu = document.querySelector('#menu');
const modal = document.querySelector('#modal');
const form = document.querySelector('#workoutForm');
const storageKey = 'zyra-workouts';
let workouts = JSON.parse(localStorage.getItem(storageKey) || '[]');
let restInterval;
let editingIndex = null;
let activeWorkoutIndex = null;
let calendarDate = new Date();
const completedDaysKey = 'zyra-completed-training-days';
let completedDays = JSON.parse(localStorage.getItem(completedDaysKey) || '[]');
const restLabel = document.createElement('label');
restLabel.htmlFor = 'restTime';
restLabel.textContent = 'Tempo de pausa entre séries';
const restInput = document.createElement('div');
restInput.className = 'rest-input';
restInput.innerHTML = '<input id="restTime" type="number" min="0" max="600" value="60" required><span>segundos</span>';
document.querySelector('#workoutName').after(restLabel, restInput);
const exerciseLibrary = [
  'Agachamento livre', 'Agachamento sumô', 'Agachamento frontal', 'Agachamento no smith', 'Agachamento hack', 'Agachamento búlgaro', 'Leg press 45°', 'Leg press horizontal', 'Cadeira extensora', 'Cadeira flexora', 'Mesa flexora', 'Flexora em pé', 'Elevação pélvica', 'Stiff', 'Levantamento terra', 'Levantamento terra sumô', 'Passada', 'Afundo', 'Step up', 'Glúteo na máquina', 'Glúteo no cabo', 'Coice na polia', 'Abdução de quadril', 'Adução de quadril', 'Panturrilha em pé', 'Panturrilha sentado', 'Panturrilha no leg press',
  'Supino reto com barra', 'Supino reto com halteres', 'Supino inclinado com barra', 'Supino inclinado com halteres', 'Supino declinado', 'Crucifixo reto', 'Crucifixo inclinado', 'Peck deck', 'Crossover', 'Crossover na polia alta', 'Crossover na polia baixa', 'Flexão de braço', 'Flexão inclinada', 'Pullover',
  'Puxada frontal aberta', 'Puxada frontal fechada', 'Puxada supinada', 'Barra fixa', 'Barra fixa assistida', 'Remada baixa', 'Remada curvada', 'Remada unilateral', 'Remada cavalinho', 'Remada articulada', 'Remada na máquina', 'Face pull', 'Encolhimento com halteres', 'Encolhimento com barra', 'Hiperextensão lombar', '45 degree hyperextension',
  'Desenvolvimento com barra', 'Desenvolvimento com halteres', 'Desenvolvimento na máquina', 'Arnold press', 'Elevação lateral', 'Elevação lateral na polia', 'Elevação frontal', 'Crucifixo inverso', 'Remada alta', 'Rotação externa de ombro',
  'Rosca direta com barra', 'Rosca direta na polia', 'Rosca alternada', 'Rosca martelo', 'Rosca scott', 'Rosca concentrada', 'Rosca inversa', 'Tríceps pulley', 'Tríceps corda', 'Tríceps testa', 'Tríceps francês', 'Tríceps banco', 'Tríceps coice', 'Mergulho nas paralelas',
  'Abdominal supra', 'Abdominal infra', 'Abdominal oblíquo', 'Abdominal na máquina', 'Abdominal na polia', 'Abdominal bicicleta', 'Prancha', 'Prancha lateral', 'Elevação de pernas', 'Russian twist', 'Dead bug', 'Mountain climber',
  'Esteira', 'Corrida', 'Caminhada', 'Bicicleta ergométrica', 'Bicicleta horizontal', 'Elíptico', 'Escada', 'Remo ergômetro', 'Burpee', 'Polichinelo', 'Pular corda'
];
const library = document.createElement('div');
library.className = 'exercise-library';
library.innerHTML = '<label for="exerciseSearch">Biblioteca de exercícios</label><input id="exerciseSearch" placeholder="Buscar exercício..."><div class="library-options" id="libraryOptions"></div><button type="button" class="custom-exercise" id="customExercise">＋ Usar nome personalizado</button>';
document.querySelector('#exerciseList').before(library);

menu.addEventListener('click', () => sidebar.classList.toggle('open'));
document.querySelector('#createWorkout').addEventListener('click', () => {
  modal.classList.add('open');
  document.querySelector('#workoutName').focus();
});
document.querySelector('#newWorkout').addEventListener('click', () => {
  resetForm();
  editingIndex = null;
  modal.classList.add('open');
  document.querySelector('#workoutName').focus();
});
const closeModal = () => modal.classList.remove('open');
document.querySelector('#closeModal').addEventListener('click', closeModal);
document.querySelector('#cancelModal').addEventListener('click', closeModal);
modal.addEventListener('click', (event) => {
  if (event.target === modal) modal.classList.remove('open');
});
document.querySelector('#addExercise').addEventListener('click', () => {
  addExerciseItem();
});
function addExerciseItem(name = '') {
  const firstExercise = document.querySelector('.exercise-item');
  if (name && document.querySelectorAll('.exercise-item').length === 1 && !firstExercise.querySelector('.exercise-name').value.trim()) {
    firstExercise.querySelector('.exercise-name').value = name;
    firstExercise.querySelector('.exercise-name').focus();
    return;
  }
  const row = document.querySelector('.exercise-item').cloneNode(true);
  row.querySelector('.exercise-name').value = name;
  const firstSeries = row.querySelector('.series-row').outerHTML;
  row.querySelector('.series-list').innerHTML = firstSeries;
  document.querySelector('#exerciseList').appendChild(row);
  row.querySelector('.exercise-name').focus();
}
function renderLibrary(query = '') {
  const matches = exerciseLibrary.filter((exercise) => exercise.toLowerCase().includes(query.toLowerCase()));
  document.querySelector('#libraryOptions').innerHTML = matches.map((exercise) => `<button type="button" data-exercise="${exercise}">${exercise}</button>`).join('');
}
document.querySelector('#exerciseSearch').addEventListener('input', (event) => renderLibrary(event.target.value));
document.querySelector('#libraryOptions').addEventListener('click', (event) => {
  if (event.target.tagName !== 'BUTTON') return;
  addExerciseItem(event.target.dataset.exercise);
});
document.querySelector('#customExercise').addEventListener('click', () => {
  addExerciseItem(document.querySelector('#exerciseSearch').value.trim());
});
renderLibrary();
document.querySelector('#exerciseList').addEventListener('click', (event) => {
  if (event.target.classList.contains('remove-exercise')) {
    const exercises = document.querySelectorAll('.exercise-item');
    if (exercises.length > 1) event.target.closest('.exercise-item').remove();
  }
  if (event.target.classList.contains('add-series')) {
    const row = event.target.closest('.exercise-item').querySelector('.series-row').cloneNode(true);
    row.querySelector('.exercise-kg').value = '';
    row.querySelector('.exercise-reps').value = '10';
    row.querySelector('.exercise-type').value = 'Normal';
    event.target.closest('.exercise-item').querySelector('.series-list').appendChild(row);
  }
  if (event.target.classList.contains('remove-series')) {
    const rows = event.target.closest('.series-list').querySelectorAll('.series-row');
    if (rows.length > 1) event.target.closest('.series-row').remove();
  }
});
document.querySelector('#exerciseList').addEventListener('change', (event) => {
  if (event.target.classList.contains('exercise-type')) updateSeriesFields(event.target.closest('.series-row'));
});
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = document.querySelector('#workoutName').value;
  const exercises = [...document.querySelectorAll('.exercise-item')].map((exercise) => ({
    name: exercise.querySelector('.exercise-name').value,
    series: [...exercise.querySelectorAll('.series-row')].map((row) => ({
      type: row.querySelector('.exercise-type').value,
      kg: row.querySelector('.exercise-kg').value,
      reps: row.querySelector('.exercise-type').value === 'Falha' ? null : row.querySelector('.exercise-reps').value
    }))
  }));
  const workout = { name, rest: Number(document.querySelector('#restTime').value) || 0, exercises };
  if (editingIndex === null) workouts.push(workout);
  else workouts[editingIndex] = workout;
  localStorage.setItem(storageKey, JSON.stringify(workouts));
  editingIndex = null;
  modal.classList.remove('open');
  renderWorkouts();
});

function resetForm() {
  form.reset();
  const list = document.querySelector('#exerciseList');
  const template = list.firstElementChild?.outerHTML || createExerciseTemplate().outerHTML;
  list.innerHTML = template;
  document.querySelector('#exerciseSearch').value = '';
  renderLibrary();
}

function renderWorkouts() {
  const emptyState = document.querySelector('#emptyState');
  const collection = document.querySelector('#workoutCollection');
  const cards = document.querySelector('#workoutCards');
  emptyState.style.display = workouts.length ? 'none' : 'flex';
  collection.classList.toggle('visible', workouts.length > 0);
  cards.innerHTML = workouts.map((workout, index) => `<article class="saved-workout"><div><span class="saved-icon">◉</span><div><h3>${workout.name}</h3><p>${workout.exercises.length} exercício${workout.exercises.length === 1 ? '' : 's'}</p></div></div><div class="card-actions"><button class="edit-workout" data-index="${index}" aria-label="Editar ${workout.name}">✎</button><button class="delete-workout" data-index="${index}" aria-label="Excluir ${workout.name}">×</button></div><ul>${workout.exercises.map((exercise) => `<li><strong>${exercise.name}</strong><span>${(exercise.series || [{type: exercise.type, kg: '', reps: exercise.reps}]).map((series) => `${series.type} · ${series.kg ? `${series.kg} kg · ` : ''}${series.type === 'Falha' ? 'até falhar' : `${series.reps} reps`}`).join(' | ')}</span></li>`).join('')}</ul><button class="start-workout" data-index="${index}">▶ Iniciar treino</button></article>`).join('');
  cards.querySelectorAll('.delete-workout').forEach((button) => button.addEventListener('click', () => {
    workouts.splice(Number(button.dataset.index), 1);
    localStorage.setItem(storageKey, JSON.stringify(workouts));
    renderWorkouts();
  }));
  cards.querySelectorAll('.start-workout').forEach((button) => button.addEventListener('click', () => startWorkout(Number(button.dataset.index))));
  cards.querySelectorAll('.edit-workout').forEach((button) => button.addEventListener('click', () => editWorkout(Number(button.dataset.index))));
}

function editWorkout(index) {
  const workout = workouts[index];
  editingIndex = index;
  resetForm();
  document.querySelector('#workoutName').value = workout.name;
  document.querySelector('#restTime').value = workout.rest ?? 60;
  const list = document.querySelector('#exerciseList');
  list.innerHTML = '';
  workout.exercises.forEach((exercise) => {
    const item = document.querySelector('.exercise-item')?.cloneNode(true) || createExerciseTemplate();
    item.querySelector('.exercise-name').value = exercise.name;
    const seriesList = item.querySelector('.series-list');
    seriesList.innerHTML = '';
    (exercise.series || [{ type: exercise.type || 'Normal', kg: '', reps: exercise.reps || 10 }]).forEach((series) => {
      const row = createSeriesTemplate();
      row.querySelector('.exercise-type').value = series.type;
      row.querySelector('.exercise-kg').value = series.kg || '';
      row.querySelector('.exercise-reps').value = series.reps || 10;
      seriesList.appendChild(row);
      updateSeriesFields(row);
    });
    list.appendChild(item);
  });
  modal.classList.add('open');
  document.querySelector('#workoutName').focus();
}

function createSeriesTemplate() {
  const row = document.createElement('div');
  row.className = 'series-row';
  row.innerHTML = '<select class="exercise-type" aria-label="Tipo de série"><option>Aquec.</option><option selected>Normal</option><option>Falha</option><option>Drop set</option></select><input class="exercise-kg" type="number" min="0" placeholder="kg" aria-label="Carga em kg"><input class="exercise-reps" type="number" min="1" value="10" placeholder="reps" aria-label="Repetições"><button type="button" class="remove-series" aria-label="Remover série">×</button>';
  return row;
}

function createExerciseTemplate() {
  const item = document.createElement('div');
  item.className = 'exercise-item';
  item.innerHTML = '<div class="exercise-top"><input class="exercise-name" required placeholder="Nome do exercício"><button type="button" class="remove-exercise" aria-label="Remover exercício">×</button></div><div class="series-list"></div><button type="button" class="add-series">＋ Adicionar série</button>';
  return item;
}

renderWorkouts();

function updateSeriesFields(row) {
  const isFailure = row.querySelector('.exercise-type').value === 'Falha';
  row.classList.toggle('failure-series', isFailure);
  row.querySelector('.exercise-reps').hidden = isFailure;
}

document.querySelectorAll('.series-row').forEach(updateSeriesFields);

function startWorkout(index) {
  const workout = workouts[index];
  activeWorkoutIndex = index;
  document.querySelector('#workoutCollection').classList.remove('visible');
  document.querySelector('#emptyState').style.display = 'none';
  document.querySelector('#activeWorkout').classList.add('visible');
  document.querySelector('#activeWorkoutName').textContent = workout.name;
  document.querySelector('#activeWorkout').dataset.rest = workout.rest ?? 60;
  document.querySelector('#activeTimer')?.remove();
  document.querySelector('#activeProgress').insertAdjacentHTML('beforebegin', '<span class="active-timer" id="activeTimer">Pausa: pronta</span>');
  document.querySelector('#activeExercises').innerHTML = workout.exercises.map((exercise, exerciseIndex) => { const seriesList = exercise.series || [{ type: exercise.type || 'Normal', kg: '', reps: exercise.reps || 10 }]; return `<article class="active-exercise"><div class="active-exercise-heading"><div><h3>${exercise.name}</h3><small>${seriesList.length} séries</small></div><span class="exercise-count" data-exercise="${exerciseIndex}">0/${seriesList.length}</span></div><div class="active-series">${seriesList.map((series, seriesIndex) => `<label class="active-series-row"><input type="checkbox" data-exercise="${exerciseIndex}" data-series="${seriesIndex}"><span class="series-check">✓</span><strong>${series.type}</strong><span>${series.kg ? `${series.kg} kg` : '-- kg'}</span><span>${series.type === 'Falha' ? 'até falhar' : `${series.reps} reps`}</span></label>`).join('')}</div></article>`; }).join('');
  document.querySelectorAll('.active-series-row input').forEach((checkbox) => checkbox.addEventListener('change', () => {
    updateActiveProgress();
    if (checkbox.checked) startRestTimer(Number(document.querySelector('#activeWorkout').dataset.rest));
  }));
  updateActiveProgress();
}

function startRestTimer(seconds) {
  clearInterval(restInterval);
  let remaining = seconds;
  const timer = document.querySelector('#activeTimer');
  if (!timer || remaining <= 0) { if (timer) timer.textContent = 'Pausa desativada'; return; }
  const render = () => { timer.textContent = `Pausa: ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`; };
  render();
  restInterval = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) { clearInterval(restInterval); timer.textContent = 'Pausa concluída'; return; }
    render();
  }, 1000);
}

function updateActiveProgress() {
  const checks = [...document.querySelectorAll('.active-series-row input')];
  const completed = checks.filter((checkbox) => checkbox.checked).length;
  document.querySelector('#activeProgress').textContent = `${completed}/${checks.length} séries`;
  document.querySelectorAll('.exercise-count').forEach((count) => {
    const exercise = count.dataset.exercise;
    const rows = document.querySelectorAll(`.active-series-row input[data-exercise="${exercise}"]`);
    count.textContent = `${[...rows].filter((checkbox) => checkbox.checked).length}/${rows.length}`;
  });
}

const closeActiveWorkout = () => {
  clearInterval(restInterval);
  document.querySelector('#activeWorkout').classList.remove('visible');
  renderWorkouts();
};
document.querySelector('#finishWorkout').addEventListener('click', () => {
  const today = getDateKey(new Date());
  if (!completedDays.includes(today)) completedDays.push(today);
  localStorage.setItem(completedDaysKey, JSON.stringify(completedDays));
  closeActiveWorkout();
  renderHistory();
});
document.querySelector('#cancelActive').addEventListener('click', closeActiveWorkout);

function getDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function calculateStreak() {
  const trained = new Set(completedDays);
  const cursor = new Date();
  let streak = 0;
  while (trained.has(getDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function renderHistory() {
  const streak = calculateStreak();
  document.querySelector('#streakCount').textContent = streak;
  document.querySelector('#sidebarStreak').textContent = `${streak} ${streak === 1 ? 'DIA' : 'DIAS'} DE OFENSIVA`;
  document.querySelector('#trainedCount').textContent = completedDays.length;
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  document.querySelector('#calendarTitle').textContent = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(calendarDate);
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i += 1) cells.push('<span class="calendar-day empty-day"></span>');
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const key = getDateKey(date);
    const today = key === getDateKey(new Date()) ? ' today' : '';
    const trained = completedDays.includes(key) ? ' trained' : '';
    cells.push(`<span class="calendar-day${today}${trained}">${day}</span>`);
  }
  document.querySelector('#calendarGrid').innerHTML = cells.join('');
}

document.querySelector('#previousMonth').addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() - 1); renderHistory(); });
document.querySelector('#nextMonth').addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() + 1); renderHistory(); });
renderHistory();
