/* ==========================================================================
   SCRIPT COMMON & CONFIGURATION GLOBAL (common.js)
   ========================================================================== */

const SUPABASE_URL = 'https://xxlehrxxrcuismlcnwhh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4bGVocnh4cmN1aXNtbGNud2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NDk2MjYsImV4cCI6MjEwMDIyNTYyNn0.148ZtlXhbfSlPJmZ6j2IzVDyGL8wXvhAxfoyxXhmCdw';

// Unique instance Supabase réutilisable
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Formatters
function formatPrix(montant) {
    return new Intl.NumberFormat('fr-FR').format(montant || 0) + ' Ar';
}

function genererRefFacture(index = 1) {
    const d = new Date();
    const aaaa = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const jj = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    const seq = String(index).padStart(3, '0');

    return `FAC_${aaaa}_${mm}_${jj}_${hh}_${ss}_${seq}`;
}

function genererRefClient(nom, prenom = '') {
    const d = new Date();
    const aaaa = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const jj = String(d.getDate()).padStart(2, '0');

    const nomClean = `${nom}_${prenom}`
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");

    return `CLT_${aaaa}_${mm}_${jj}_${nomClean}`;
}

function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
}
