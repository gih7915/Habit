const sidebar = document.querySelector('#sidebar');

const objectiveSelectionKey = 'habit-study-objective-selection';
const objectiveFoldersKey = 'habit-study-objective-folders';
const disciplinesKey = 'habit-study-disciplines-v2';
const contentsKey = 'habit-study-contents-v2';
const reviewsKey = 'habit-study-reviews';

const legacyDisciplineKey = 'habit-disciplines';
const legacySubjectKey = 'habit-subjects';
const legacyPreferenceKey = 'habit-study-preferences';

const objectiveLabels = {
  escola: 'Escola',
  faculdade: 'Faculdade',
  concurso: 'Concurso',
  vestibular: 'Vestibular',
  enem: 'ENEM'
};

const levelLabels = {
  facil: 'Facil',
  medio: 'Medio',
  dificil: 'Dificil'
};

const weekdayLabels = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function objectiveHasAbsences(objectiveKey) {
  return objectiveKey === 'escola' || objectiveKey === 'faculdade';
}

let selectedObjectives = normalizeObjectiveSelection(JSON.parse(localStorage.getItem(objectiveSelectionKey) || 'null'));
let objectiveFolders = normalizeObjectiveFolders(JSON.parse(localStorage.getItem(objectiveFoldersKey) || 'null'));
let disciplines = normalizeDisciplines(JSON.parse(localStorage.getItem(disciplinesKey) || 'null'));
let contents = normalizeContents(JSON.parse(localStorage.getItem(contentsKey) || 'null'));
let reviews = normalizeReviews(JSON.parse(localStorage.getItem(reviewsKey) || '[]'));
let filter = 'all';
let currentCalendarDate = new Date();
let editingDisciplineId = null;
let absenceMode = 'add';

migrateLegacyIfNeeded();
syncObjectiveFoldersFromSelection();

document.querySelector('#menu').addEventListener('click', () => sidebar.classList.toggle('open'));

const closeDisciplineModal = () => { document.querySelector('#disciplineModal').classList.remove('open'); editingDisciplineId = null; };
const closeSubjectModal = () => document.querySelector('#subjectModal').classList.remove('open');
const closeAbsenceModal = () => { document.querySelector('#absenceModal').classList.remove('open'); absenceMode = 'add'; };
const closeAssessmentModal = () => document.querySelector('#assessmentModal').classList.remove('open');

document.querySelector('#closeDiscipline').addEventListener('click', closeDisciplineModal);
document.querySelector('#cancelDiscipline').addEventListener('click', closeDisciplineModal);
document.querySelector('#disciplineModal').addEventListener('click', (event) => {
  if (event.target.id === 'disciplineModal') closeDisciplineModal();
});

document.querySelector('#closeSubject').addEventListener('click', closeSubjectModal);
document.querySelector('#cancelSubject').addEventListener('click', closeSubjectModal);
document.querySelector('#subjectModal').addEventListener('click', (event) => {
  if (event.target.id === 'subjectModal') closeSubjectModal();
});

document.querySelector('#closeAbsence').addEventListener('click', closeAbsenceModal);
document.querySelector('#cancelAbsence').addEventListener('click', closeAbsenceModal);
document.querySelector('#absenceModal').addEventListener('click', (event) => {
  if (event.target.id === 'absenceModal') closeAbsenceModal();
});

document.querySelector('#closeAssessment').addEventListener('click', closeAssessmentModal);
document.querySelector('#cancelAssessment').addEventListener('click', closeAssessmentModal);
document.querySelector('#assessmentModal').addEventListener('click', (event) => {
  if (event.target.id === 'assessmentModal') closeAssessmentModal();
});

document.querySelector('#subjectObjective').addEventListener('change', () => {
  syncSubjectDisciplineOptions();
});

document.querySelector('#subjectReviewEnabled').addEventListener('change', syncReviewTimeField);
document.querySelector('#subjectReviewEnabled').addEventListener('change', syncReviewPlanFields);
document.querySelector('#subjectLevel').addEventListener('change', syncReviewTimeField);
document.querySelector('#subjectReviewPlanMode').addEventListener('change', syncReviewPlanFields);
document.querySelector('#reviewPrevMonth').addEventListener('click', () => {
  currentCalendarDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1);
  renderReviewCalendar();
});
document.querySelector('#reviewNextMonth').addEventListener('click', () => {
  currentCalendarDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1);
  renderReviewCalendar();
});

document.querySelector('#disciplineObjective').addEventListener('change', () => {
  syncDisciplineAbsenceField();
});

document.querySelector('#addScheduleEntry').addEventListener('click', () => {
  appendScheduleEntry();
});

document.querySelector('#disciplineScheduleEntries').addEventListener('click', (event) => {
  if (!event.target.classList.contains('remove-schedule-entry')) return;
  event.target.closest('.discipline-schedule-entry').remove();
});

document.querySelector('#disciplineForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const objectiveKey = document.querySelector('#disciplineObjective').value;
  const name = document.querySelector('#disciplineName').value.trim();
  if (!objectiveKey || !name) return;
  const schedules = objectiveHasAbsences(objectiveKey) ? readScheduleEntries() : [];
  if (objectiveHasAbsences(objectiveKey) && (!schedules.length || schedules.some((schedule) => schedule.endTime <= schedule.startTime))) {
    window.alert('Informe pelo menos um dia e um horário válido para a disciplina.');
    return;
  }

  const disciplineData = {
    objectiveKey,
    name,
    description: document.querySelector('#disciplineDescription').value.trim(),
    absenceLimit: objectiveHasAbsences(objectiveKey)
      ? Math.max(1, Number(document.querySelector('#disciplineAbsenceLimit').value) || 10)
      : null,
    schedules
  };
  const existing = disciplines.find((item) => item.id === editingDisciplineId);
  if (existing) {
    Object.assign(existing, disciplineData);
  } else {
    disciplines.push({ id: crypto.randomUUID(), ...disciplineData, absences: 0, absenceDates: [], assessments: [], createdAt: new Date().toISOString() });
  }

  saveDisciplines();
  event.target.reset();
  renderScheduleEntries();
  closeDisciplineModal();
  renderAll();
});

