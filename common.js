// ==========================================
// CONFIGURATION SUPABASE
// ==========================================
// Assurez-vous qu'il n'y a PAS de "/" à la fin de l'URL
const SUPABASE_URL = 'https://xxlehrxxrcuismlcnwhh.supabase.co';

// ⚠️ REMPLACEZ CETTE CLÉ PAR VOTRE VRAIE CLÉ "anon public" TROUVÉE DANS SUPABASE
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4bGVocnh4cmN1aXNtbGNud2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NDk2MjYsImV4cCI6MjEwMDIyNTYyNn0.148ZtlXhbfSlPJmZ6j2IzVDyGL8wXvhAxfoyxXhmCdw';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let siteConfig = null;
let conditionsData = null;

// Chargement de site_config.json
async function loadSiteConfig() {
    if (siteConfig) return siteConfig;
    try {
        const resp = await fetch('site_config.json');
        if (!resp.ok) throw new Error('Erreur site_config.json');
        siteConfig = await resp.json();
        return siteConfig;
    } catch (e) {
        console.error(e);
        return null;
    }
}

// Chargement de conditions.json
async function loadConditions() {
    if (conditionsData) return conditionsData;
    try {
        const resp = await fetch('conditions.json');
        if (!resp.ok) throw new Error('Erreur conditions.json');
        conditionsData = await resp.json();
        return conditionsData;
    } catch (e) {
        console.error(e);
        return null;
    }
}

// Affichage dynamique (NIF, STAT, Réseaux sociaux, Engagements)
async function renderSiteConfig() {
    const config = await loadSiteConfig();
    if (!config) return;

    // NIF / STAT
    const footerInfo = document.getElementById('footer-nif-stat') || document.querySelector('footer p');
    if (footerInfo && config.footer) {
        footerInfo.textContent = `NIF: ${config.footer.nif || ''} | STAT: ${config.footer.stat || ''}`;
    }

    // Réseaux sociaux (Facebook & TikTok)
    if (config.footer?.socials) {
        const fbBtn = document.getElementById('link-facebook');
        const ttBtn = document.getElementById('link-tiktok');
        
        if (fbBtn && config.footer.socials.facebook) {
            fbBtn.href = config.footer.socials.facebook;
            fbBtn.style.display = 'inline-block';
        }
        if (ttBtn && config.footer.socials.tiktok) {
            ttBtn.href = config.footer.socials.tiktok;
            ttBtn.style.display = 'inline-block';
        }
    }

    // Engagements (Nos Engagements)
    const engContainer = document.getElementById('engagements-container');
    if (engContainer && config.features) {
        engContainer.innerHTML = config.features.map(f => `
            <div class="feature-card">
                <span class="emoji">${f.emoji}</span>
                <h3>${f.title}</h3>
                <p>${f.text}</p>
            </div>
        `).join('');
    }
}

// Modal pour afficher les conditions de location
async function openConditionsModal() {
    const data = await loadConditions();
    if (!data) return;

    let modal = document.getElementById('modal-conditions');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-conditions';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-btn" onclick="closeConditionsModal()">&times;</span>
            <h2>${data.titre}</h2>
            <div class="conditions-body">
                ${data.regles.map(r => `
                    <div class="condition-item">
                        <h4>${r.titre}</h4>
                        <p>${r.texte}</p>
                    </div>
                `).join('')}
            </div>
            <button class="btn-primary" onclick="closeConditionsModal()">J'ai compris</button>
        </div>
    `;
    modal.style.display = 'flex';
}

function closeConditionsModal() {
    const modal = document.getElementById('modal-conditions');
    if (modal) modal.style.display = 'none';
}

// Calcul de la durée en jours
function calculerDuree(dateDebut, dateFin) {
    const start = new Date(dateDebut);
    const end = new Date(dateFin);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
}

// Générateur de Récapitulatif
function afficherRecapitulatif(containerId, params) {
    const { dateDebut, heureDebut, dateFin, heureFin, prixJour, estAcomptePaye } = params;
    
    const nbJours = calculerDuree(`${dateDebut}T${heureDebut}`, `${dateFin}T${heureFin}`);
    const prixTotal = nbJours * prixJour;

    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="recap-card">
            <h3>📋 Récapitulatif de votre location</h3>
            <div class="recap-grid">
                <p><strong>Début :</strong> ${dateDebut} à ${heureDebut}</p>
                <p><strong>Fin :</strong> ${dateFin} à ${heureFin}</p>
                <p><strong>Durée :</strong> ${nbJours} jour(s)</p>
                <p class="prix-total"><strong>Prix Total :</strong> ${prixTotal.toLocaleString('fr-FR')} Ar</p>
            </div>
            
            ${estAcomptePaye ? `
                <div class="alert-success">
                    ✅ <strong>Acompte reçu :</strong> Votre facture et votre contrat de location vous seront envoyés par <strong>Email</strong> et <strong>WhatsApp</strong> après validation.
                </div>
            ` : `
                <div class="alert-warning">
                    ⚠️ <strong>Pré-réservation :</strong> La voiture reste disponible à la location tant que l'acompte n'est pas réglé.
                </div>
            `}
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', renderSiteConfig);
