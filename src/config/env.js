require('dotenv').config();

module.exports = {
  port: Number(process.env.PORT) || 3000,
  sessionSecret: process.env.SESSION_SECRET,
  isProduction: process.env.NODE_ENV === 'production'
};
