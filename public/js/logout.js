
const logoutForm = document.querySelector('#logout-form');

logoutForm?.addEventListener('submit', async event => {
  event.preventDefault();

  const button = logoutForm.querySelector('button[type="submit"]');
  button.disabled = true;

  try {
    // Get the CSRF token before logging out.
    const csrfResponse = await fetch('/api/auth/csrf', {
      cache: 'no-store'
    });

    if (!csrfResponse.ok) {
      throw new Error('Could not prepare logout.');
    }

    const { csrfToken } = await csrfResponse.json();

    // Ask the server to destroy the session.
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken
      }
    });

    if (!response.ok) {
      throw new Error('Logout failed.');
    }

    // Return to login after successful logout.
    window.location.assign('/login.html');

  } catch (error) {
    alert('Could not log out. Please try again.');
    button.disabled = false;
  }
});
