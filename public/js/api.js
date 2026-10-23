async function api(path, options = {}) {
  const opts = {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  };

  if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)) {
    opts.body = JSON.stringify(opts.body);
  }

  const res = await fetch(path, opts);
  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (res.status === 401 && !path.includes('/api/login')) {
    if (!window.location.pathname.endsWith('/login.html')) {
      window.location.href = '/login.html';
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }

  return data;
}

function formatCell(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  return String(value);
}

function renderTable(container, rows) {
  if (!container) return;
  if (!rows || !rows.length) {
    container.innerHTML = '<p class="muted">No rows returned.</p>';
    return;
  }

  const cols = Object.keys(rows[0]);
  let html = '<div class="table-wrap"><table><thead><tr>';
  cols.forEach((c) => {
    html += `<th>${escapeHtml(c)}</th>`;
  });
  html += '</tr></thead><tbody>';
  rows.forEach((row) => {
    html += '<tr>';
    cols.forEach((c) => {
      html += `<td>${escapeHtml(formatCell(row[c]))}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fillSelect(selectEl, items, selectedId) {
  if (!selectEl) return;
  const current = selectedId === undefined || selectedId === null ? '' : String(selectedId);
  selectEl.innerHTML = '<option value="">— select —</option>';
  (items || []).forEach((item) => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = item.label;
    if (String(item.id) === current) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

function setMessage(el, text, type) {
  if (!el) return;
  el.textContent = text || '';
  el.className = 'msg' + (type ? ` ${type}` : '');
}

async function requireSession() {
  try {
    const data = await api('/api/me');
    return data.user;
  } catch {
    return null;
  }
}

async function logout() {
  await api('/api/logout', { method: 'POST', body: {} });
  window.location.href = '/login.html';
}
