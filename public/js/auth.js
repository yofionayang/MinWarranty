/*
 * MinWarranty - Login and Registration Requests
 *
 * Handles both forms in the browser.
 * Gets a CSRF token and sends the form data to the server.
 * Opens the dashboard on success or shows an error.
 */
// How we connects the login and register forms to the backend.
const form = document.querySelector('#auth-form');

// Only set up the form if it exists on this page.
if (form) {
  const message = document.querySelector('#message');
  const submitButton = form.querySelector('button[type="submit"]');

  // Apply the error style and display the message as plain text.
  function showError(text) {
    message.className = 'error';
    message.textContent = text;
  }

  form.addEventListener('submit', async event => {
    // Stop the browser's default submission so we can use fetch.
    event.preventDefault();

    // Clear any message left over from the last attempt.
    message.textContent = '';
    message.className = '';

    // Read data-mode from HTML to find out which form this is.
    const mode = form.dataset.mode;

    if (!['login', 'register'].includes(mode)) {
      return showError('Invalid form configuration.');
    }

    // Show the browser's validation message if a field is invalid.
    if (!form.reportValidity()) return;

    // Remove spaces around the email and keep the password as typed.
    const email = document.querySelector('#email').value.trim();
    const password = document.querySelector('#password').value;

    // Only the register form asks the user to type the password twice.
    if (mode === 'register') {
      const confirm = document.querySelector('#confirm-password');

      if (!confirm || confirm.value !== password) {
        return showError('Passwords do not match.');
      }
    }

    // Disable the button while the request is running.
    submitButton.disabled = true;

    try {
      // Ask the server for a CSRF token without using a cached response.
      const csrfResponse = await fetch('/api/auth/csrf', {
        cache: 'no-store'
      });

      if (!csrfResponse.ok) {
        throw new Error('Could not start a secure request.');
      }

      const { csrfToken } = await csrfResponse.json();

      // Send the email and password as JSON to the login or register route.
      // The server can check the CSRF token from the request header.
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({ email, password })
      });

      // Use an empty object if the response can't be read as JSON.
      const data = await response.json().catch(() => ({}));

      // Use the server's error message if it sent one.
      if (!response.ok) {
        throw new Error(
          data.error || 'Could not complete request.'
        );
      }

      // Open the dashboard after a successful response.
      window.location.assign('/dashboard.html');

    } catch (error) {
      // Show the error in the message area on the form.
      showError(error.message || 'Could not complete request.');

    } finally {
      // Turn the button back on so the user can retry if needed.
      submitButton.disabled = false;
    }
  });
}