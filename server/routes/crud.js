const express = require('express');
const { query } = require('../db');
const { requireAuth } = require('../middleware');

const router = express.Router();
router.use(requireAuth);

// ---------------------------------------------------------------------------
// Lookup helpers for FK dropdowns
// ---------------------------------------------------------------------------

router.get('/lookups', async (_req, res) => {
  try {
    const [categories, locations, staff, institutions, artifacts, exhibitions] = await Promise.all([
      query('SELECT category_id AS id, category_name AS label FROM CATEGORY ORDER BY category_name'),
      query('SELECT location_id AS id, location_name AS label FROM LOCATION ORDER BY location_name'),
      query('SELECT staff_id AS id, CONCAT(name, \' (\', role, \')\') AS label FROM STAFF ORDER BY name'),
      query('SELECT institution_id AS id, name AS label FROM INSTITUTION ORDER BY name'),
      query('SELECT artifact_id AS id, title AS label FROM ARTIFACT ORDER BY title'),
      query('SELECT exhibition_id AS id, title AS label FROM EXHIBITION ORDER BY title')
    ]);

    res.json({
      categories,
      locations,
      staff,
      institutions,
      artifacts,
      exhibitions,
      artifactStatuses: ['In Storage', 'On Display', 'On Loan', 'Under Conservation', 'Retired'],
      loanTypes: ['Outgoing', 'Incoming'],
      loanStatuses: ['Active', 'Returned', 'Overdue', 'Cancelled']
    });
  } catch (err) {
    console.error('Lookups error:', err);
    res.status(500).json({ error: 'Failed to load lookups' });
  }
});

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ---------------------------------------------------------------------------
// ARTIFACT
// ---------------------------------------------------------------------------

router.get('/artifacts', asyncHandler(async (_req, res) => {
  const rows = await query(`
    SELECT a.artifact_id, a.title, a.period, a.material, a.current_status,
           a.category_id, c.category_name, a.location_id, l.location_name,
           a.acquisition_date
    FROM ARTIFACT a
    JOIN CATEGORY c ON a.category_id = c.category_id
    JOIN LOCATION l ON a.location_id = l.location_id
    ORDER BY a.artifact_id
  `);
  res.json(rows);
}));

