/*
 * MinWarranty - Require Login
 *
 * Checks whether the user is logged in before
 * letting them access a protected route.
 */

module.exports = function requireAuth(req, res, next) {
  // If the session has no user ID, respond with 401 and stop here.
  if (!req.session.userId) return res.status(401).json({ error: 'Please log in first.' });

  // The user is logged in, so let the request continue.
  next();
};