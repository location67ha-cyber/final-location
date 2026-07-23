// ==========================================
// CONFIGURATION SUPABASE
// ==========================================
// Assurez-vous qu'il n'y a PAS de "/" à la fin de l'URL
const SUPABASE_URL = 'https://xxlehrxxrcuismlcnwhh.supabase.co';

// ⚠️ REMPLACEZ CETTE CLÉ PAR VOTRE VRAIE CLÉ "anon public" TROUVÉE DANS SUPABASE
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4bGVocnh4cmN1aXNtbGNud2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NDk2MjYsImV4cCI6MjEwMDIyNTYyNn0.148ZtlXhbfSlPJmZ6j2IzVDyGL8wXvhAxfoyxXhmCdw';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let siteConfig = null;

/**
 * Vérifie si un utilisateur est connecté et gère les rôles.
 */
async function checkAuth() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return null;
    }
    const user = session.user;
    
    // Détermination du rôle (Défaut sur 'admin' si non spécifié)
    const role = (user.user_metadata?.role || 'admin').toUpperCase();

    if (document.getElementById('user-email')) {
        document.getElementById('user-email').textContent = user.email;
    }
    if (document.getElementById('user-role')) {
        document.getElementById('user-role').textContent = role;
    }
    if (document.getElementById('btn-logout')) {
        document.getElementById('btn-logout').addEventListener('click', async () => {
            await sb.auth.signOut();
            window.location.href = 'login.html';
        });
    }

    // Charger la configuration globale du site
    await loadSiteConfig();

    return user;
}

/**
 * Charge la configuration depuis site_config.json
 */
async function loadSiteConfig() {
    if (siteConfig) return siteConfig;
    try {
        const resp = await fetch('site_config.json');
        if (!resp.ok) throw new Error('Fichier site_config.json introuvable.');
        siteConfig = await resp.json();
        return siteConfig;
    } catch (error) {
        console.error("Erreur de chargement de site_config.json:", error);
        return null;
    }
}

/**
 * Injecte automatiquement les données (NIF, STAT, Logo) dans le HTML
 */
async function renderSiteConfig() {
    const config = await loadSiteConfig();
    if (!config) return;

    // Injection NIF et STAT dans le footer
    const footerInfo = document.querySelector('footer p') || document.getElementById('footer-nif-stat');
    if (footerInfo && config.footer) {
        footerInfo.textContent = `NIF: ${config.footer.nif} | STAT: ${config.footer.stat}`;
    }

    // Injection du logo si l'élément existe
    const logoImg = document.getElementById('site-logo');
    if (logoImg && config.header?.logoUrl) {
        logoImg.src = config.header.logoUrl;
    }

    // Injection du téléphone
    const phoneElem = document.getElementById('contact-phone');
    if (phoneElem && config.contact) {
        phoneElem.textContent = config.contact.phoneDisplay;
        phoneElem.href = `tel:${config.contact.phoneCall}`;
    }
}

/**
 * Formate un nombre en devise Ariary.
 */
function formatPrix(value) {
    const num = Number(value);
    if (isNaN(num)) return '0';
    return num.toLocaleString('fr-FR');
}

/**
 * Gestion des Modales (Afficher / Masquer)
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

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text ?? '';
}

function setAttr(id, attr, value) {
    const el = document.getElementById(id);
    if (el) el.setAttribute(attr, value ?? '');
}

function toggleMenu() {
    document.getElementById('nav-menu')?.classList.toggle('active');
}

// Exécuter l'injection automatique au chargement de la page
document.addEventListener('DOMContentLoaded', renderSiteConfig);
