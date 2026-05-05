async function loadHistory() {
  const container = document.getElementById('history-list');

  try {
    const reports = await api.getMyHistory(10);

    if (reports.length === 0) {
      container.innerHTML = '<p style="color:#64748b">История пуста</p>';
      return;
    }

    container.innerHTML = reports.map(report => {
      const date = new Date(report.created_at).toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });

      const issuesCount = Object.values(report.data).filter(v => v === 'bad').length;
      const color = issuesCount > 0 ? 'var(--danger)' : 'var(--success)';
      const statusText = issuesCount > 0
        ? `Найдено проблем: ${issuesCount}`
        : 'Замечаний нет';

      return `
        <div class="history-item" style="border-left: 4px solid ${color}">
          <div class="history-item-header">
            <strong>${report.machines?.name || 'Техника'}</strong>
            <span style="color:#64748b">${date}</span>
          </div>
          <div class="history-item-status" style="color:${color}">${statusText}</div>
        </div>
      `;
    }).join('');
  } catch {
    container.innerHTML = '<p style="color:var(--danger)">Ошибка загрузки истории</p>';
  }
}
