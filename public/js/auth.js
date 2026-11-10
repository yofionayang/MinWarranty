const form = document.querySelector('#auth-form');
form?.addEventListener('submit', async event => {
  event.preventDefault();
  const message = document.querySelector('#message');
  message.textContent = '';
  const email = document.querySelector('#email').value.trim();
  const password = document.querySelector('#password').value;
  if (!form.reportValidity()) return;
  try {
    const response = await fetch(`/api/auth/${form.dataset.mode}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not complete request.');
    window.location.assign('/dashboard.html');
  } catch (error) { message.textContent = error.message; message.className = 'error'; }
});
