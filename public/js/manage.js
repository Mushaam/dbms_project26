(async function initManage() {
  const user = await requireSession();
  if (!user) return;

  document.getElementById('user-chip').textContent = `${user.fullName} (${user.username})`;
  document.getElementById('logout-btn').addEventListener('click', () => logout());

  const form = document.getElementById('entity-form');
  const formTitle = document.getElementById('form-title');
  const formMsg = document.getElementById('form-msg');
  const listMsg = document.getElementById('list-msg');
  const recordsTable = document.getElementById('records-table');
  const tabs = document.getElementById('entity-tabs');

  let lookups = null;
  let currentEntity = 'artifacts';
  let editingId = null;

  const entities = {
    artifacts: {
      label: 'Artifact',
      listPath: '/api/artifacts',
      idField: 'artifact_id',
      columns: [
        'artifact_id', 'title', 'period', 'material', 'current_status',
        'category_name', 'location_name', 'acquisition_date'
      ],
      fields: [
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'period', label: 'Period', type: 'text' },
        { name: 'material', label: 'Material', type: 'text' },
        { name: 'current_status', label: 'Status', type: 'select', optionsKey: 'artifactStatuses', required: true },
        { name: 'category_id', label: 'Category', type: 'select', optionsKey: 'categories', required: true },
        { name: 'location_id', label: 'Location', type: 'select', optionsKey: 'locations', required: true },
        { name: 'acquisition_date', label: 'Acquisition date', type: 'date' }
      ]
    },
    exhibitions: {
      label: 'Exhibition',
      listPath: '/api/exhibitions',
      idField: 'exhibition_id',
      columns: [
        'exhibition_id', 'title', 'start_date', 'end_date', 'curator_name', 'gallery_name'
      ],
      fields: [
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'start_date', label: 'Start date', type: 'date', required: true },
        { name: 'end_date', label: 'End date', type: 'date', required: true },
        { name: 'curator_id', label: 'Curator', type: 'select', optionsKey: 'staff', required: true },
        { name: 'gallery_id', label: 'Gallery', type: 'select', optionsKey: 'locations' }
      ]
    },
    loans: {
      label: 'Loan',
      listPath: '/api/loans',
      idField: 'loan_id',
      columns: [
        'loan_id', 'artifact_title', 'institution_name', 'loan_type',
        'start_date', 'due_date', 'return_date', 'status'
      ],
      fields: [
        { name: 'artifact_id', label: 'Artifact', type: 'select', optionsKey: 'artifacts', required: true },
        { name: 'institution_id', label: 'Institution', type: 'select', optionsKey: 'institutions', required: true },
        { name: 'loan_type', label: 'Loan type', type: 'select', optionsKey: 'loanTypes', required: true },
        { name: 'start_date', label: 'Start date', type: 'date', required: true },
        { name: 'due_date', label: 'Due date', type: 'date', required: true },
        { name: 'return_date', label: 'Return date', type: 'date' },
        { name: 'status', label: 'Status', type: 'select', optionsKey: 'loanStatuses', required: true }
      ]
    },
    conservation: {
      label: 'Conservation Record',
      listPath: '/api/conservation',
      idField: 'record_id',
      columns: [
        'record_id', 'artifact_title', 'staff_name', 'condition_before',
        'treatment_done', 'condition_after', 'start_date', 'end_date', 'cost'
      ],
      fields: [
        { name: 'artifact_id', label: 'Artifact', type: 'select', optionsKey: 'artifacts', required: true },
        { name: 'staff_id', label: 'Staff', type: 'select', optionsKey: 'staff', required: true },
        { name: 'condition_before', label: 'Condition before', type: 'text', required: true },
        { name: 'treatment_done', label: 'Treatment done', type: 'text', required: true },
        { name: 'condition_after', label: 'Condition after', type: 'text' },
        { name: 'start_date', label: 'Start date', type: 'date', required: true },
        { name: 'end_date', label: 'End date', type: 'date' },
        { name: 'cost', label: 'Cost', type: 'number' }
      ]
    },
    insurance: {
      label: 'Insurance Policy',
      listPath: '/api/insurance',
      idField: 'policy_id',
      columns: [
        'policy_id', 'artifact_title', 'insurer_name', 'policy_number',
        'insured_value', 'start_date', 'end_date'
      ],
      fields: [
        { name: 'artifact_id', label: 'Artifact', type: 'select', optionsKey: 'artifacts', required: true },
        { name: 'insurer_name', label: 'Insurer name', type: 'text', required: true },
        { name: 'policy_number', label: 'Policy number', type: 'text', required: true },
        { name: 'insured_value', label: 'Insured value', type: 'number', required: true },
        { name: 'start_date', label: 'Start date', type: 'date', required: true },
        { name: 'end_date', label: 'End date', type: 'date', required: true }
      ]
    }
  };

  try {
    lookups = await api('/api/lookups');
  } catch (err) {
    setMessage(formMsg, err.message, 'error');
    return;
  }

  function optionList(key) {
    const raw = lookups[key] || [];
    if (Array.isArray(raw) && raw.length && typeof raw[0] === 'string') {
      return raw.map((v) => ({ id: v, label: v }));
    }
    return raw;
  }

  function buildForm(values = {}) {
    const cfg = entities[currentEntity];
    form.innerHTML = '';
    cfg.fields.forEach((field) => {
      const wrap = document.createElement('div');
      const label = document.createElement('label');
      label.htmlFor = `f-${field.name}`;
      label.textContent = field.label + (field.required ? ' *' : '');
      wrap.appendChild(label);

      let input;
      if (field.type === 'select') {
        input = document.createElement('select');
        input.id = `f-${field.name}`;
        input.name = field.name;
        if (field.required) input.required = true;
        fillSelect(input, optionList(field.optionsKey), values[field.name]);
      } else {
        input = document.createElement('input');
        input.id = `f-${field.name}`;
        input.name = field.name;
        input.type = field.type || 'text';
        if (field.required) input.required = true;
        if (field.type === 'number') input.step = 'any';
        const val = values[field.name];
        input.value = val == null ? '' : formatCell(val);
      }
      wrap.appendChild(input);
      form.appendChild(wrap);
    });
  }

  function resetForm() {
    editingId = null;
    formTitle.textContent = `Add ${entities[currentEntity].label}`;
    setMessage(formMsg, '');
    buildForm({});
  }

  function collectForm() {
    const cfg = entities[currentEntity];
    const data = {};
    cfg.fields.forEach((field) => {
      const el = form.elements[field.name];
      let value = el ? el.value : '';
      if (value === '') value = null;
      else if (field.type === 'number') value = Number(value);
      else if (field.type === 'select' && field.optionsKey !== 'artifactStatuses'
        && field.optionsKey !== 'loanTypes' && field.optionsKey !== 'loanStatuses') {
        value = Number(value);
      }
      data[field.name] = value;
    });
    return data;
  }

  async function loadRecords() {
    setMessage(listMsg, 'Loading…');
    recordsTable.innerHTML = '';
    try {
      const rows = await api(entities[currentEntity].listPath);
      setMessage(listMsg, `${rows.length} record(s)`, 'ok');
      renderRecords(rows);
    } catch (err) {
      setMessage(listMsg, err.message, 'error');
    }
  }

  function renderRecords(rows) {
    const cfg = entities[currentEntity];
    if (!rows.length) {
      recordsTable.innerHTML = '<p class="muted">No records.</p>';
      return;
    }

    let html = '<div class="table-wrap"><table><thead><tr>';
    cfg.columns.forEach((c) => {
      html += `<th>${escapeHtml(c)}</th>`;
    });
    html += '<th>Actions</th></tr></thead><tbody>';

    rows.forEach((row) => {
      html += '<tr>';
      cfg.columns.forEach((c) => {
        html += `<td>${escapeHtml(formatCell(row[c]))}</td>`;
      });
      const id = row[cfg.idField];
      html += `<td class="actions">
        <button type="button" class="secondary" data-edit="${id}">Edit</button>
        <button type="button" class="danger" data-del="${id}">Delete</button>
      </td>`;
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    recordsTable.innerHTML = html;
  }

  recordsTable.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('button[data-edit]');
    const delBtn = e.target.closest('button[data-del]');
    const cfg = entities[currentEntity];

    if (editBtn) {
      const id = Number(editBtn.getAttribute('data-edit'));
      try {
        const rows = await api(cfg.listPath);
        const row = rows.find((r) => Number(r[cfg.idField]) === id);
        if (!row) throw new Error('Record not found');
        editingId = id;
        formTitle.textContent = `Edit ${cfg.label} #${id}`;
        buildForm(row);
        setMessage(formMsg, `Editing ${cfg.label} #${id}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        setMessage(formMsg, err.message, 'error');
      }
      return;
    }

    if (delBtn) {
      const id = Number(delBtn.getAttribute('data-del'));
      if (!confirm(`Delete ${cfg.label} #${id}?`)) return;
      try {
        await api(`${cfg.listPath}/${id}`, { method: 'DELETE' });
        setMessage(listMsg, `Deleted #${id}`, 'ok');
        if (editingId === id) resetForm();
        lookups = await api('/api/lookups');
        await loadRecords();
      } catch (err) {
        setMessage(listMsg, err.message, 'error');
      }
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cfg = entities[currentEntity];
    const payload = collectForm();
    setMessage(formMsg, 'Saving…');

    try {
      if (editingId == null) {
        await api(cfg.listPath, { method: 'POST', body: payload });
        setMessage(formMsg, 'Created', 'ok');
      } else {
        await api(`${cfg.listPath}/${editingId}`, { method: 'PUT', body: payload });
        setMessage(formMsg, 'Updated', 'ok');
      }
      lookups = await api('/api/lookups');
      resetForm();
      await loadRecords();
    } catch (err) {
      setMessage(formMsg, err.message, 'error');
    }
  });

  document.getElementById('reset-btn').addEventListener('click', resetForm);

  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-entity]');
    if (!btn) return;
    tabs.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentEntity = btn.getAttribute('data-entity');
    resetForm();
    loadRecords();
  });

  resetForm();
  await loadRecords();
})();
