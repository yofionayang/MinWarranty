const express = require('express');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const { readCollection, writeCollection } = require('../services/jsonStore');
const { validateRegistration } = require('../validators/auth');
const router = express.Router();


router.post('/register', async (req, res, next) => {
  try {
      const { email, password } = req.body || {};

      // Validate untrusted input before using it.
      const result = validateRegistration(email, password);

      if (!result.valid) {
          return res.status(400).json({
              error: result.error
          });
      }

      // Use the normalized email from the validator.
      const normalizedEmail = result.email;

      const users = await readCollection('users');

      // Reject duplicate email addresses.
      if (users.some(user => user.email === normalizedEmail)) {
          return res.status(409).json({
              error: 'Email already registered.'
          });
      }

      // Never store a plaintext password.
      const passwordHash = await bcrypt.hash(password, 12);

      const user = {
          id: randomUUID(),
          email: normalizedEmail,
          passwordHash
      };

      users.push(user);
      await writeCollection('users', users);

      // Create a new session after registration.
      req.session.regenerate(err => {
          if (err) return next(err);

          req.session.userId = user.id;

          res.status(201).json({
              message: 'Account created',
              email: user.email
          });
      });

  } catch (err) {
      next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || email.length > 254 || password.length > 72) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }
    const users = await readCollection('users');
    const user = users.find(u => u.email === email.trim().toLowerCase());
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    req.session.regenerate(err => {
      if (err) return next(err);
      req.session.userId = user.id;
      res.json({ message: 'Logged in' });
    });
  } catch (err) { next(err); }
});
router.post('/logout', (req, res, next) => {
  req.session.destroy(err => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
});
router.get('/me', (req, res) => res.json({ authenticated: Boolean(req.session.userId) }));
module.exports = router;
