/* ==========================================================================
   SCRIPT CATALOGUE, CALENDRIER & WA (script-voitures.js)
   ========================================================================== */

let allVoitures = [];
let currentCar = null;
let currentReservations = [];
let currentMaintenances = [];
const NUMERO_WHATSAPP_ADMIN = "261349120726"; // Votre numéro WhatsApp

document.addEventListener('DOMContentLoaded', async () => {
    await loadVoituresPublic();
});

async function loadVoituresPublic() {
    const grid = document.getElementById('grid-voitures-public');
    try {
        const { data, error } = await sb.from('voitures').select('*');
        if (error) throw error;

        allVoitures = data || [];
        renderVoitures(allVoitures);
    } catch (err) {
        console.error("Erreur chargement voitures :", err);
        grid.innerHTML = `<p style="color: #ef4444;">Erreur lors du chargement des véhicules.</p>`;
    }
}

function renderVoitures(list) {
    const grid = document.getElementById('grid-voitures-public');
    grid.innerHTML = list.map(v => `
        <div class="car-card-pub">
            <img src="${v.image_url || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=500'}" alt="${v.marque}">
            <div class="car-info">
                <h3>${v.marque} ${v.modele}</h3>
                <div class="car-tags">
                    <span>${v.places || 5} places</span>
                    <span>${v.transmission || 'Manuelle'}</span>
                </div>
                <p class="car-price">${formatPrix(v.tarif_sans_24h || 150000)} / 24h</p>
                <button class="btn-primary" onclick="ouvrirModalReservation(${v.id})">Réserver</button>
            </div>
        </div>
    `).join('');
}

async function ouvrirModalReservation(carId) {
    currentCar = allVoitures.find(v => v.id === carId);
    if (!currentCar) return;

    document.getElementById('form-reservation').reset();
    document.getElementById('resa-car-id').value = currentCar.id;
    document.getElementById('modal-car-title').textContent = `Réserver : ${currentCar.marque} ${currentCar.modele}`;

    // Récupérer les réservations et maintenances existantes pour le calendrier
    const [resResa, resMaint] = await Promise.all([
        sb.from('reservations').select('*').eq('id_voiture', carId),
        sb.from('maintenances').select('*').eq('id_voiture', carId)
    ]);

    currentReservations = resResa.data || [];
    currentMaintenances = resMaint.data || [];

    afficherCalendrierVoiture();
    openModal('modal-reservation');
}

