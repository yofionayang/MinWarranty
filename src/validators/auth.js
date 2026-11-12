
/*
 * MinWarranty - Authentication Validation
 *
 * Validates untrusted registration input
 * before the server creates an account.
 */

// Normalize and validate email addresses.
function validateEmail(email) {

  // Reject numbers, arrays, objects, and missing values.
  if (typeof email !== "string") {
      return null;
  }

  // Remove surrounding spaces and normalize case.
  const normalizedEmail = email.trim().toLowerCase();

  // Reject empty or excessively long emails.
  if (
      normalizedEmail.length === 0 ||
      normalizedEmail.length > 254
  ) {
      return null;
  }

  // Check basic email format.
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(normalizedEmail)) {
      return null;
  }

  return normalizedEmail;
}

// Validate registration passwords.
function validatePassword(password) {

  // Password must be a string.
  if (typeof password !== "string") {
      return false;
  }

  // Check password length using UTF-8 byte length.
  const byteLength = Buffer.byteLength(password, "utf8");

  return byteLength >= 8 && byteLength <= 72;
}

// Validate a complete registration request.
function validateRegistration(email, password) {

  const normalizedEmail = validateEmail(email);

  if (!normalizedEmail) {
      return {
          valid: false,
          error: "Please enter a valid email address."
      };
  }

  if (!validatePassword(password)) {
      return {
          valid: false,
          error: "Password must be 8–72 bytes long."
      };
  }

  return {
      valid: true,
      email: normalizedEmail
  };
}

module.exports = {
  validateEmail,
  validatePassword,
  validateRegistration
};
