const express = require('express');
const { query } = require('../db');
const { requireAuth } = require('../middleware');

const router = express.Router();

function dbErrorMessage(err, fallback) {
  if (err.code && String(err.code).startsWith('ER_')) {
    return `Database error (${err.code}). Check .env DB settings and that MySQL is running.`;
  }
  return fallback;
}

function startSession(req, user) {
  req.session.user = {
    userId: user.user_id,
    username: user.username,
    fullName: user.full_name,
    role: user.role
  };
  return req.session.user;
}

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const rows = await query(
      'SELECT user_id, username, full_name, role FROM APP_USER WHERE username = ? AND password = ?',
      [username, password]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    return res.json({ user: startSession(req, rows[0]) });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: dbErrorMessage(err, 'Login failed') });
  }
});

router.post('/signup', async (req, res) => {
  try {
    const { username, password, full_name } = req.body || {};
    if (!username || !password || !full_name) {
      return res.status(400).json({ error: 'Full name, username, and password are required' });
    }
    if (String(username).length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await query('SELECT user_id FROM APP_USER WHERE username = ?', [username]);
    if (existing.length) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    await query(
      'INSERT INTO STAFF (name, role, email) VALUES (?, ?, ?)',
      [full_name, 'Staff', `${username}@museum.edu`]
    );

    const result = await query(
      'INSERT INTO APP_USER (username, password, full_name, role) VALUES (?, ?, ?, ?)',
      [username, password, full_name, 'staff']
    );

    const user = {
      user_id: result.insertId,
      username,
      full_name,
      role: 'staff'
    };

    return res.status(201).json({ user: startSession(req, user) });
  } catch (err) {
    console.error('Signup error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    return res.status(500).json({ error: dbErrorMessage(err, 'Signup failed') });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    return res.json({ ok: true });
  });
});

router.get('/me', requireAuth, (req, res) => {
  return res.json({ user: req.session.user });
});

module.exports = router;
