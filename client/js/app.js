let currentMachineId = null;

async function initMachine() {
  const params = new URLSearchParams(window.location.search);
  const mId = params.get('machine');

  if (!mId) {
    document.getElementById('machine-title').innerText = 'Ошибка QR-кода';
    document.getElementById('machine-info').innerText = 'Отсутствует ID техники в ссылке';
    return;
  }

  try {
    const machine = await api.getMachine(mId);
    currentMachineId = machine.id;
    document.getElementById('machine-title').innerText = machine.name;
    document.getElementById('machine-info').innerText = `Госномер: ${machine.plate_number || '---'}`;
  } catch {
    document.getElementById('machine-title').innerText = 'Техника не найдена';
    document.getElementById('machine-info').innerText = 'Ошибка загрузки данных';
  }
}

function togglePhoto(id, show) {
  const el = document.getElementById(id);
  if (el) el.style.display = show ? 'block' : 'none';
}

async function handleSubmit() {
  const form = document.getElementById('inspection-form');
  const checked = form.querySelectorAll('input[type="radio"]:checked');

  if (checked.length < 6) {
    alert('Пожалуйста, ответьте на все 6 пунктов осмотра!');
    return;
  }

  const sBtn = document.getElementById('submit-btn');
  sBtn.disabled = true;
  sBtn.innerText = 'СОХРАНЕНИЕ В БАЗУ...';

  const resultsObj = {};
  checked.forEach(input => { resultsObj[input.name] = input.value; });

  try {
    await api.submitReport({ machine_id: currentMachineId, data: resultsObj, photos: [] });
    alert('Отчет успешно отправлен! Спасибо за работу.');
    location.reload();
  } catch (err) {
    alert('Ошибка при отправке: ' + err.message);
    sBtn.disabled = false;
    sBtn.innerText = 'ОТПРАВИТЬ ОТЧЕТ';
  }
}