// Generateur du calendrier visuel
function afficherCalendrierVoiture() {
    const grid = document.getElementById('car-calendar-display');
    grid.innerHTML = '';

    const aujourdhui = new Date();
    for (let i = 0; i < 14; i++) {
        const d = new Date();
        d.setDate(aujourdhui.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const jourNum = d.getDate();
        const moisStr = d.toLocaleDateString('fr-FR', { month: 'short' });

        let statusClass = 'dispo';
        let label = `${jourNum} ${moisStr}`;

        // Vérification maintenance (Noir)
        const inMaintenance = currentMaintenances.some(m => dateStr >= m.date_debut && dateStr <= m.date_fin);
        if (inMaintenance) {
            statusClass = 'maintenance';
        } else {
            // Vérification Réservation
            const resa = currentReservations.find(r => dateStr >= r.date_debut && dateStr <= r.date_fin);
            if (resa) {
                if ((resa.montant_paye || 0) > 0) {
                    statusClass = 'reserve'; // Orange
                } else {
                    statusClass = 'prereserve'; // Gris
                }
            }
        }

        grid.innerHTML += `<div class="cal-day ${statusClass}">${label}</div>`;
    }
}

// Calcul des tarifs selon vos règles
function calculerTarifEtVerifierDispo() {
    const dateDebut = document.getElementById('resa-date-debut').value;
    const dateFin = document.getElementById('resa-date-fin').value;
    const typeTarif = document.getElementById('resa-type-tarif').value; // 'sans_chauffeur' / 'avec_chauffeur'
    const dureeType = document.getElementById('resa-duree-type').value; // '12h' / '24h'
    const optChauffeur = document.getElementById('opt-chauffeur').checked;
    const optLivraison = parseFloat(document.getElementById('opt-livraison').value) || 0;
    const optRecuperation = parseFloat(document.getElementById('opt-recuperation').value) || 0;

    const boxChauffeur = document.getElementById('box-option-chauffeur');
    if (typeTarif === 'avec_chauffeur') {
        boxChauffeur.style.display = 'none';
    } else {
        boxChauffeur.style.display = 'flex';
    }

    if (!dateDebut || !dateFin) return;

    // Calcul du nombre de jours
    const d1 = new Date(dateDebut);
    const d2 = new Date(dateFin);
    const diffTime = d2 - d1;
    let nbrJours = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (nbrJours <= 0) nbrJours = 1;

    // Vérification Conflits
    let estOccupe = false;
    let checkDate = new Date(d1);
    while (checkDate <= d2) {
        const curStr = checkDate.toISOString().split('T')[0];
        const maint = currentMaintenances.some(m => curStr >= m.date_debut && curStr <= m.date_fin);
        const resa = currentReservations.some(r => curStr >= r.date_debut && curStr <= r.date_fin);
        if (maint || resa) {
            estOccupe = true;
            break;
        }
        checkDate.setDate(checkDate.getDate() + 1);
    }

    const alertBox = document.getElementById('alert-indispo');
    const btnSubmit = document.getElementById('btn-submit-resa');
    if (estOccupe) {
        alertBox.style.display = 'block';
        btnSubmit.disabled = true;
        btnSubmit.style.opacity = '0.5';
    } else {
        alertBox.style.display = 'none';
        btnSubmit.disabled = false;
        btnSubmit.style.opacity = '1';
    }

    // Détermination du prix unitaire par jour
    let prixBaseJour = 0;
    const tSans12 = currentCar.tarif_sans_12h || 100000;
    const tSans24 = currentCar.tarif_sans_24h || 150000;
    const tAvec12 = currentCar.tarif_avec_12h || 160000;
    const tAvec24 = currentCar.tarif_avec_24h || 200000;

    // RÈGLE : Si réservation > 3 jours => Tarif 12h x nbrJours
    if (nbrJours > 3) {
        prixBaseJour = (typeTarif === 'sans_chauffeur') ? tSans12 : tAvec12;
    } else {
        if (typeTarif === 'sans_chauffeur') {
            prixBaseJour = (dureeType === '12h') ? tSans12 : tSans24;
        } else {
            prixBaseJour = (dureeType === '12h') ? tAvec12 : tAvec24;
        }
    }

    let total = prixBaseJour * nbrJours;

    // Option Chauffeur fixe 40.000 Ar/jour (si sans chauffeur sélectionné)
    let totalOptions = optLivraison + optRecuperation;
    if (typeTarif === 'sans_chauffeur' && optChauffeur) {
        totalOptions += (40000 * nbrJours);
    }

    total += totalOptions;

    // Mise à jour de l'affichage du récapitulatif
    document.getElementById('recap-duree').textContent = `${nbrJours} jour(s) ${nbrJours > 3 ? '(Remise > 3j appliquée)' : ''}`;
    document.getElementById('recap-formule').textContent = `${typeTarif === 'sans_chauffeur' ? 'Sans Chauffeur' : 'Avec Chauffeur'} (${formatPrix(prixBaseJour)}/j)`;
    document.getElementById('recap-options').textContent = formatPrix(totalOptions);
    document.getElementById('recap-total').textContent = formatPrix(total);
}

// Soumission : Enregistrement Supabase + Ouverture WhatsApp
async function soumettreReservationEtWhatsapp(e) {
    e.preventDefault();

    const carId = currentCar.id;
    const nom = document.getElementById('resa-nom').value.trim();
    const prenom = document.getElementById('resa-prenom').value.trim();
    const tel = document.getElementById('resa-tel').value.trim();
    const email = document.getElementById('resa-email').value.trim();
    const dateDebut = document.getElementById('resa-date-debut').value;
    const heureDebut = document.getElementById('resa-heure-debut').value;
    const dateFin = document.getElementById('resa-date-fin').value;
    const heureFin = document.getElementById('resa-heure-fin').value;
    const typeTarif = document.getElementById('resa-type-tarif').value;
    const dureeType = document.getElementById('resa-duree-type').value;
    const optChauffeur = document.getElementById('opt-chauffeur').checked;
    const optLivraison = parseFloat(document.getElementById('opt-livraison').value) || 0;
    const optRecuperation = parseFloat(document.getElementById('opt-recuperation').value) || 0;

    const refClient = genererRefClient(nom, prenom);
    const refFacture = genererRefFacture(Math.floor(Math.random() * 899) + 100);

    const prixTotalTxt = document.getElementById('recap-total').textContent;

    try {
        // 1. Enregistrement dans Supabase
        await sb.from('clients').upsert([{ ref_client: refClient, nom: `${nom} ${prenom}`, tel: tel, email: email }], { onConflict: 'tel' });

        const { error } = await sb.from('reservations').insert([{
            ref_facture: refFacture,
            id_voiture: carId,
            nom: `${nom} ${prenom}`,
            tel: tel,
            date_debut: dateDebut,
            heure_debut: heureDebut,
            date_fin: dateFin,
            heure_fin: heureFin,
            type_tarif: typeTarif,
            duree_type: dureeType,
            option_chauffeur: optChauffeur,
            option_livraison: optLivraison,
            option_recuperation: optRecuperation,
            montant_paye: 0,
            montant_total: parseFloat(prixTotalTxt.replace(/[^0-9]/g, '')),
            statut: 'en_attente'
        }]);

        if (error) throw error;

        // 2. Construction du Message WhatsApp
        const msgWA = `*NOUVELLE RÉSERVATION - LOCATION TANA*
----------------------------------
*Réf Facture :* ${refFacture}
*Client :* ${nom} ${prenom}
*Contact :* ${tel}
*Email :* ${email}

*Véhicule :* ${currentCar.marque} ${currentCar.modele}
*Départ :* ${dateDebut} à ${heureDebut}
*Retour :* ${dateFin} à ${heureFin}
*Formule :* ${typeTarif === 'sans_chauffeur' ? 'Sans Chauffeur' : 'Avec Chauffeur'}
*Option Chauffeur :* ${optChauffeur ? 'Oui (+40 000 Ar/j)' : 'Non'}
*Livraison/Récupération :* ${optLivraison + optRecuperation} Ar

*PRIX TOTAL :* ${prixTotalTxt}
----------------------------------
_Réservation enregistrée sur le site web_`;

        const waUrl = `https://wa.me/${NUMERO_WHATSAPP_ADMIN}?text=${encodeURIComponent(msgWA)}`;
        
        closeModal('modal-reservation');
        window.open(waUrl, '_blank');

    } catch (err) {
        alert("Erreur lors de la réservation : " + err.message);
    }
}
