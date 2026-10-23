const express = require('express');
const queries = require('../queries');
const { query } = require('../db');
const { requireAuth } = require('../middleware');

const router = express.Router();

router.use(requireAuth);

router.get('/list', (_req, res) => {
  const list = Object.entries(queries).map(([id, meta]) => ({
    id,
    title: meta.title,
    needsParam: Boolean(meta.params && meta.params.length)
  }));
  res.json(list);
});

router.post('/:id/run', async (req, res) => {
  try {
    const id = String(req.params.id || '').toUpperCase();
    const meta = queries[id];
    if (!meta) {
      return res.status(404).json({ error: 'Unknown query' });
    }

    let params = [];
    if (id === 'Q16') {
      const threshold = req.body?.threshold;
      const value = threshold === undefined || threshold === '' ? 100000 : Number(threshold);
      if (Number.isNaN(value)) {
        return res.status(400).json({ error: 'threshold must be a number' });
      }
      params = [value];
    }

    const rows = await query(meta.sql, params);
    return res.json({ id, title: meta.title, rows });
  } catch (err) {
    console.error('Query run error:', err);
    return res.status(500).json({ error: 'Query failed', detail: err.message });
  }
});

module.exports = router;
