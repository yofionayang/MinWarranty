
const express = require('express');
const path = require('path');
const session = require('express-session');

const {
  sessionSecret,
  isProduction
} = require('./config/env');

const authRoutes = require('./routes/auth');
const warrantyRoutes = require('./routes/warranties');

// Require a strong session secret.
if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error(
    'Set SESSION_SECRET in .env to at least 32 random characters.'
  );
}

// This starter uses a development-only session store.
if (isProduction) {
  throw new Error(
    'Configure HTTPS and a persistent session store before production.'
  );
}

const app = express();

// Hide unnecessary server information.
app.disable('x-powered-by');

// Parse incoming requests and limit JSON size.
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({
  extended: false,
  limit: '20kb'
}));

// Configure session-based authentication.
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // Local HTTP development only.
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Backend API routes.
app.use('/api/auth', authRoutes);
app.use('/api/warranties', warrantyRoutes);

// Only authenticated users can open the dashboard.
app.get('/dashboard.html', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login.html');
  }

  res.sendFile(
    path.join(__dirname, '..', 'public', 'dashboard.html')
  );
});

// Serve frontend HTML, CSS, and JavaScript.
app.use(express.static(
  path.join(__dirname, '..', 'public'),
  { index: 'index.html' }
));

// Handle unknown routes.
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Hide internal error details from users.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: 'Something went wrong.'
  });
});

module.exports = app;
