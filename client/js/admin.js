const API = '/api/admin';

const FIELD_LABELS = {
  wheels:     'Шины / колёса',
  drivetrain: 'Ходовая и трансмиссия',
  tracks:     'Гусеницы',
  body:       'Кузов',
  glass:      'Стёкла, зеркала, освещение',
  fire:       'Огнетушитель',
  oil:        'Масла',
  coolant:    'Антифриз / Радиатор',
  separator:  'Топливный сепаратор',
  engine:     'Двигатель и ремни',
  battery:    'Аккумулятор',
  grease:     'Смазка',
  emergency:  'Кнопки аварийной остановки',
};

// ── УТИЛИТЫ ────────────────────────────────────────────────────────────────────

function getToken() { return localStorage.getItem('adminToken'); }

async function api(path, options = {}) {
  const t = getToken();
  const res = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка');
  return data;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── ЛОГИН ──────────────────────────────────────────────────────────────────────

async function handleLogin() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const btn = document.getElementById('login-btn');

  btn.disabled = true;
  btn.textContent = 'Вход...';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    if (data.role !== 'admin') throw new Error('Нет прав администратора');

    localStorage.setItem('adminToken', data.token);
    document.getElementById('topbar-name').textContent = data.name;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'block';
    showTab('machines');
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Войти';
  }
}

function handleLogout() {
  localStorage.removeItem('adminToken');
  location.reload();
}

// ── ТАБЫ ───────────────────────────────────────────────────────────────────────

function showTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${name}`));
  if (name === 'machines') loadMachines();
  if (name === 'drivers')  loadDrivers();
  if (name === 'reports')  loadReports();
}

// ── МАШИНЫ ─────────────────────────────────────────────────────────────────────

let editingMachineId = null;

async function loadMachines() {
  const tbody = document.getElementById('machines-tbody');
  tbody.innerHTML = '<tr><td colspan="3" style="padding:16px;color:#94a3b8">Загрузка...</td></tr>';
  try {
    const machines = await api('/machines');
    tbody.innerHTML = machines.map(m => `
      <tr id="mrow-${m.id}">
        <td>${m.id}</td>
        <td class="mname-${m.id}">${m.name}</td>
        <td class="mplate-${m.id}">${m.plate_number || '—'}</td>
        <td>
          <div class="inline-actions">
            <button class="btn btn-ghost" onclick="startEditMachine(${m.id}, '${m.name}', '${m.plate_number || ''}')">✏️</button>
            <button class="btn btn-danger" onclick="deleteMachine(${m.id})">✕</button>
          </div>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="4" style="padding:16px;color:#94a3b8">Нет машин</td></tr>';
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" style="color:red;padding:16px">${err.message}</td></tr>`;
  }
}

function startEditMachine(id, name, plate) {
  editingMachineId = id;
  const row = document.getElementById(`mrow-${id}`);
  row.querySelector(`.mname-${id}`).innerHTML = `<input class="edit-input" id="edit-mname" value="${name}">`;
  row.querySelector(`.mplate-${id}`).innerHTML = `<input class="edit-input" id="edit-mplate" value="${plate}">`;
  row.querySelector('.inline-actions').innerHTML = `
    <button class="btn btn-success" onclick="saveEditMachine(${id})">✓</button>
    <button class="btn btn-ghost" onclick="loadMachines()">✕</button>
  `;
}

async function saveEditMachine(id) {
  const name  = document.getElementById('edit-mname').value.trim();
  const plate = document.getElementById('edit-mplate').value.trim();
  try {
    await api(`/machines/${id}`, { method: 'PUT', body: JSON.stringify({ name, plate_number: plate }) });
    loadMachines();
  } catch (err) { alert(err.message); }
}

async function addMachine() {
  const name  = document.getElementById('new-mname').value.trim();
  const plate = document.getElementById('new-mplate').value.trim();
  if (!name) return alert('Введите название машины');
  try {
    await api('/machines', { method: 'POST', body: JSON.stringify({ name, plate_number: plate }) });
    document.getElementById('new-mname').value = '';
    document.getElementById('new-mplate').value = '';
    loadMachines();
  } catch (err) { alert(err.message); }
}

async function deleteMachine(id) {
  if (!confirm('Удалить машину? Все её отчёты тоже будут удалены безвозвратно.')) return;
  try {
    await api(`/machines/${id}`, { method: 'DELETE' });
    loadMachines();
  } catch (err) { alert(err.message); }
}

