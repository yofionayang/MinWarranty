/*
 * MinWarranty - CSRF Protection
 *
 * Gives the browser a token tied to its session.
 * Checks that token before protected requests continue.
 */

const { randomBytes, timingSafeEqual } = require('crypto');

// Create a token if this session doesn't already have one.
function csrfToken(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = randomBytes(32).toString('hex');
  }

  // Save the token in the session before sending it to the browser.
  req.session.save(err => {
    if (err) return next(err);

    res.json({ csrfToken: req.session.csrfToken });
  });
}

function requireCsrf(req, res, next) {
  // Get the saved token and the token sent in the request header.
  const expected = req.session.csrfToken;
  const received = req.get('x-csrf-token');

  // Return 403 if either token is missing or isn't text.
  if (typeof expected !== 'string' ||
      typeof received !== 'string') {
    return res.status(403).json({
      error: 'Invalid security token. Refresh and try again.'
    });
  }

  // Convert both tokens to bytes so we can compare them.
  const a = Buffer.from(expected);
  const b = Buffer.from(received);

  // Check the lengths first because timingSafeEqual needs equal lengths.
  // Then compare the tokens without revealing how much of them matches.
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return res.status(403).json({
      error: 'Invalid security token. Refresh and try again.'
    });
  }

  // The tokens match, so let the request reach the route.
  next();
}

module.exports = { csrfToken, requireCsrf };