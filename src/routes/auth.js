
const express = require('express');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const {
  readCollection,
  writeCollection
} = require('../services/jsonStore');

const {
  validateEmail,
  validateRegistration
} = require('../validators/auth');

const {
  csrfToken,
  requireCsrf
} = require('../middleware/authCsrf');

const router = express.Router();

let registrationQueue = Promise.resolve();
const loginAttempts = new Map();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

// Process registrations one at a time to prevent duplicates.
function queueRegistration(task) {
  const current = registrationQueue.then(task);
  registrationQueue = current.catch(() => {});
  return current;
}

// Identify login attempts by IP address and email.
function loginKey(req, email) {
  return `${req.ip}:${email}`;
}

// Limit repeated failed login attempts.
function isRateLimited(key) {
  const now = Date.now();
  const entry = loginAttempts.get(key);

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

  // Limit memory usage in the development server.
  if (loginAttempts.size > 10000) {
    loginAttempts.clear();
  }
}

// Regenerate and save the session after authentication.
function createSession(req, userId) {
  return new Promise((resolve, reject) => {
    req.session.regenerate(err => {
      if (err) return reject(err);

      req.session.userId = userId;

      req.session.save(err => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

// CSRF token endpoint.
router.get('/csrf', csrfToken);

// Check whether the user is logged in.
router.get('/me', (req, res) => {
  res.set('Cache-Control', 'no-store');

  res.json({
    authenticated: Boolean(req.session.userId)
  });
});

// Protect authentication POST requests.
router.use(requireCsrf);

// REGISTER
router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    // Validate all input on the server.
    const result = validateRegistration(email, password);

    if (!result.valid) {
      return res.status(400).json({
        error: result.error
      });
    }

    const user = await queueRegistration(async () => {
      const users = await readCollection('users');

      // Check for duplicate email addresses.
      if (users.some(u => u.email === result.email)) {
        return null;
      }

      // Store the password hash, not the actual password.
      const newUser = {
        id: randomUUID(),
        email: result.email,
        passwordHash: await bcrypt.hash(password, 12)
      };

      users.push(newUser);
      await writeCollection('users', users);

      return newUser;
    });

    if (!user) {
      return res.status(409).json({
        error: 'Email already registered.'
      });
    }

    await createSession(req, user.id);

    res.status(201).json({
      message: 'Account created',
      email: user.email
    });

  } catch (err) {
    next(err);
  }
});

// LOGIN
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const normalized = validateEmail(email);

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

    const key = loginKey(req, normalized);

    if (isRateLimited(key)) {
      return res.status(429).json({
        error: 'Too many attempts. Try again later.'
      });
    }

    const users = await readCollection('users');

    const user = users.find(
      u => u.email === normalized
    );

    // Check the submitted password against the stored hash.
    if (!user ||
        !(await bcrypt.compare(password, user.passwordHash))) {
      recordFailure(key);

      return res.status(401).json({
        error: 'Invalid email or password.'
      });
    }

    loginAttempts.delete(key);

    await createSession(req, user.id);

    res.json({ message: 'Logged in' });

  } catch (err) {
    next(err);
  }
});

// LOGOUT
router.post('/logout', (req, res, next) => {
  req.session.destroy(err => {
    if (err) return next(err);

    // Remove the session cookie from the browser.
    res.clearCookie('connect.sid', { path: '/' });

    res.json({ message: 'Logged out' });
  });
});

module.exports = router;
