document.addEventListener('DOMContentLoaded', () => {
    checkExistingSession();
    const form = document.getElementById('form-login') || document.getElementById('login-form');
    if (form) {
        form.addEventListener('submit', connexionAdmin);
    }
});

async function checkExistingSession() {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
        window.location.href = 'admin.html';
    }
}

async function connexionAdmin(event) {
    event.preventDefault();
    const feedback = document.getElementById('login-feedback');
    if (feedback) feedback.innerText = 'Vérification en cours...';

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        window.location.href = 'admin.html';
    } catch (err) {
        if (feedback) {
            feedback.innerText = 'Email ou mot de passe incorrect.';
        } else {
            alert('Erreur d\'authentification : ' + err.message);
        }
    }
}

window.connexionAdmin = connexionAdmin;
