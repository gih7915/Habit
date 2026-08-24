const authKey = 'habit-account';
const sessionKey = 'habit-session';
const currentPage = window.location.pathname.split('/').pop() || 'index.html';

if (!['login.html', 'cadastro.html'].includes(currentPage) && !localStorage.getItem(sessionKey)) {
  window.location.href = 'login.html';
}
if (['login.html', 'cadastro.html'].includes(currentPage) && localStorage.getItem(sessionKey)) {
  window.location.href = 'index.html';
}

const account = JSON.parse(localStorage.getItem(authKey) || 'null');
const loginForm = document.querySelector('#loginForm');
const signupForm = document.querySelector('#signupForm');

loginForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const email = document.querySelector('#loginEmail').value.trim().toLowerCase();
  const password = document.querySelector('#loginPassword').value;
  const feedback = document.querySelector('#loginFeedback');
  if (!account || account.email !== email || account.password !== password) {
    feedback.textContent = 'E-mail ou senha incorretos.';
    feedback.classList.add('error');
    return;
  }
  localStorage.setItem(sessionKey, JSON.stringify({ email, name: account.name }));
  window.location.href = 'index.html';
});

signupForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const newAccount = {
    name: document.querySelector('#signupName').value.trim(),
    email: document.querySelector('#signupEmail').value.trim().toLowerCase(),
    password: document.querySelector('#signupPassword').value
  };
  localStorage.setItem(authKey, JSON.stringify(newAccount));
  localStorage.setItem(sessionKey, JSON.stringify({ email: newAccount.email, name: newAccount.name }));
  window.location.href = 'index.html';
});
