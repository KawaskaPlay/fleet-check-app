async function handleLogin() {
  const username = document.getElementById('username-field').value.trim();
  const password = document.getElementById('password-field').value;
  const lBtn = document.getElementById('login-btn');

  if (!username || !password) {
    alert('Пожалуйста, введите логин и пароль.');
    return;
  }

  lBtn.disabled = true;
  lBtn.innerText = 'ПРОВЕРКА...';

  try {
    const { token: t, name, id } = await api.login(username, password);

    token.set(t);

    document.getElementById('driver-display').innerText = name;
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('app-content').style.display = 'block';
    window.scrollTo(0, 0);

    await Promise.all([initMachine(), loadHistory()]);
  } catch (err) {
    alert(err.message);
    lBtn.disabled = false;
    lBtn.innerText = 'ВОЙТИ';
    document.getElementById('password-field').value = '';
  }
}