router.post('/artifacts', asyncHandler(async (req, res) => {
  const { title, period, material, current_status, category_id, location_id, acquisition_date } = req.body || {};
  if (!title || !category_id || !location_id) {
    return res.status(400).json({ error: 'title, category_id, and location_id are required' });
  }
  const result = await query(
    `INSERT INTO ARTIFACT (title, period, material, current_status, category_id, location_id, acquisition_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      title,
      period || null,
      material || null,
      current_status || 'In Storage',
      category_id,
      location_id,
      acquisition_date || null
    ]
  );
  res.status(201).json({ artifact_id: result.insertId });
}));

router.put('/artifacts/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { title, period, material, current_status, category_id, location_id, acquisition_date } = req.body || {};
  if (!title || !category_id || !location_id) {
    return res.status(400).json({ error: 'title, category_id, and location_id are required' });
  }
  await query(
    `UPDATE ARTIFACT
     SET title = ?, period = ?, material = ?, current_status = ?,
         category_id = ?, location_id = ?, acquisition_date = ?
     WHERE artifact_id = ?`,
    [
      title,
      period || null,
      material || null,
      current_status || 'In Storage',
      category_id,
      location_id,
      acquisition_date || null,
      id
    ]
  );
  res.json({ ok: true });
}));

router.delete('/artifacts/:id', asyncHandler(async (req, res) => {
  await query('DELETE FROM ARTIFACT WHERE artifact_id = ?', [Number(req.params.id)]);
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------------
// EXHIBITION
// ---------------------------------------------------------------------------

router.get('/exhibitions', asyncHandler(async (_req, res) => {
  const rows = await query(`
    SELECT e.exhibition_id, e.title, e.start_date, e.end_date,
           e.curator_id, s.name AS curator_name, e.gallery_id, l.location_name AS gallery_name
    FROM EXHIBITION e
    JOIN STAFF s ON e.curator_id = s.staff_id
    LEFT JOIN LOCATION l ON e.gallery_id = l.location_id
    ORDER BY e.exhibition_id
  `);
  res.json(rows);
}));

router.post('/exhibitions', asyncHandler(async (req, res) => {
  const { title, start_date, end_date, curator_id, gallery_id } = req.body || {};
  if (!title || !start_date || !end_date || !curator_id) {
    return res.status(400).json({ error: 'title, start_date, end_date, and curator_id are required' });
  }
  const result = await query(
    `INSERT INTO EXHIBITION (title, start_date, end_date, curator_id, gallery_id)
     VALUES (?, ?, ?, ?, ?)`,
    [title, start_date, end_date, curator_id, gallery_id || null]
  );
  res.status(201).json({ exhibition_id: result.insertId });
}));

router.put('/exhibitions/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { title, start_date, end_date, curator_id, gallery_id } = req.body || {};
  if (!title || !start_date || !end_date || !curator_id) {
    return res.status(400).json({ error: 'title, start_date, end_date, and curator_id are required' });
  }
  await query(
    `UPDATE EXHIBITION
     SET title = ?, start_date = ?, end_date = ?, curator_id = ?, gallery_id = ?
     WHERE exhibition_id = ?`,
    [title, start_date, end_date, curator_id, gallery_id || null, id]
  );
  res.json({ ok: true });
}));

router.delete('/exhibitions/:id', asyncHandler(async (req, res) => {
  await query('DELETE FROM EXHIBITION WHERE exhibition_id = ?', [Number(req.params.id)]);
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------------
// LOAN
// ---------------------------------------------------------------------------

router.get('/loans', asyncHandler(async (_req, res) => {
  const rows = await query(`
    SELECT lo.loan_id, lo.artifact_id, a.title AS artifact_title,
           lo.institution_id, i.name AS institution_name,
           lo.loan_type, lo.start_date, lo.due_date, lo.return_date, lo.status
    FROM LOAN lo
    JOIN ARTIFACT a ON lo.artifact_id = a.artifact_id
    JOIN INSTITUTION i ON lo.institution_id = i.institution_id
    ORDER BY lo.loan_id
  `);
  res.json(rows);
}));

router.post('/loans', asyncHandler(async (req, res) => {
  const { artifact_id, institution_id, loan_type, start_date, due_date, return_date, status } = req.body || {};
  if (!artifact_id || !institution_id || !loan_type || !start_date || !due_date) {
    return res.status(400).json({ error: 'artifact_id, institution_id, loan_type, start_date, and due_date are required' });
  }
  const result = await query(
    `INSERT INTO LOAN (artifact_id, institution_id, loan_type, start_date, due_date, return_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      artifact_id,
      institution_id,
      loan_type,
      start_date,
      due_date,
      return_date || null,
      status || 'Active'
    ]
  );
  res.status(201).json({ loan_id: result.insertId });
}));

router.put('/loans/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { artifact_id, institution_id, loan_type, start_date, due_date, return_date, status } = req.body || {};
  if (!artifact_id || !institution_id || !loan_type || !start_date || !due_date) {
    return res.status(400).json({ error: 'artifact_id, institution_id, loan_type, start_date, and due_date are required' });
  }
  await query(
    `UPDATE LOAN
     SET artifact_id = ?, institution_id = ?, loan_type = ?, start_date = ?,
         due_date = ?, return_date = ?, status = ?
     WHERE loan_id = ?`,
    [
      artifact_id,
      institution_id,
      loan_type,
      start_date,
      due_date,
      return_date || null,
      status || 'Active',
      id
    ]
  );
  res.json({ ok: true });
}));

