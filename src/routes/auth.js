/*
 * MinWarranty - Authentication Routes
 *
 * Handles registration, login, and logout.
 * Saves accounts through the JSON store and uses sessions
 * to remember who is logged in.
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

// Load the functions that read and save the users list.
const {
  readCollection,
  writeCollection
} = require('../services/jsonStore');

// Load the server-side checks for email and password.
const {
  validateEmail,
  validateRegistration
} = require('../validators/auth');

// Load the functions that issue and check CSRF tokens.
const {
  csrfToken,
  requireCsrf
} = require('../middleware/authCsrf');

const router = express.Router();

// Start with an empty registration queue and login attempt list.
let registrationQueue = Promise.resolve();
const loginAttempts = new Map();

// Limit failed logins to five per IP and email pair in 15 minutes.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

// Handle one registration at a time in this server process.
function queueRegistration(task) {
  const current = registrationQueue.then(task);

  // Let the next registration run even if this one fails.
  registrationQueue = current.catch(() => {});
  return current;
}

// Track login attempts using the IP address and email together.
function loginKey(req, email) {
  return `${req.ip}:${email}`;
}

function isRateLimited(key) {
  const now = Date.now();
  const entry = loginAttempts.get(key);

  // Start a new counter if this is the first attempt or the old window ended.
  if (!entry || now >= entry.until) {
    loginAttempts.set(key, {
      count: 0,
      until: now + WINDOW_MS
    });
    return false;
  }

  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(key) {
  const entry = loginAttempts.get(key);

  if (entry) entry.count += 1;

  // Clear the counters if the map gets too large.
  if (loginAttempts.size > 10000) {
    loginAttempts.clear();
  }
}

// Create a fresh session after registration or login.
function createSession(req, userId) {
  return new Promise((resolve, reject) => {
    req.session.regenerate(err => {
      if (err) return reject(err);

      // Store the user ID so later requests can tell who is logged in.
      req.session.userId = userId;

      // Wait for the session to save before reporting success.
      req.session.save(err => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

// The browser calls this to get a CSRF token before sending the form.
router.get('/csrf', csrfToken);

// Tell the browser whether this session has a logged-in user.
router.get('/me', (req, res) => {
  res.set('Cache-Control', 'no-store');

  res.json({
    authenticated: Boolean(req.session.userId)
  });
});

// Check the CSRF token before the POST routes below.
router.use(requireCsrf);

// REGISTER
router.post('/register', async (req, res, next) => {
  try {
    // Get the email and password sent by the form.
    const { email, password } = req.body || {};

    // Check both fields on the server before saving the account.
    const result = validateRegistration(email, password);

    if (!result.valid) {
      return res.status(400).json({
        error: result.error
      });
    }

    // Keep the duplicate check and save together in the queue.
    const user = await queueRegistration(async () => {
      const users = await readCollection('users');

      // Check whether the cleaned email is already in the users list.
      if (users.some(u => u.email === result.email)) {
        return null;
      }

      // Give the account a unique ID and save only the password hash.
      const newUser = {
        id: randomUUID(),
        email: result.email,
        passwordHash: await bcrypt.hash(password, 12)
      };

      // Add the new account and save the updated list to disk.
      users.push(newUser);
      await writeCollection('users', users);

      return newUser;
    });

    // A null result means the email was already registered.
    if (!user) {
      return res.status(409).json({
        error: 'Email already registered.'
      });
    }

    // Log the user in right after creating the account.
    await createSession(req, user.id);

    res.status(201).json({
      message: 'Account created',
      email: user.email
    });

  } catch (err) {
    // Pass unexpected errors to Express.
    next(err);
  }
});

// LOGIN
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const normalized = validateEmail(email);

    // Check the email and make sure the password is usable by bcrypt.
    if (
      !normalized ||
      typeof password !== 'string' ||
      !password ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      return res.status(401).json({
        error: 'Invalid email or password.'
      });
    }

    // Check the failed attempt limit before looking up the account.
    const key = loginKey(req, normalized);

    if (isRateLimited(key)) {
      return res.status(429).json({
        error: 'Too many attempts. Try again later.'
      });
    }

    // Read the saved accounts and find the one with this email.
    const users = await readCollection('users');

    const user = users.find(
      u => u.email === normalized
    );

    // Compare the password with the saved hash if the account exists.
    if (!user ||
        !(await bcrypt.compare(password, user.passwordHash))) {
      recordFailure(key);

      // Use the same message for a missing account or a wrong password.
      return res.status(401).json({
        error: 'Invalid email or password.'
      });
    }

    // Clear the failed attempt counter after a successful login.
    loginAttempts.delete(key);

    await createSession(req, user.id);

    res.json({ message: 'Logged in' });

  } catch (err) {
    next(err);
  }
});

// LOGOUT
router.post('/logout', (req, res, next) => {
  // End the session on the server.
  req.session.destroy(err => {
    if (err) return next(err);

    // Tell the browser to remove the session cookie.
    res.clearCookie('connect.sid', { path: '/' });

    res.json({ message: 'Logged out' });
  });
});

// Let the main Express app use these routes.
module.exports = router;