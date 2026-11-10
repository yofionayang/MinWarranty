(async function loadDashboard() {
  const message = document.querySelector('#warranty-message');
  try {
    const response = await fetch('/api/warranties');
    if (response.status === 401) return window.location.replace('/login.html');
    if (!response.ok) throw new Error('Could not load warranties.');
    const data = await response.json();
    message.textContent = data.note || `${data.warranties.length} warranties found.`;
  } catch (error) { message.textContent = error.message; }
})();
document.querySelector('#logout')?.addEventListener('click', async () => {
  const response = await fetch('/api/auth/logout', { method: 'POST' });
  if (response.ok) window.location.assign('/login.html');
});