// ── ВОДИТЕЛИ ───────────────────────────────────────────────────────────────────

async function loadDrivers() {
  const tbody = document.getElementById('drivers-tbody');
  tbody.innerHTML = '<tr><td colspan="5" style="padding:16px;color:#94a3b8">Загрузка...</td></tr>';
  try {
    const drivers = await api('/drivers');
    tbody.innerHTML = drivers.map(d => `
      <tr>
        <td>${d.id}</td>
        <td>${d.name}</td>
        <td>${d.username}</td>
        <td><span class="badge badge-${d.role}">${d.role}</span></td>
        <td>
          <div class="inline-actions">
            <button class="btn btn-danger" onclick="deleteDriver(${d.id}, '${d.name}')">✕</button>
          </div>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="5" style="padding:16px;color:#94a3b8">Нет водителей</td></tr>';
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:red;padding:16px">${err.message}</td></tr>`;
  }
}

async function addDriver() {
  const name     = document.getElementById('new-dname').value.trim();
  const username = document.getElementById('new-dlogin').value.trim();
  const password = document.getElementById('new-dpass').value;
  const role     = document.getElementById('new-drole').value;

  if (!name || !username || !password) return alert('Заполните все поля');
  try {
    await api('/drivers', { method: 'POST', body: JSON.stringify({ name, username, password, role }) });
    ['new-dname','new-dlogin','new-dpass'].forEach(id => document.getElementById(id).value = '');
    loadDrivers();
  } catch (err) { alert(err.message); }
}

async function deleteDriver(id, name) {
  if (!confirm(`Удалить водителя "${name}"?`)) return;
  try {
    await api(`/drivers/${id}`, { method: 'DELETE' });
    loadDrivers();
  } catch (err) { alert(err.message); }
}

// ── ИСТОРИЯ ОТЧЁТОВ ────────────────────────────────────────────────────────────

async function loadReports() {
  const container = document.getElementById('reports-list');
  const machineId = document.getElementById('filter-machine').value;

  container.innerHTML = '<p style="padding:20px;color:#94a3b8">Загрузка...</p>';
  try {
    // Заполняем фильтр машин при первой загрузке
    const filterEl = document.getElementById('filter-machine');
    if (filterEl.options.length <= 1) {
      const machines = await fetch('/api/admin/machines', {
        headers: { Authorization: `Bearer ${getToken()}` }
      }).then(r => r.json());
      machines.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id; opt.textContent = m.name;
        filterEl.appendChild(opt);
      });
    }

    const qs = machineId ? `?machine_id=${machineId}` : '';
    const reports = await api(`/reports${qs}`);

    if (!reports.length) {
      container.innerHTML = '<p style="padding:20px;color:#94a3b8">Отчётов нет</p>';
      return;
    }

    container.innerHTML = reports.map(r => {
      const results = r.results || {};
      const issues = Object.entries(results).filter(([,v]) => v === 'bad');
      const ok     = Object.entries(results).filter(([,v]) => v === 'ok');
      const color  = issues.length ? '#dc2626' : '#16a34a';

      const chips = Object.entries(results).map(([k, v]) =>
        `<span class="result-chip ${v}">${FIELD_LABELS[k] || k}</span>`
      ).join('');

      let photosArr = [];
      try { photosArr = Array.isArray(r.photos) ? r.photos : JSON.parse(r.photos || '[]'); } catch {}
      const photos = photosArr.map(f =>
        `<img class="photo-thumb" src="/photos/${f}" onclick="openPhoto('/photos/${f}')" title="${f}">`
      ).join('');

      return `
        <div class="report-card" style="border-left: 4px solid ${color}">
          <div class="report-meta">
            <strong>${r.machines?.name || '—'}</strong>
            <span>👤 ${r.drivers?.name || '—'}</span>
            <span>🕐 ${fmtDate(r.created_at)}</span>
            ${issues.length ? `<span class="badge badge-bad">⚠ Проблем: ${issues.length}</span>` : '<span class="badge badge-ok">✓ Всё ОК</span>'}
          </div>
          <div class="results-grid">${chips}</div>
          ${photos ? `<div class="photos-row">${photos}</div>` : ''}
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<p style="padding:20px;color:red">${err.message}</p>`;
  }
}

// ── ЛАЙТБОКС ───────────────────────────────────────────────────────────────────

function openPhoto(src) {
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox').classList.add('open');
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
}

// ── ИНИЦИАЛИЗАЦИЯ ──────────────────────────────────────────────────────────────

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });
