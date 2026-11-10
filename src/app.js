const express = require('express');
const path = require('path');
const session = require('express-session');
const { sessionSecret, isProduction } = require('./config/env');
const authRoutes = require('./routes/auth');
const warrantyRoutes = require('./routes/warranties');

if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error('Set SESSION_SECRET in .env to a random value of at least 32 characters.');
}
if (isProduction) {
  throw new Error('Configure a persistent session store and HTTPS before production deployment.');
}
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use('/api/auth', authRoutes);
app.use('/api/warranties', warrantyRoutes);
app.get('/dashboard.html', (req, res) => {
  if (!req.session.userId) return res.redirect('/login.html');
  res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
});
app.use(express.static(path.join(__dirname, '..', 'public'), { index: 'index.html' }));
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});
module.exports = app;
