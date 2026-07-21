const SUPABASE_URL = 'https://ctijwjcjmbfmfhzwbguk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0aWp3amNqbWJmbWZoendiZ3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MzEyOTgsImV4cCI6MjA4MTQwNzI5OH0.gEPvDc0lgf1o1Ol5AJFDPFG8Oh5SIbsZvg-8KTB4utk';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-form').addEventListener('submit', authenticate);
  checkExistingSession();
});

async function checkExistingSession() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    window.location.href = 'admin.html';
  }
}

async function authenticate(event) {
  event.preventDefault();
  const feedback = document.getElementById('login-feedback');
  feedback.textContent = 'Vérification…';

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    feedback.textContent = "Email ou mot de passe incorrect.";
    return;
  }
  window.location.href = 'admin.html';
}
