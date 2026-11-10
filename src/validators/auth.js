function validCredentials(email, password) {
  return typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    typeof password === 'string' && password.length >= 8 && password.length <= 72;
}
module.exports = { validCredentials };