router.delete('/loans/:id', asyncHandler(async (req, res) => {
  await query('DELETE FROM LOAN WHERE loan_id = ?', [Number(req.params.id)]);
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------------
// CONSERVATION_RECORD
// ---------------------------------------------------------------------------

router.get('/conservation', asyncHandler(async (_req, res) => {
  const rows = await query(`
    SELECT cr.record_id, cr.artifact_id, a.title AS artifact_title,
           cr.staff_id, s.name AS staff_name,
           cr.condition_before, cr.treatment_done, cr.condition_after,
           cr.start_date, cr.end_date, cr.cost
    FROM CONSERVATION_RECORD cr
    JOIN ARTIFACT a ON cr.artifact_id = a.artifact_id
    JOIN STAFF s ON cr.staff_id = s.staff_id
    ORDER BY cr.record_id
  `);
  res.json(rows);
}));

router.post('/conservation', asyncHandler(async (req, res) => {
  const {
    artifact_id, staff_id, condition_before, treatment_done,
    condition_after, start_date, end_date, cost
  } = req.body || {};
  if (!artifact_id || !staff_id || !condition_before || !treatment_done || !start_date) {
    return res.status(400).json({
      error: 'artifact_id, staff_id, condition_before, treatment_done, and start_date are required'
    });
  }
  const result = await query(
    `INSERT INTO CONSERVATION_RECORD
       (artifact_id, staff_id, condition_before, treatment_done, condition_after, start_date, end_date, cost)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      artifact_id,
      staff_id,
      condition_before,
      treatment_done,
      condition_after || null,
      start_date,
      end_date || null,
      cost === undefined || cost === '' ? 0 : cost
    ]
  );
  res.status(201).json({ record_id: result.insertId });
}));

router.put('/conservation/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const {
    artifact_id, staff_id, condition_before, treatment_done,
    condition_after, start_date, end_date, cost
  } = req.body || {};
  if (!artifact_id || !staff_id || !condition_before || !treatment_done || !start_date) {
    return res.status(400).json({
      error: 'artifact_id, staff_id, condition_before, treatment_done, and start_date are required'
    });
  }
  await query(
    `UPDATE CONSERVATION_RECORD
     SET artifact_id = ?, staff_id = ?, condition_before = ?, treatment_done = ?,
         condition_after = ?, start_date = ?, end_date = ?, cost = ?
     WHERE record_id = ?`,
    [
      artifact_id,
      staff_id,
      condition_before,
      treatment_done,
      condition_after || null,
      start_date,
      end_date || null,
      cost === undefined || cost === '' ? 0 : cost,
      id
    ]
  );
  res.json({ ok: true });
}));

router.delete('/conservation/:id', asyncHandler(async (req, res) => {
  await query('DELETE FROM CONSERVATION_RECORD WHERE record_id = ?', [Number(req.params.id)]);
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------------
// INSURANCE_POLICY
// ---------------------------------------------------------------------------

router.get('/insurance', asyncHandler(async (_req, res) => {
  const rows = await query(`
    SELECT ip.policy_id, ip.artifact_id, a.title AS artifact_title,
           ip.insurer_name, ip.policy_number, ip.insured_value,
           ip.start_date, ip.end_date
    FROM INSURANCE_POLICY ip
    JOIN ARTIFACT a ON ip.artifact_id = a.artifact_id
    ORDER BY ip.policy_id
  `);
  res.json(rows);
}));

router.post('/insurance', asyncHandler(async (req, res) => {
  const { artifact_id, insurer_name, policy_number, insured_value, start_date, end_date } = req.body || {};
  if (!artifact_id || !insurer_name || !policy_number || insured_value === undefined || !start_date || !end_date) {
    return res.status(400).json({
      error: 'artifact_id, insurer_name, policy_number, insured_value, start_date, and end_date are required'
    });
  }
  const result = await query(
    `INSERT INTO INSURANCE_POLICY
       (artifact_id, insurer_name, policy_number, insured_value, start_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [artifact_id, insurer_name, policy_number, insured_value, start_date, end_date]
  );
  res.status(201).json({ policy_id: result.insertId });
}));

router.put('/insurance/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { artifact_id, insurer_name, policy_number, insured_value, start_date, end_date } = req.body || {};
  if (!artifact_id || !insurer_name || !policy_number || insured_value === undefined || !start_date || !end_date) {
    return res.status(400).json({
      error: 'artifact_id, insurer_name, policy_number, insured_value, start_date, and end_date are required'
    });
  }
  await query(
    `UPDATE INSURANCE_POLICY
     SET artifact_id = ?, insurer_name = ?, policy_number = ?, insured_value = ?,
         start_date = ?, end_date = ?
     WHERE policy_id = ?`,
    [artifact_id, insurer_name, policy_number, insured_value, start_date, end_date, id]
  );
  res.json({ ok: true });
}));

router.delete('/insurance/:id', asyncHandler(async (req, res) => {
  await query('DELETE FROM INSURANCE_POLICY WHERE policy_id = ?', [Number(req.params.id)]);
  res.json({ ok: true });
}));

router.use((err, _req, res, _next) => {
  console.error('CRUD error:', err);
  const msg = err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED'
    ? 'Cannot delete: record is referenced by other data'
    : err.code === 'ER_DUP_ENTRY'
      ? 'Duplicate value violates a unique constraint'
      : err.message || 'Server error';
  res.status(500).json({ error: msg });
});

module.exports = router;
