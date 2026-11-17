
const form = document.querySelector('#auth-form');

if (form) {
  const message = document.querySelector('#message');
  const submitButton = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async event => {
    event.preventDefault();

    message.textContent = '';
    message.className = '';

    const email = document.querySelector('#email').value.trim();
    const password = document.querySelector('#password').value;
    const mode = form.dataset.mode;

    // Only allow the expected authentication actions.
    if (mode !== 'login' && mode !== 'register') {
      message.textContent = 'Invalid form configuration.';
      return;
    }

    // Check password confirmation during registration.
    if (mode === 'register') {
      const confirmPassword =
        document.querySelector('#confirm-password');

      if (!confirmPassword || password !== confirmPassword.value) {
        message.textContent = 'Passwords do not match.';
        message.className = 'error';
        return;
      }
    }

    if (!form.reportValidity()) return;

    // Prevent multiple submissions while processing.
    submitButton.disabled = true;

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      // Handle unexpected server responses safely.
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || 'Could not complete request.'
        );
      }

      window.location.assign('/dashboard.html');

    } catch (error) {
      // textContent prevents HTML from being executed.
      message.textContent = error.message;
      message.className = 'error';

    } finally {
      submitButton.disabled = false;
    }
  });
}