document.querySelector('#absenceForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const discipline = disciplines.find((item) => item.id === document.querySelector('#absenceDisciplineId').value);
  if (!discipline || !objectiveHasAbsences(discipline.objectiveKey)) return;
  if (absenceMode === 'remove') {
    const date = document.querySelector('#absenceRemovalDate').value;
    if (!date) return;
    const index = discipline.absenceDates.indexOf(date);
    if (index === -1) return;
    discipline.absenceDates.splice(index, 1);
    discipline.absences = Math.max(0, discipline.absences - 1);
  } else {
    const date = document.querySelector('#absenceDate').value;
    if (!date) return;
    discipline.absenceDates.push(date);
    discipline.absences += 1;
  }
  saveDisciplines();
  closeAbsenceModal();
  renderAll();
});

document.querySelector('#assessmentForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const discipline = disciplines.find((item) => item.id === document.querySelector('#assessmentDisciplineId').value);
  const name = document.querySelector('#assessmentName').value.trim();
  const date = document.querySelector('#assessmentDate').value;
  if (!discipline || !name || !date) return;
  discipline.assessments.push({ id: crypto.randomUUID(), name, date });
  discipline.assessments.sort((first, second) => first.date.localeCompare(second.date));
  saveDisciplines();
  event.target.reset();
  closeAssessmentModal();
  renderAll();
});

document.querySelector('#subjectForm').addEventListener('submit', (event) => {
  event.preventDefault();

  const objectiveKey = document.querySelector('#subjectObjective').value;
  const disciplineId = document.querySelector('#subjectDiscipline').value;
  const reviewMinutes = Number(document.querySelector('#subjectReviewMinutes').value);
  const reviewEnabled = document.querySelector('#subjectReviewEnabled').value === 'yes';
  const reviewPlanMode = document.querySelector('#subjectReviewPlanMode').value;
  const reviewPlanOffsets = buildReviewOffsets(reviewEnabled, reviewPlanMode);

  contents.push({
    id: crypto.randomUUID(),
    objectiveKey,
    disciplineId,
    name: document.querySelector('#subjectName').value.trim(),
    reviewEnabled,
    reviewMinutes: reviewEnabled && Number.isFinite(reviewMinutes) && reviewMinutes > 0 ? reviewMinutes : null,
    reviewPlanMode: reviewEnabled ? reviewPlanMode : null,
    reviewOffsets: reviewEnabled ? reviewPlanOffsets : [],
    level: document.querySelector('#subjectLevel').value,
    lastStudyAt: null
  });

  saveContents();
  event.target.reset();
  document.querySelector('#subjectReviewMinutes').value = '45';
  document.querySelector('#subjectLevel').value = 'medio';
  document.querySelector('#subjectReviewEnabled').value = 'yes';
  document.querySelector('#subjectReviewPlanMode').value = 'recommended';
  document.querySelector('#subjectReviewCount').value = '3';
  document.querySelector('#subjectReviewDays').value = '1, 7, 30';
  syncReviewTimeField();
  syncReviewPlanFields();
  closeSubjectModal();
  renderAll();
});

document.querySelectorAll('.study-tabs button').forEach((button) => {
  button.addEventListener('click', () => {
    filter = button.dataset.filter;
    document.querySelectorAll('.study-tabs button').forEach((item) => item.classList.remove('selected'));
    button.classList.add('selected');
    renderHierarchy();
  });
});

function migrateLegacyIfNeeded() {
  if (contents.length || disciplines.length || objectiveFolders.length) return;

  const legacyPreferences = JSON.parse(localStorage.getItem(legacyPreferenceKey) || 'null') || { focuses: ['faculdade'] };
  const legacyDisciplines = JSON.parse(localStorage.getItem(legacyDisciplineKey) || '[]');
  const legacySubjects = JSON.parse(localStorage.getItem(legacySubjectKey) || '[]');

  selectedObjectives = normalizeObjectiveSelection(legacyPreferences.focuses || ['faculdade']);
  syncObjectiveFoldersFromSelection();

  const firstObjective = selectedObjectives[0] || 'faculdade';

  disciplines = legacyDisciplines.map((item) => ({
    id: item.id || crypto.randomUUID(),
    objectiveKey: firstObjective,
    name: item.name || 'Disciplina',
    description: item.description || '',
    absenceLimit: objectiveHasAbsences(firstObjective) ? (Number(item.absenceLimit) > 0 ? Number(item.absenceLimit) : 10) : null,
    absences: Number(item.absences) >= 0 ? Number(item.absences) : 0,
    absenceDates: [],
    schedules: [],
    assessments: [],
    createdAt: item.createdAt || new Date().toISOString()
  }));

  if (!disciplines.length) {
    disciplines.push({
      id: crypto.randomUUID(),
      objectiveKey: firstObjective,
      name: 'Disciplinas gerais',
      description: '',
      absenceLimit: objectiveHasAbsences(firstObjective) ? 10 : null,
      absences: 0,
      absenceDates: [],
      schedules: [],
      assessments: [],
      createdAt: new Date().toISOString()
    });
  }

  const fallbackDisciplineId = disciplines[0].id;

  contents = legacySubjects.map((item) => ({
    id: item.id || crypto.randomUUID(),
    objectiveKey: firstObjective,
    disciplineId: item.disciplineId || fallbackDisciplineId,
    name: item.name || 'Conteudo sem nome',
    reviewEnabled: item.reviewEnabled !== false,
    reviewMinutes: item.reviewEnabled === false ? null : (Number(item.reviewMinutes) > 0 ? Number(item.reviewMinutes) : 45),
    reviewPlanMode: item.reviewEnabled === false ? null : 'recommended',
    reviewOffsets: item.reviewEnabled === false ? [] : [1, 7, 30],
    level: levelLabels[item.level] ? item.level : 'medio',
    lastStudyAt: item.lastStudyAt || null
  }));
}

