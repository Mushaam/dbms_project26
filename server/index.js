const path = require('path');
const express = require('express');
const session = require('express-session');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const crudRoutes = require('./routes/crud');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const publicDir = path.join(__dirname, '..', 'public');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    name: 'connect.sid',
    secret: process.env.SESSION_SECRET || 'dev-museum-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

app.use('/api', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api', crudRoutes);

function requirePageAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.redirect('/login.html');
}

app.get('/', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/index.html');
  }
  return res.redirect('/login.html');
});

app.get('/login.html', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/index.html');
  }
  return res.sendFile(path.join(publicDir, 'login.html'));
});

app.get(['/index.html', '/reports.html', '/manage.html'], requirePageAuth, (req, res) => {
  return res.sendFile(path.join(publicDir, path.basename(req.path)));
});

app.use(express.static(publicDir));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  return res.status(404).send('Not found');
});

app.listen(PORT, () => {
  console.log(`Museum app listening on http://localhost:${PORT}`);
});
