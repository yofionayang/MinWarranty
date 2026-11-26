/*
 * MinWarranty - Logout Form
 *
 * Sends a logout request to the server and takes
 * the user back to the login page when it succeeds.
 */

const logoutForm = document.querySelector('#logout-form');

// Only listen for a submit if the logout form exists.
logoutForm?.addEventListener('submit', async event => {
  // Stop the default form submission so we can use fetch.
  event.preventDefault();

  // Disable the button while logout is running.
  const button = logoutForm.querySelector('button[type="submit"]');
  button.disabled = true;

  try {
    // Get a CSRF token from the server before sending the logout request.
    const csrfResponse = await fetch('/api/auth/csrf', {
      cache: 'no-store'
    });

    if (!csrfResponse.ok) {
      throw new Error('Could not prepare logout.');
    }

    const { csrfToken } = await csrfResponse.json();

    // Send the token in the header so the server can check it before ending the session.
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken
      }
    });

    if (!response.ok) {
      throw new Error('Logout failed.');
    }

    // Open the login page after the server confirms logout.
    window.location.assign('/login.html');

  } catch (error) {
    // Show an error and turn the button back on so the user can retry.
    alert('Could not log out. Please try again.');
    button.disabled = false;
  }
});