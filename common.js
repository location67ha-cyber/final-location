// ==========================================
// CONFIGURATION SUPABASE
// ==========================================
// Assurez-vous qu'il n'y a PAS de "/" à la fin de l'URL
const SUPABASE_URL = 'https://xxlehrxxrcuismlcnwhh.supabase.co';

// ⚠️ REMPLACEZ CETTE CLÉ PAR VOTRE VRAIE CLÉ "anon public" TROUVÉE DANS SUPABASE
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4bGVocnh4cmN1aXNtbGNud2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NDk2MjYsImV4cCI6MjEwMDIyNTYyNn0.148ZtlXhbfSlPJmZ6j2IzVDyGL8wXvhAxfoyxXhmCdw';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Initialisation globale au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    loadEngagements();
    loadFooterInfos();
});

// 1. Chargement dynamique des Engagements depuis site_config.json
async function loadEngagements() {
    const container = document.getElementById('engagements-container');
    if (!container) return;

    try {
        const response = await fetch('site_config.json');
        if (!response.ok) throw new Error("Impossible de charger site_config.json");
        
        const data = await response.json();
        const features = data.features || [];

        container.innerHTML = features.map(item => `
            <div class="engagement-card">
                <span class="feature-emoji">${item.emoji || '✓'}</span>
                <h4>${item.title || item.titre}</h4>
                <p>${item.text || item.description}</p>
            </div>
        `).join('');
    } catch (err) {
        console.error("Erreur Engagements :", err);
        container.innerHTML = ''; // Évite de bloquer l'affichage si le fichier est absent
    }
}

// 2. Ouverture & Chargement de la Modal des Conditions
async function openConditionsModal() {
    let modal = document.getElementById('modal-conditions');
    
    // Création dynamique du modal s'il n'existe pas dans la page
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-conditions';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content modal-lg">
                <span class="close-btn" onclick="closeModal('modal-conditions')">&times;</span>
                <h3 id="conditions-title">Conditions de Location</h3>
                <div id="conditions-body" class="conditions-scroll-body">Chargement...</div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    toggleModal('modal-conditions', true);

    try {
        const response = await fetch('conditions.json');
        const data = await response.json();
        const cond = data.conditions || {};

        document.getElementById('conditions-title').textContent = cond.titre || "Conditions de Location";
        
        const body = document.getElementById('conditions-body');
        body.innerHTML = (cond.articles || []).map(art => `
            <div class="condition-article">
                <h4>${art.titre}</h4>
                <p>${art.texte}</p>
            </div>
        `).join('');
    } catch (err) {
        document.getElementById('conditions-body').innerHTML = '<p class="text-danger">Impossible de charger les conditions.</p>';
    }
}

// 3. Utilitaires & Calculs
function setText(elementId, text) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = text;
}

function setAttr(elementId, attrName, attrValue) {
    const el = document.getElementById(elementId);
    if (el) el.setAttribute(attrName, attrValue);
}

function formatPrix(montant) {
    return new Intl.NumberFormat('fr-FR').format(montant);
}

function calculerDuree(dateDebutStr, dateFinStr) {
    const d1 = new Date(dateDebutStr);
    const d2 = new Date(dateFinStr);
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
}

function afficherRecapitulatif(containerId, params) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const nbJours = calculerDuree(`${params.dateDebut}T${params.heureDebut}`, `${params.dateFin}T${params.heureFin}`);
    const total = nbJours * params.prixJour;

    container.innerHTML = `
        <div class="recap-card">
            <p><strong>Durée :</strong> ${nbJours} jour(s)</p>
            <p><strong>Période :</strong> Du ${params.dateDebut} (${params.heureDebut}) au ${params.dateFin} (${params.heureFin})</p>
            <p><strong>Tarif journalier :</strong> ${formatPrix(params.prixJour)} Ar</p>
            <hr>
            <p class="recap-total"><strong>Montant Total estimé :</strong> ${formatPrix(total)} Ar</p>
        </div>
    `;
}

function toggleModal(id, show) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = show ? 'flex' : 'none';
}

function closeModal(id) {
    toggleModal(id, false);
}

// 4. Informations de bas de page
async function loadFooterInfos() {
    try {
        const { data } = await sb.from('parametres').select('*').single();
        if (data) {
            const elNif = document.getElementById('footer-nif-stat');
            if (elNif) elNif.textContent = `NIF: ${data.nif || '-'} | STAT: ${data.stat || '-'}`;
            
            if (data.facebook_url) {
                const fb = document.getElementById('link-facebook');
                if (fb) { fb.href = data.facebook_url; fb.style.display = 'inline-block'; }
            }
            if (data.tiktok_url) {
                const tk = document.getElementById('link-tiktok');
                if (tk) { tk.href = data.tiktok_url; tk.style.display = 'inline-block'; }
            }
        }
    } catch(e) {}
}
