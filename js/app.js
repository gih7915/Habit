const sidebar = document.querySelector('#sidebar');
const menu = document.querySelector('#menu');
const saved = document.querySelector('#saved');

menu.addEventListener('click', () => sidebar.classList.toggle('open'));
document.querySelectorAll('.nav a, .sidebar-footer a').forEach((link) => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.nav a').forEach((item) => item.classList.remove('active'));
    if (link.closest('.nav')) link.classList.add('active');
    sidebar.classList.remove('open');
  });
});

document.querySelector('#saveMood').addEventListener('click', () => {
  saved.style.display = 'inline-block';
  window.setTimeout(() => { saved.style.display = 'none'; }, 2500);
});

document.querySelectorAll('.habit-check').forEach((button) => {
  button.addEventListener('click', () => {
    button.classList.toggle('checked');
    button.textContent = button.classList.contains('checked') ? 'Concluído' : 'Marcar hábito';
  });
});

document.querySelector('#addTask').addEventListener('click', () => {
  document.querySelector('#addTask').textContent = 'Tarefa adicionada';
});

document.querySelector('#water').addEventListener('click', () => {
  document.querySelector('.water strong span').textContent = '0 / 3L';
});
