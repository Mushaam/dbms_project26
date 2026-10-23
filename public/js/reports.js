(async function initReports() {
  const user = await requireSession();
  if (!user) return;

  document.getElementById('user-chip').textContent = `${user.fullName} (${user.username})`;
  document.getElementById('logout-btn').addEventListener('click', () => logout());

  const listEl = document.getElementById('query-list');
  const resultTitle = document.getElementById('result-title');
  const resultMsg = document.getElementById('result-msg');
  const resultTable = document.getElementById('result-table');

  let queries = [];
  try {
    queries = await api('/api/reports/list');
  } catch (err) {
    setMessage(resultMsg, err.message, 'error');
    return;
  }

  listEl.innerHTML = '';
  queries.forEach((q) => {
    const card = document.createElement('div');
    card.className = 'query-card';
    card.innerHTML = `
      <div class="qid">${escapeHtml(q.id)}</div>
      <h3>${escapeHtml(q.title)}</h3>
      ${q.needsParam
        ? `<label for="param-${q.id}">Threshold</label>
           <input id="param-${q.id}" type="number" value="100000" step="1" />`
        : ''}
      <button type="button" data-id="${escapeHtml(q.id)}">Run Query</button>
    `;
    listEl.appendChild(card);
  });

  listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;

    const id = btn.getAttribute('data-id');
    const body = {};
    if (id === 'Q16') {
      const input = document.getElementById(`param-${id}`);
      body.threshold = input ? Number(input.value) : 100000;
    }

    setMessage(resultMsg, `Running ${id}…`);
    resultTable.innerHTML = '';
    btn.disabled = true;

    try {
      const data = await api(`/api/reports/${id}/run`, { method: 'POST', body });
      resultTitle.textContent = `Results — ${data.id}: ${data.title}`;
      setMessage(resultMsg, `${(data.rows || []).length} row(s)`, 'ok');
      renderTable(resultTable, data.rows);
    } catch (err) {
      setMessage(resultMsg, err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });
})();