function normalizeObjectiveSelection(list) {
  const raw = Array.isArray(list) ? list : ['faculdade'];
  const valid = raw.filter((item) => objectiveLabels[item]);
  return valid.length ? [...new Set(valid)] : ['faculdade'];
}

function normalizeObjectiveFolders(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((item) => item && objectiveLabels[item.key])
    .map((item) => ({
      id: item.id || crypto.randomUUID(),
      key: item.key,
      name: objectiveLabels[item.key],
      createdAt: item.createdAt || new Date().toISOString()
    }));
}

function normalizeDisciplines(list) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => {
    const objectiveKey = objectiveLabels[item.objectiveKey] ? item.objectiveKey : 'faculdade';
    return {
      id: item.id || crypto.randomUUID(),
      objectiveKey,
      name: item.name || 'Disciplina',
      description: item.description || '',
      absenceLimit: objectiveHasAbsences(objectiveKey)
        ? (Number(item.absenceLimit) > 0 ? Number(item.absenceLimit) : 10)
        : null,
      absences: Number(item.absences) >= 0 ? Number(item.absences) : 0,
      absenceDates: normalizeAbsenceDates(item.absenceDates),
      schedules: normalizeSchedules(item.schedules, item.schedule, objectiveKey),
      assessments: normalizeAssessments(item.assessments),
      createdAt: item.createdAt || new Date().toISOString()
    };
  });
}

function syncDisciplineAbsenceField() {
  const objectiveKey = document.querySelector('#disciplineObjective').value;
  const field = document.querySelector('#disciplineAbsenceField');
  const input = document.querySelector('#disciplineAbsenceLimit');
  const scheduleField = document.querySelector('#disciplineScheduleField');
  const enabled = objectiveHasAbsences(objectiveKey);
  field.style.display = enabled ? 'block' : 'none';
  scheduleField.style.display = enabled ? 'block' : 'none';
  input.required = enabled;
  if (enabled && !document.querySelector('#disciplineScheduleEntries').children.length) renderScheduleEntries();
  document.querySelectorAll('.schedule-weekday, .schedule-start-time, .schedule-end-time').forEach((entry) => {
    entry.required = enabled;
  });
}

function normalizeAbsenceDates(dates) {
  return Array.isArray(dates) ? dates.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)) : [];
}

function normalizeSchedules(schedules, legacySchedule, objectiveKey) {
  if (!objectiveHasAbsences(objectiveKey)) return [];
  const rawSchedules = Array.isArray(schedules) ? schedules : (legacySchedule ? [legacySchedule] : []);
  return rawSchedules
    .map((schedule) => ({ weekday: Number(schedule.weekday), startTime: schedule.startTime, endTime: schedule.endTime }))
    .filter((schedule) => Number.isInteger(schedule.weekday) && schedule.weekday >= 0 && schedule.weekday <= 6 && /^\d{2}:\d{2}$/.test(schedule.startTime) && /^\d{2}:\d{2}$/.test(schedule.endTime) && schedule.endTime > schedule.startTime)
    .sort((first, second) => first.weekday - second.weekday || first.startTime.localeCompare(second.startTime));
}

function scheduleEntryMarkup(schedule = { weekday: 1, startTime: '08:00', endTime: '10:00' }) {
  return `<div class="discipline-schedule-entry"><select class="schedule-weekday" aria-label="Dia da aula">${weekdayLabels.map((label, weekday) => `<option value="${weekday}" ${weekday === schedule.weekday ? 'selected' : ''}>${label}</option>`).join('')}</select><div class="discipline-time-fields"><div><label>Início</label><input class="schedule-start-time" type="time" value="${schedule.startTime}"></div><div><label>Fim</label><input class="schedule-end-time" type="time" value="${schedule.endTime}"></div></div><button type="button" class="remove-schedule-entry">Remover horário</button></div>`;
}

function renderScheduleEntries(schedules = [{ weekday: 1, startTime: '08:00', endTime: '10:00' }]) {
  document.querySelector('#disciplineScheduleEntries').innerHTML = schedules.map(scheduleEntryMarkup).join('');
}

function appendScheduleEntry() {
  document.querySelector('#disciplineScheduleEntries').insertAdjacentHTML('beforeend', scheduleEntryMarkup());
  document.querySelectorAll('.schedule-weekday, .schedule-start-time, .schedule-end-time').forEach((entry) => { entry.required = true; });
}

function readScheduleEntries() {
  return Array.from(document.querySelectorAll('.discipline-schedule-entry')).map((entry) => ({
    weekday: Number(entry.querySelector('.schedule-weekday').value),
    startTime: entry.querySelector('.schedule-start-time').value,
    endTime: entry.querySelector('.schedule-end-time').value
  }));
}

