/*
 * MinWarranty - Express App Setup
 *
 * Sets up sessions, connects the API routes,
 * and serves the website pages.
 */

const express = require('express');
const path = require('path');
const session = require('express-session');

const {
  sessionSecret,
  isProduction
} = require('./config/env');

const authRoutes = require('./routes/auth');
const warrantyRoutes = require('./routes/warranties');

// Stop startup if the secret used to sign session cookies is missing or too short.
if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error(
    'Set SESSION_SECRET in .env to at least 32 random characters.'
  );
}

// Stop production startup because this setup uses an in-memory session store.
if (isProduction) {
  throw new Error(
    'Configure HTTPS and a persistent session store before production.'
  );
}

const app = express();

// Remove the header that identifies Express.
app.disable('x-powered-by');

// Read JSON and regular form data into req.body, up to 20 KB each.
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({
  extended: false,
  limit: '20kb'
}));

// Set up sessions before the routes so they can use req.session.
app.use(session({
  secret: sessionSecret,
  // Skip saving again when the session hasn't changed.
  resave: false,
  // Wait until the app adds something before saving a new session.
  saveUninitialized: false,
  cookie: {
    // Keep browser JavaScript from reading the session cookie.
    httpOnly: true,
    // Limit when the browser sends the cookie from another site.
    sameSite: 'lax',
    secure: false, // Lets the cookie work over HTTP on localhost.
    // Keep the cookie for up to 24 hours.
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Add the base URL for each group of routes.
app.use('/api/auth', authRoutes);
app.use('/api/warranties', warrantyRoutes);

// Check the session before serving the dashboard.
app.get('/dashboard.html', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login.html');
  }

  res.sendFile(
    path.join(__dirname, '..', 'public', 'dashboard.html')
  );
});

// Serve files from public. The home page is index.html.
app.use(express.static(
  path.join(__dirname, '..', 'public'),
  { index: 'index.html' }
));

// Return 404 if no route or public file matches the request.
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Log the full error on the server and send a simple message to the browser.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: 'Something went wrong.'
  });
});

module.exports = app;