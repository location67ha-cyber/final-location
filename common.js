/* ==========================================================================
   CONFIGURATION SUPABASE & UTILITAIRES GLOBAUX (common.js)
   ========================================================================== */

const SUPABASE_URL = 'https://xxlehrxxrcuismlcnwhh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4bGVocnh4cmN1aXNtbGNud2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NDk2MjYsImV4cCI6MjEwMDIyNTYyNn0.148ZtlXhbfSlPJmZ6j2IzVDyGL8wXvhAxfoyxXhmCdw';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Formater les montants en Ariary (Ar)
function formatPrix(montant) {
    if (montant === null || montant === undefined || isNaN(montant)) return '0 Ar';
    return new Intl.NumberFormat('fr-FR').format(montant) + ' Ar';
}

// Affichage / Fermeture des modales
function toggleModal(modalId, show = true) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = show ? 'flex' : 'none';
    }
}

function openModal(modalId) { toggleModal(modalId, true); }
function closeModal(modalId) { toggleModal(modalId, false); }

// Génération de références
function genererRefClient(nom, prenom) {
    const n = (nom || 'CLI').substring(0, 3).toUpperCase();
    const p = (prenom || 'CLI').substring(0, 3).toUpperCase();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `CLI-${n}${p}-${rand}`;
}

function genererRefFacture() {
    const now = new Date();
    const dateStr = now.getFullYear().toString() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
    const rand = Math.floor(100 + Math.random() * 900);
    return `FACT-${dateStr}-${rand}`;
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

// Vérification de la session admin
async function checkAuth() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
    }
}

// Déconnexion
async function seDeconnecter() {
    await sb.auth.signOut();
    window.location.href = 'login.html';
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal-overlay')) {
        event.target.style.display = 'none';
    }
};