function normalizeAssessments(assessments) {
  if (!Array.isArray(assessments)) return [];
  return assessments
    .filter((assessment) => assessment && assessment.name && /^\d{4}-\d{2}-\d{2}$/.test(assessment.date))
    .map((assessment) => ({ id: assessment.id || crypto.randomUUID(), name: assessment.name, date: assessment.date }))
    .sort((first, second) => first.date.localeCompare(second.date));
}

function normalizeContents(list) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => ({
    id: item.id || crypto.randomUUID(),
    objectiveKey: objectiveLabels[item.objectiveKey] ? item.objectiveKey : 'faculdade',
    disciplineId: item.disciplineId || '',
    name: item.name || 'Conteudo sem nome',
    reviewEnabled: item.reviewEnabled !== false,
    reviewMinutes: item.reviewEnabled === false ? null : (Number(item.reviewMinutes) > 0 ? Number(item.reviewMinutes) : 45),
    reviewPlanMode: item.reviewEnabled === false ? null : (item.reviewPlanMode === 'custom' ? 'custom' : 'recommended'),
    reviewOffsets: normalizeReviewOffsets(item.reviewOffsets, item.reviewEnabled !== false),
    level: levelLabels[item.level] ? item.level : 'medio',
    lastStudyAt: item.lastStudyAt || null
  }));
}

function normalizeReviews(list) {
  return list
    .filter((review) => review && review.id && review.contentId && review.dueAt)
    .map((review) => ({
      id: review.id,
      contentId: review.contentId,
      contentName: review.contentName || 'Conteudo',
      disciplineName: review.disciplineName || 'Disciplina',
      objectiveName: review.objectiveName || 'Objetivo',
      note: review.note || '',
      stage: review.stage || 1,
      dueAt: review.dueAt,
      createdAt: review.createdAt || review.dueAt,
      completedAt: review.completedAt || null
    }));
}

function suggestedReviewMinutes(level) {
  if (level === 'facil') return 30;
  if (level === 'dificil') return 60;
  return 45;
}

function syncReviewTimeField() {
  const enabled = document.querySelector('#subjectReviewEnabled').value === 'yes';
  const level = document.querySelector('#subjectLevel').value;
  const field = document.querySelector('#subjectReviewTimeField');
  const input = document.querySelector('#subjectReviewMinutes');
  const hint = document.querySelector('#subjectReviewHint');
  field.style.display = enabled ? 'block' : 'none';
  input.required = enabled;
  const recommended = suggestedReviewMinutes(level);
  if (!input.value || Number(input.value) <= 0) {
    input.value = String(recommended);
  }
  hint.textContent = `Recomendação para nível ${levelLabels[level]}: ${recommended} min.`;
}

function syncReviewPlanFields() {
  const enabled = document.querySelector('#subjectReviewEnabled').value === 'yes';
  const mode = document.querySelector('#subjectReviewPlanMode').value;
  const planField = document.querySelector('#subjectReviewPlanField');
  const customConfig = document.querySelector('#subjectCustomReviewConfig');
  const countInput = document.querySelector('#subjectReviewCount');
  const daysInput = document.querySelector('#subjectReviewDays');

  planField.style.display = enabled ? 'block' : 'none';
  customConfig.style.display = enabled && mode === 'custom' ? 'block' : 'none';
  countInput.required = enabled && mode === 'custom';
  daysInput.required = enabled && mode === 'custom';
}

function visibleContent(content) {
  const discipline = disciplines.find((item) => item.id === content.disciplineId);
  const disciplineAttention = discipline && objectiveHasAbsences(discipline.objectiveKey) && discipline.absenceLimit
    ? discipline.absences >= discipline.absenceLimit * 0.7
    : false;
  const overdueReviews = reviews.filter((item) => item.contentId === content.id && !item.completedAt && new Date(item.dueAt).getTime() < Date.now()).length;
  if (filter === 'attention') return disciplineAttention || overdueReviews > 0;
  if (filter === 'good') return !disciplineAttention && overdueReviews === 0;
  return true;
}

function normalizeReviewOffsets(offsets, enabled) {
  if (!enabled) return [];
  if (!Array.isArray(offsets) || !offsets.length) return [1, 7, 30];
  return [...new Set(offsets.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0))].sort((a, b) => a - b);
}

function buildReviewOffsets(enabled, mode) {
  if (!enabled) return [];
  if (mode !== 'custom') return [1, 7, 30];

  const desiredCount = Math.max(1, Math.min(8, Number(document.querySelector('#subjectReviewCount').value) || 1));
  const dayValues = document.querySelector('#subjectReviewDays').value
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);

  const uniqueSorted = [...new Set(dayValues)].sort((a, b) => a - b);
  if (!uniqueSorted.length) return [1, 7, 30].slice(0, desiredCount);
  return uniqueSorted.slice(0, desiredCount);
}

function saveObjectiveSelection() {
  localStorage.setItem(objectiveSelectionKey, JSON.stringify(selectedObjectives));
}

function saveObjectiveFolders() {
  localStorage.setItem(objectiveFoldersKey, JSON.stringify(objectiveFolders));
}

function saveDisciplines() {
  localStorage.setItem(disciplinesKey, JSON.stringify(disciplines));
}

function saveContents() {
  localStorage.setItem(contentsKey, JSON.stringify(contents));
}

function saveReviews() {
  localStorage.setItem(reviewsKey, JSON.stringify(reviews));
}

