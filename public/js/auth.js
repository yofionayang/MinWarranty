
const form = document.querySelector('#auth-form');

if (form) {
  const message = document.querySelector('#message');
  const submitButton = form.querySelector('button[type="submit"]');

  // Show errors as text to prevent HTML injection.
  function showError(text) {
    message.className = 'error';
    message.textContent = text;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();

    message.textContent = '';
    message.className = '';

    const mode = form.dataset.mode;

    if (!['login', 'register'].includes(mode)) {
      return showError('Invalid form configuration.');
    }

    if (!form.reportValidity()) return;

    const email = document.querySelector('#email').value.trim();
    const password = document.querySelector('#password').value;

    // Confirm that passwords match during registration.
    if (mode === 'register') {
      const confirm = document.querySelector('#confirm-password');

      if (!confirm || confirm.value !== password) {
        return showError('Passwords do not match.');
      }
    }

    // Prevent multiple submissions.
    submitButton.disabled = true;

    try {
      // Get a CSRF token using the current session.
      const csrfResponse = await fetch('/api/auth/csrf', {
        cache: 'no-store'
      });

      if (!csrfResponse.ok) {
        throw new Error('Could not start a secure request.');
      }

      const { csrfToken } = await csrfResponse.json();

      // Send the registration or login request.
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || 'Could not complete request.'
        );
      }

      // Redirect after successful authentication.
      window.location.assign('/dashboard.html');

    } catch (error) {
      showError(error.message || 'Could not complete request.');

    } finally {
      submitButton.disabled = false;
    }
  });
}
