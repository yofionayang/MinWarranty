/*
 * MinWarranty - Authentication Validation
 *
 * Checks the email and password on the server
 * before an account can be created.
 */

// Check the email and return the cleaned version.
function validateEmail(email) {

    // Make sure the email is text before calling trim().
    if (typeof email !== "string") {
        return null;
    }
  
    // Remove spaces at the ends and convert the email to lowercase.
    const normalizedEmail = email.trim().toLowerCase();
  
    // Reject blank emails and emails longer than 254 characters.
    if (
        normalizedEmail.length === 0 ||
        normalizedEmail.length > 254
    ) {
        return null;
    }
  
    // Check for a basic email format like name@example.com.
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
    if (!emailPattern.test(normalizedEmail)) {
        return null;
    }
  
    return normalizedEmail;
  }
  
  // Check whether the password meets the server's length rule.
  function validatePassword(password) {
  
    // Make sure the password is text before counting its bytes.
    if (typeof password !== "string") {
        return false;
    }
  
    // Some characters take more than one byte. Bcrypt uses up to 72 bytes.
    const byteLength = Buffer.byteLength(password, "utf8");
  
    return byteLength >= 8 && byteLength <= 72;
  }
  
  // Check the email first, then the password.
  function validateRegistration(email, password) {
  
    const normalizedEmail = validateEmail(email);
  
    // Return an error if the email check failed.
    if (!normalizedEmail) {
        return {
            valid: false,
            error: "Please enter a valid email address."
        };
    }
  
    // Return an error if the password check failed.
    if (!validatePassword(password)) {
        return {
            valid: false,
            error: "Password must be 8–72 bytes long."
        };
    }
  
    // Give the route the cleaned email when both checks pass.
    return {
        valid: true,
        email: normalizedEmail
    };
  }
  
  // Let other server files use these functions.
  module.exports = {
    validateEmail,
    validatePassword,
    validateRegistration
  };