function syncObjectiveFoldersFromSelection() {
  const known = new Set(objectiveFolders.map((item) => item.key));
  selectedObjectives.forEach((key) => {
    if (!known.has(key)) {
      objectiveFolders.push({ id: crypto.randomUUID(), key, name: objectiveLabels[key], createdAt: new Date().toISOString() });
    }
  });

  objectiveFolders = objectiveFolders.filter((item) => selectedObjectives.includes(item.key));

  const validKeys = new Set(objectiveFolders.map((item) => item.key));
  disciplines = disciplines.filter((item) => validKeys.has(item.objectiveKey));
  const disciplineIds = new Set(disciplines.map((item) => item.id));
  contents = contents.filter((item) => disciplineIds.has(item.disciplineId));
  const contentIds = new Set(contents.map((item) => item.id));
  reviews = reviews.filter((item) => contentIds.has(item.contentId));
}

function syncDisciplineObjectiveOptions(preselectKey) {
  const select = document.querySelector('#disciplineObjective');
  select.innerHTML = objectiveFolders.map((folder) => `<option value="${folder.key}">${folder.name}</option>`).join('');
  if (preselectKey) select.value = preselectKey;
}

function syncSubjectObjectiveOptions(preselectKey) {
  const select = document.querySelector('#subjectObjective');
  select.innerHTML = objectiveFolders.map((folder) => `<option value="${folder.key}">${folder.name}</option>`).join('');
  if (preselectKey) select.value = preselectKey;
}

function syncSubjectDisciplineOptions(preselectId) {
  const objectiveKey = document.querySelector('#subjectObjective').value;
  const select = document.querySelector('#subjectDiscipline');
  const available = disciplines.filter((item) => item.objectiveKey === objectiveKey);

  select.innerHTML = available.length
    ? available.map((item) => `<option value="${item.id}">${item.name}</option>`).join('')
    : '<option value="">Nenhuma disciplina neste objetivo</option>';

  if (preselectId) select.value = preselectId;
}

function renderObjectiveSelection() {
  const container = document.querySelector('#objectiveSelector');
  const summary = document.querySelector('#focusSummary');
  const summaryCards = document.querySelector('#objectiveSummary');

  container.innerHTML = Object.keys(objectiveLabels).map((key) => {
    const selected = selectedObjectives.includes(key);
    return `<button type="button" class="focus-chip ${selected ? 'selected' : ''}" data-objective="${key}">${objectiveLabels[key]}</button>`;
  }).join('');

  summaryCards.innerHTML = objectiveFolders.length
    ? objectiveFolders.map((folder) => {
      const disciplineCount = disciplines.filter((item) => item.objectiveKey === folder.key).length;
      const contentCount = contents.filter((item) => item.objectiveKey === folder.key).length;
      return `<span class="topic-chip selected">${folder.name}: ${disciplineCount} disciplinas, ${contentCount} conteudos</span>`;
    }).join('')
    : '<span class="topic-empty">Nenhum objetivo selecionado.</span>';

  summary.textContent = objectiveFolders.length
    ? 'Pastas de objetivo criadas automaticamente. Agora adicione disciplinas em cada pasta.'
    : 'Selecione objetivos para montar sua arvore de estudos.';

  container.querySelectorAll('.focus-chip').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.objective;
      if (selectedObjectives.includes(key)) {
        selectedObjectives = selectedObjectives.filter((item) => item !== key);
      } else {
        selectedObjectives.push(key);
      }

      if (!selectedObjectives.length) selectedObjectives = ['faculdade'];

      syncObjectiveFoldersFromSelection();
      saveObjectiveSelection();
      saveObjectiveFolders();
      saveDisciplines();
      saveContents();
      saveReviews();
      renderAll();
    });
  });
}

function scheduleReviews(content, note = '') {
  if (!content.reviewEnabled) return;

  const discipline = disciplines.find((item) => item.id === content.disciplineId);
  const objective = objectiveFolders.find((item) => item.key === content.objectiveKey);
  const now = new Date();
  const offsets = content.reviewOffsets.length ? content.reviewOffsets : [1, 7, 30];

  offsets.forEach((days, index) => {
    const due = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    reviews.push({
      id: crypto.randomUUID(),
      contentId: content.id,
      contentName: content.name,
      disciplineName: discipline ? discipline.name : 'Disciplina',
      objectiveName: objective ? objective.name : 'Objetivo',
      note,
      stage: index + 1,
      dueAt: due.toISOString(),
      createdAt: now.toISOString(),
      completedAt: null
    });
  });

  content.lastStudyAt = now.toISOString();
  saveContents();
  saveReviews();
}

