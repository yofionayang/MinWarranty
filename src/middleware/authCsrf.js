
const { randomBytes, timingSafeEqual } = require('crypto');

// Generate a security token for the user's session.
function csrfToken(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = randomBytes(32).toString('hex');
  }

  req.session.save(err => {
    if (err) return next(err);

    res.json({ csrfToken: req.session.csrfToken });
  });
}

// Check the token before allowing sensitive requests.
function requireCsrf(req, res, next) {
  const expected = req.session.csrfToken;
  const received = req.get('x-csrf-token');

  if (typeof expected !== 'string' ||
      typeof received !== 'string') {
    return res.status(403).json({
      error: 'Invalid security token. Refresh and try again.'
    });
  }

  const a = Buffer.from(expected);
  const b = Buffer.from(received);

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return res.status(403).json({
      error: 'Invalid security token. Refresh and try again.'
    });
  }

  next();
}

module.exports = { csrfToken, requireCsrf };
