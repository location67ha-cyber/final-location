const SUPABASE_URL = 'https://ctijwjcjmbfmfhzwbguk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4bGVocnh4cmN1aXNtbGNud2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NDk2MjYsImV4cCI6MjEwMDIyNTYyNn0.148ZtlXhbfSlPJmZ6j2IzVDyGL8wXvhAxfoyxXhmCdw';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let siteConfig = null;

/**
 * Vérifie si un utilisateur est connecté et le redirige si besoin.
 * @returns {object|null} L'objet utilisateur ou null.
 */
async function checkAuth() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return null;
    }
    const user = session.user;
    if (document.getElementById('user-email')) {
        document.getElementById('user-email').textContent = user.email;
    }
    if (document.getElementById('user-role')) {
        document.getElementById('user-role').textContent = (user.user_metadata?.role || 'admin').toUpperCase();
    }
    if (document.getElementById('btn-logout')) {
        document.getElementById('btn-logout').addEventListener('click', async () => {
            await sb.auth.signOut();
            window.location.href = 'login.html';
        });
    }
    return user;
}

/**
 * Charge la configuration depuis site_config.json
 */
async function loadSiteConfig() {
    if (siteConfig) return siteConfig;
    try {
        const resp = await fetch('site_config.json');
        if (!resp.ok) throw new Error('Fichier de configuration introuvable.');
        siteConfig = await resp.json();
        return siteConfig;
    } catch (error) {
        console.error("Erreur de chargement de site_config.json:", error);
        return null;
    }
}

/**
 * Formate un nombre en devise Ariary.
 * @param {number} value - La valeur à formater.
 * @returns {string} La valeur formatée.
 */
function formatPrix(value) {
    if (typeof value !== 'number') return '0';
    return value.toLocaleString('fr-FR');
}

/**
 * Affiche ou masque une modale.
 * @param {string} modalId - L'ID de la modale.
 * @param {boolean} show - true pour afficher, false pour masquer.
 */
function toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = show ? 'flex' : 'none';
    }
}

function closeModal(modalId) {
    toggleModal(modalId, false);
}

/**
 * Met à jour le contenu texte d'un élément.
 * @param {string} id - L'ID de l'élément.
 * @param {string} text - Le texte à insérer.
 */
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text ?? '';
}

/**
 * Définit un attribut sur un élément.
 * @param {string} id - L'ID de l'élément.
 * @param {string} attr - Le nom de l'attribut.
 * @param {string} value - La valeur de l'attribut.
 */
function setAttr(id, attr, value) {
    const el = document.getElementById(id);
    if (el) el.setAttribute(attr, value ?? '');
}

/**
 * Gère le menu de navigation sur mobile.
 */
function toggleMenu() {
    document.getElementById('nav-menu')?.classList.toggle('active');
}