function renderReviewCalendar() {
  const title = document.querySelector('#reviewCalendarTitle');
  const grid = document.querySelector('#reviewCalendarGrid');
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

  title.textContent = new Date(year, month, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const studyDates = new Set(
    contents
      .filter((item) => !!item.lastStudyAt)
      .map((item) => new Date(item.lastStudyAt).toISOString().slice(0, 10))
  );

  const reviewDates = new Set(
    reviews
      .filter((item) => !item.completedAt)
      .map((item) => new Date(item.dueAt).toISOString().slice(0, 10))
  );

  const todayKey = new Date().toISOString().slice(0, 10);
  const cells = [];

  for (let i = 0; i < startWeekday; i += 1) {
    cells.push('<span class="calendar-day empty-day"></span>');
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const key = date.toISOString().slice(0, 10);
    const classNames = ['calendar-day'];
    if (key === todayKey) classNames.push('today');
    if (studyDates.has(key)) classNames.push('study-day');
    if (reviewDates.has(key)) classNames.push('review-day');
    cells.push(`<span class="${classNames.join(' ')}">${day}</span>`);
  }

  grid.innerHTML = cells.join('');
}

function formatDateOnly(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function renderTimetable() {
  const timetable = document.querySelector('#timetable');
  const scheduledEntries = disciplines.flatMap((discipline) => discipline.schedules.map((schedule) => ({ discipline, schedule })));

  if (!scheduledEntries.length) {
    timetable.innerHTML = '<h2>Grade horária</h2><p class="timetable-empty">Cadastre o dia e o horário das disciplinas de escola ou faculdade para montar sua grade.</p>';
    return;
  }

  timetable.innerHTML = `
    <h2>Grade horária</h2>
    <p>Seus encontros semanais por dia e horário.</p>
    <div class="timetable-grid">
      ${weekdayLabels.map((day, weekday) => {
        const dayEntries = scheduledEntries
          .filter((entry) => entry.schedule.weekday === weekday)
          .sort((first, second) => first.schedule.startTime.localeCompare(second.schedule.startTime));
        return `<div class="timetable-day"><strong>${day}</strong>${dayEntries.length
          ? dayEntries.map(({ discipline, schedule }) => `<div class="timetable-class"><strong>${discipline.name}</strong><span>${schedule.startTime} - ${schedule.endTime}</span></div>`).join('')
          : '<span class="timetable-empty">Livre</span>'}</div>`;
      }).join('')}
    </div>
  `;
}

function renderHierarchy() {
  const board = document.querySelector('#subjectsGrid');
  if (!objectiveFolders.length) {
    board.innerHTML = '<div class="study-empty">Selecione objetivos para criar suas pastas.</div>';
    return;
  }

  const visible = contents.filter(visibleContent);

  board.innerHTML = objectiveFolders.map((folder) => {
    const folderDisciplines = disciplines.filter((item) => item.objectiveKey === folder.key);

    const disciplineBlocks = folderDisciplines.map((discipline) => {
      const disciplineContents = visible.filter((item) => item.disciplineId === discipline.id);
      const hasAbsences = objectiveHasAbsences(discipline.objectiveKey);
      const disciplinePresence = hasAbsences && discipline.absenceLimit
        ? Math.max(0, 100 - (discipline.absences / discipline.absenceLimit) * 100)
        : null;
      const assessmentSummary = discipline.assessments.length
        ? discipline.assessments.map((assessment) => `${assessment.name}: ${formatDateOnly(assessment.date)}`).join(' • ')
        : 'Nenhuma avaliação cadastrada';
      const absenceSummary = discipline.absenceDates.length
        ? discipline.absenceDates.map(formatDateOnly).join(' • ')
        : 'Nenhuma falta com data registrada';
      const scheduleSummary = discipline.schedules.length
        ? discipline.schedules.map((schedule) => `${weekdayLabels[schedule.weekday]} ${schedule.startTime}-${schedule.endTime}`).join(' • ')
        : '';

      const cards = disciplineContents.map((content) => {
        const attention = (hasAbsences && discipline.absenceLimit && discipline.absences >= discipline.absenceLimit * 0.7)
          || reviews.some((item) => item.contentId === content.id && !item.completedAt && new Date(item.dueAt).getTime() < Date.now());
        const pendingReviews = reviews.filter((item) => item.contentId === content.id && !item.completedAt).length;
        const reviewProgress = content.reviewEnabled
          ? Math.max(5, Math.min(100, (pendingReviews / Math.max(content.reviewOffsets.length || 1, 1)) * 100))
          : 8;
        const reviewPlanText = content.reviewEnabled
          ? (content.reviewOffsets.length ? content.reviewOffsets.join(', ') : '1, 7, 30')
          : '-';

        return `
          <article class="subject-card ${attention ? 'needs-attention' : ''}" data-id="${content.id}">
            <div class="subject-top">
              <span class="subject-symbol">▧</span>
              <div>
                <h3>${content.name}</h3>
                <p>Conteúdo da disciplina</p>
              </div>
              <button class="delete-content" data-id="${content.id}" aria-label="Excluir ${content.name}">×</button>
            </div>

            <div class="subject-metrics">
              <div><span>Plano</span><strong>${content.reviewEnabled ? (content.reviewPlanMode === 'custom' ? 'Custom' : 'Padrão') : 'Sem revisão'}</strong></div>
              <div><span>Nivel</span><strong>${levelLabels[content.level]}</strong></div>
              <div><span>Revisoes</span><strong>${pendingReviews}</strong></div>
            </div>

            <div class="subject-progress"><i style="width:${reviewProgress}%"></i></div>

            <div class="subject-details">
              <p><strong>Nivel:</strong> <span class="level-badge ${content.level}">${levelLabels[content.level]}</span></p>
              <p><strong>Revisao:</strong> ${content.reviewEnabled ? `${content.reviewMinutes} min` : 'Nao revisar'}</p>
              <p><strong>Dias:</strong> ${reviewPlanText}</p>
              <p><strong>Revisoes pendentes:</strong> ${pendingReviews}</p>
              <p><strong>Ultimo estudo:</strong> ${content.lastStudyAt ? formatDate(content.lastStudyAt) : 'Ainda nao estudado'}</p>
            </div>

            <div class="subject-actions">
              <button class="study-action ${content.reviewEnabled ? '' : 'disabled'}" ${content.reviewEnabled ? '' : 'disabled'} data-id="${content.id}">✓ Estudei hoje</button>
              <span>${attention ? 'Atencao necessaria' : 'Tudo em dia'}</span>
            </div>
          </article>
        `;
      }).join('');

      return `
        <section class="discipline-group" data-id="${discipline.id}">
          <header class="discipline-header">
            <div>
              <h2>${discipline.name}</h2>
              <p>${discipline.description || 'Sem descricao'}</p>
            </div>
            <div class="discipline-meta">
              <div class="discipline-summary"><span>${disciplineContents.length} conteudo(s)</span>${hasAbsences ? `<span>Faltas: ${discipline.absences}/${discipline.absenceLimit} (${Math.round(disciplinePresence)}%)</span>` : ''}${scheduleSummary ? `<span>${scheduleSummary}</span>` : ''}</div>
              <details class="discipline-actions"><summary title="Ações da disciplina" aria-label="Ações da disciplina">⋯</summary><div class="discipline-action-menu">
                <button class="edit-discipline" data-id="${discipline.id}">Editar</button>
                ${hasAbsences ? `<button class="absence-discipline-action" data-id="${discipline.id}">Registrar falta</button>` : ''}
                ${hasAbsences ? `<button class="absence-discipline-action remove-absence" data-id="${discipline.id}" ${discipline.absenceDates.length === 0 ? 'disabled' : ''}>Remover falta</button>` : ''}
                <button class="assessment-action" data-id="${discipline.id}">Avaliação</button>
                <button class="add-content-inline" data-objective="${folder.key}" data-discipline="${discipline.id}">Conteúdo</button>
                <button class="delete-discipline" data-id="${discipline.id}">Excluir</button>
              </div></details>
            </div>
          </header>
          <p class="discipline-assessments"><strong>Avaliações:</strong> ${assessmentSummary}</p>
          ${hasAbsences ? `<p class="discipline-absence-history"><strong>Datas das faltas:</strong> ${absenceSummary}</p>` : ''}
          <div class="subjects-grid">${cards || '<div class="study-empty">Nenhum conteudo neste filtro para esta disciplina.</div>'}</div>
        </section>
      `;
    }).join('');

    return `
      <section class="objective-group" data-key="${folder.key}">
        <header class="objective-header">
          <div>
            <p class="modal-kicker">Objetivo</p>
            <h2>${folder.name}</h2>
          </div>
          <button class="new-subject secondary add-discipline-inline" data-objective="${folder.key}">＋ Disciplina</button>
        </header>
        ${disciplineBlocks || '<div class="study-empty">Sem disciplinas neste objetivo.</div>'}
      </section>
    `;
  }).join('');

  board.querySelectorAll('.add-discipline-inline').forEach((button) => {
    button.addEventListener('click', () => {
      editingDisciplineId = null;
      document.querySelector('#disciplineForm').reset();
      syncDisciplineObjectiveOptions(button.dataset.objective);
      document.querySelector('#disciplineObjective').disabled = false;
      syncDisciplineAbsenceField();
      document.querySelector('#disciplineModalTitle').textContent = 'Adicionar disciplina';
      document.querySelector('#saveDiscipline').textContent = 'Adicionar disciplina';
      document.querySelector('#disciplineModal').classList.add('open');
      document.querySelector('#disciplineName').focus();
    });
  });

  board.querySelectorAll('.edit-discipline').forEach((button) => {
    button.addEventListener('click', () => {
      const discipline = disciplines.find((item) => item.id === button.dataset.id);
      if (!discipline) return;
      editingDisciplineId = discipline.id;
      syncDisciplineObjectiveOptions(discipline.objectiveKey);
      document.querySelector('#disciplineObjective').value = discipline.objectiveKey;
      document.querySelector('#disciplineObjective').disabled = true;
      document.querySelector('#disciplineName').value = discipline.name;
      document.querySelector('#disciplineDescription').value = discipline.description;
      document.querySelector('#disciplineAbsenceLimit').value = discipline.absenceLimit || 10;
      syncDisciplineAbsenceField();
      renderScheduleEntries(discipline.schedules);
      document.querySelector('#disciplineModalTitle').textContent = 'Editar disciplina';
      document.querySelector('#saveDiscipline').textContent = 'Salvar alterações';
      document.querySelector('#disciplineModal').classList.add('open');
      document.querySelector('#disciplineName').focus();
    });
  });

  board.querySelectorAll('.add-content-inline').forEach((button) => {
    button.addEventListener('click', () => {
      syncSubjectObjectiveOptions(button.dataset.objective);
      syncSubjectDisciplineOptions(button.dataset.discipline);
      syncReviewTimeField();
      document.querySelector('#subjectModal').classList.add('open');
      document.querySelector('#subjectName').focus();
    });
  });

  board.querySelectorAll('.delete-discipline').forEach((button) => {
    button.addEventListener('click', () => {
      const disciplineId = button.dataset.id;
      const removedContentIds = contents.filter((item) => item.disciplineId === disciplineId).map((item) => item.id);
      disciplines = disciplines.filter((item) => item.id !== disciplineId);
      contents = contents.filter((item) => item.disciplineId !== disciplineId);
      reviews = reviews.filter((item) => !removedContentIds.includes(item.contentId));
      saveDisciplines();
      saveContents();
      saveReviews();
      renderAll();
    });
  });

  board.querySelectorAll('.delete-content').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.id;
      contents = contents.filter((item) => item.id !== id);
      reviews = reviews.filter((item) => item.contentId !== id);
      saveContents();
      saveReviews();
      renderAll();
    });
  });

  board.querySelectorAll('.absence-discipline-action').forEach((button) => {
    button.addEventListener('click', () => {
      const discipline = disciplines.find((item) => item.id === button.dataset.id);
      if (!discipline || !objectiveHasAbsences(discipline.objectiveKey)) return;
      if (!button.classList.contains('remove-absence')) {
        absenceMode = 'add';
        document.querySelector('#absenceDisciplineId').value = discipline.id;
        document.querySelector('#absenceDisciplineName').textContent = discipline.name;
        document.querySelector('#absenceDate').value = new Date().toISOString().slice(0, 10);
        document.querySelector('#absenceModalTitle').textContent = 'Registrar falta';
        document.querySelector('#absenceDateField').style.display = 'block';
        document.querySelector('#absenceRemovalField').style.display = 'none';
        document.querySelector('#absenceDate').required = true;
        document.querySelector('#saveAbsence').textContent = 'Registrar falta';
        document.querySelector('#absenceModal').classList.add('open');
        document.querySelector('#absenceDate').focus();
        return;
      }
      absenceMode = 'remove';
      document.querySelector('#absenceDisciplineId').value = discipline.id;
      document.querySelector('#absenceDisciplineName').textContent = discipline.name;
      document.querySelector('#absenceModalTitle').textContent = 'Remover falta';
      document.querySelector('#absenceDateField').style.display = 'none';
      document.querySelector('#absenceRemovalField').style.display = 'block';
      document.querySelector('#absenceDate').required = false;
      document.querySelector('#absenceRemovalDate').innerHTML = discipline.absenceDates.map((date) => `<option value="${date}">${formatDateOnly(date)}</option>`).join('');
      document.querySelector('#saveAbsence').textContent = 'Remover falta';
      document.querySelector('#absenceModal').classList.add('open');
      document.querySelector('#absenceRemovalDate').focus();
    });
  });

  board.querySelectorAll('.assessment-action').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelector('#assessmentDisciplineId').value = button.dataset.id;
      document.querySelector('#assessmentDate').value = '';
      document.querySelector('#assessmentModal').classList.add('open');
      document.querySelector('#assessmentName').focus();
    });
  });

  board.querySelectorAll('.study-action').forEach((button) => {
    button.addEventListener('click', () => {
      const content = contents.find((item) => item.id === button.dataset.id);
      if (!content || !content.reviewEnabled) return;
      scheduleReviews(content);
      renderAll();
    });
  });
}

function renderReviewList(selector, list, showCompleteButton) {
  const element = document.querySelector(selector);
  if (!list.length) {
    element.innerHTML = '<p class="review-empty">Sem itens por enquanto.</p>';
    return;
  }

  element.innerHTML = list.map((review) => `
    <div class="review-item ${review.completedAt ? 'done' : ''}">
      <div>
        <strong>${review.contentName}</strong>
        <small>${review.objectiveName} • ${review.disciplineName} • ${review.stage}a revisao • ${formatDate(review.dueAt)}</small>
        ${review.note ? `<p>${review.note}</p>` : ''}
      </div>
      ${showCompleteButton ? `<button class="complete-review" data-id="${review.id}">Concluir</button>` : ''}
    </div>
  `).join('');

  if (showCompleteButton) {
    element.querySelectorAll('.complete-review').forEach((button) => {
      button.addEventListener('click', () => {
        const review = reviews.find((item) => item.id === button.dataset.id);
        if (!review) return;
        review.completedAt = new Date().toISOString();
        saveReviews();
        renderReviewBoard();
        renderHierarchy();
      });
    });
  }
}

function renderReviewBoard() {
  const now = Date.now();
  const pending = reviews
    .filter((item) => !item.completedAt && new Date(item.dueAt).getTime() >= now)
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
  const overdue = reviews
    .filter((item) => !item.completedAt && new Date(item.dueAt).getTime() < now)
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
  const done = reviews
    .filter((item) => !!item.completedAt)
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
    .slice(0, 12);

  document.querySelector('#pendingCount').textContent = pending.length;
  document.querySelector('#overdueCount').textContent = overdue.length;
  document.querySelector('#doneCount').textContent = done.length;

  renderReviewList('#reviewPending', pending, true);
  renderReviewList('#reviewOverdue', overdue, true);
  renderReviewList('#reviewDone', done, false);
}

function formatDate(dateIso) {
  return new Date(dateIso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function renderOverview() {
  document.querySelector('#subjectCount').textContent = contents.length;

  const activeReviewPlans = contents.filter((item) => item.reviewEnabled).length;
  document.querySelector('#averageGrade').textContent = activeReviewPlans;

  const attendanceDisciplines = disciplines.filter((item) => objectiveHasAbsences(item.objectiveKey) && item.absenceLimit);
  const totalAbsences = attendanceDisciplines.reduce((sum, item) => sum + item.absences, 0);
  const totalLimit = attendanceDisciplines.reduce((sum, item) => sum + item.absenceLimit, 0);
  document.querySelector('#attendanceRate').textContent = totalLimit
    ? `${Math.round(100 - (totalAbsences / totalLimit) * 100)}%`
    : '--';

  document.querySelector('#semesterLabel').textContent = selectedObjectives.map((key) => objectiveLabels[key]).join(' + ');
}

function renderAll() {
  renderOverview();
  syncDisciplineObjectiveOptions();
  syncDisciplineAbsenceField();
  syncSubjectObjectiveOptions();
  syncSubjectDisciplineOptions();
  syncReviewTimeField();
  syncReviewPlanFields();
  renderTimetable();
  renderHierarchy();
  renderReviewBoard();
  renderReviewCalendar();
}

saveObjectiveSelection();
saveObjectiveFolders();
saveDisciplines();
saveContents();
saveReviews();
renderAll();
