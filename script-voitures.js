/* ==========================================================================
   CATALOGUE, CALENDRIER & RESERVATION (script-voitures.js)
   ========================================================================== */

let allVoitures = [];
let currentCar = null;
let currentReservations = [];
let currentMaintenances = [];
const NUMERO_WHATSAPP_ADMIN = "261349120726";

document.addEventListener('DOMContentLoaded', async () => {
    await loadVoituresPublic();
});

async function loadVoituresPublic() {
    const grid = document.getElementById('grid-voitures-public');
    if (!grid) return;

    try {
        const { data, error } = await sb.from('voitures').select('*').eq('est_public', true);
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
    if (!grid) return;

    grid.innerHTML = list.length ? list.map(v => {
        const prixAffiche = v.prix_24h_sans_chauffeur || v.prix_24h_avec_chauffeur || 150000;
        return `
            <div class="car-card-pub">
                <img src="${v.image_url || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=500'}" alt="${v.marque}">
                <div class="car-info">
                    <h3>${v.marque} ${v.modele}</h3>
                    <div class="car-tags">
                        <span>${v.places || 5} places</span>
                        <span>${v.transmission || 'Manuelle'}</span>
                        <span>${v.carburant || 'Essence'}</span>
                    </div>
                    <p class="car-price">${formatPrix(prixAffiche)} / 24h</p>
                    <button class="btn-primary" onclick="ouvrirModalReservation(${v.id})">Réserver</button>
                </div>
            </div>
        `;
    }).join('') : '<p>Aucun véhicule disponible pour le moment.</p>';
}

async function ouvrirModalReservation(carId) {
    currentCar = allVoitures.find(v => v.id === carId);
    if (!currentCar) return;

    const form = document.getElementById('form-reservation');
    if (form) form.reset();

    // Réinitialisation explicite à 15.000 Ar par défaut chacun
    const inputLivraison = document.getElementById('opt-livraison');
    const inputRecuperation = document.getElementById('opt-recuperation');
    if (inputLivraison) inputLivraison.value = 15000;
    if (inputRecuperation) inputRecuperation.value = 15000;

    const carIdInput = document.getElementById('resa-car-id');
    if (carIdInput) carIdInput.value = currentCar.id;
    setText('modal-car-title', `Réserver : ${currentCar.marque} ${currentCar.modele}`);

    const [resResa, resMaint] = await Promise.all([
        sb.from('reservations').select('*').eq('id_voiture', carId),
        sb.from('maintenances').select('*').eq('id_voiture', carId)
    ]);

    currentReservations = resResa.data || [];
    currentMaintenances = resMaint.data || [];

    afficherCalendrierVoiture();
    calculerTarifEtVerifierDispo();
    toggleModal('modal-reservation', true);
}

function afficherCalendrierVoiture() {
    const grid = document.getElementById('car-calendar-display');
    if (!grid) return;
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

        const inMaintenance = currentMaintenances.some(m => m.date_prevue === dateStr);
        if (inMaintenance) {
            statusClass = 'maintenance';
        } else {
            const resa = currentReservations.find(r => dateStr >= r.date_debut && dateStr <= r.date_fin);
            if (resa) {
                statusClass = (resa.paiement_montant_declare || 0) > 0 ? 'reserve' : 'prereserve';
            }
        }

        grid.innerHTML += `<div class="cal-day ${statusClass}" title="${statusClass}">${label}</div>`;
    }
}

function calculerTarifEtVerifierDispo() {
    const dateDebut = document.getElementById('resa-date-debut')?.value;
    const heureDebut = document.getElementById('resa-heure-debut')?.value || '08:00';
    const dateFin = document.getElementById('resa-date-fin')?.value;
    const heureFin = document.getElementById('resa-heure-fin')?.value || '18:00';
    const typeTarif = document.getElementById('resa-type-tarif')?.value;
    const dureeType = document.getElementById('resa-duree-type')?.value;
    const optChauffeur = document.getElementById('opt-chauffeur')?.checked;
    
    const rawLivraison = parseFloat(document.getElementById('opt-livraison')?.value);
    const rawRecuperation = parseFloat(document.getElementById('opt-recuperation')?.value);
    const optLivraison = isNaN(rawLivraison) ? 15000 : rawLivraison;
    const optRecuperation = isNaN(rawRecuperation) ? 15000 : rawRecuperation;

    const boxChauffeur = document.getElementById('box-option-chauffeur');
    if (boxChauffeur) {
        boxChauffeur.style.display = (typeTarif === 'avec_chauffeur') ? 'none' : 'flex';
    }

    if (!dateDebut || !dateFin || !currentCar) return;

    // Calcul précis en heures
    const dtDebut = new Date(`${dateDebut}T${heureDebut}`);
    const dtFin = new Date(`${dateFin}T${heureFin}`);
    const totalHeures = (dtFin - dtDebut) / (1000 * 60 * 60);

    let nbrJours = Math.ceil(totalHeures / 24);
    if (nbrJours <= 0) nbrJours = 1;

    // Vérification disponibilité
    let estOccupe = false;
    let checkDate = new Date(dateDebut);
    const endDateObj = new Date(dateFin);

    while (checkDate <= endDateObj) {
        const curStr = checkDate.toISOString().split('T')[0];
        const maint = currentMaintenances.some(m => m.date_prevue === curStr);
        const resa = currentReservations.some(r => curStr >= r.date_debut && curStr <= r.date_fin);
        if (maint || resa) {
            estOccupe = true;
            break;
        }
        checkDate.setDate(checkDate.getDate() + 1);
    }

    const alertBox = document.getElementById('alert-indispo');
    const btnSubmit = document.getElementById('btn-submit-resa');
    if (alertBox && btnSubmit) {
        alertBox.style.display = estOccupe ? 'block' : 'none';
        btnSubmit.disabled = estOccupe;
        btnSubmit.style.opacity = estOccupe ? '0.5' : '1';
    }

    let prixBaseJour = 0;
    const tSans12 = currentCar.prix_12h_sans_chauffeur || 100000;
    const tSans24 = currentCar.prix_24h_sans_chauffeur || 150000;
    const tAvec12 = currentCar.prix_12h_avec_chauffeur || 160000;
    const tAvec24 = currentCar.prix_24h_avec_chauffeur || 200000;

    if (nbrJours > 3) {
        prixBaseJour = (typeTarif === 'sans_chauffeur') ? tSans12 : tAvec12;
    } else {
        prixBaseJour = (typeTarif === 'sans_chauffeur') 
            ? (dureeType === '12h' ? tSans12 : tSans24)
            : (dureeType === '12h' ? tAvec12 : tAvec24);
    }

    let total = prixBaseJour * nbrJours;
    let totalOptions = optLivraison + optRecuperation;
    if (typeTarif === 'sans_chauffeur' && optChauffeur) {
        const prixOptChauffeur = currentCar.prix_option_chauffeur || 40000;
        totalOptions += (prixOptChauffeur * nbrJours);
    }

    total += totalOptions;

    setText('recap-duree', `${nbrJours} jour(s) ${nbrJours > 3 ? '(Tarif dégressif)' : ''}`);
    setText('recap-formule', `${typeTarif === 'sans_chauffeur' ? 'Sans Chauffeur' : 'Avec Chauffeur'} (${formatPrix(prixBaseJour)}/j)`);
    setText('recap-options', formatPrix(totalOptions));
    setText('recap-total', formatPrix(total));
}

async function soumettreReservationEtWhatsapp(e) {
    e.preventDefault();

    const carId = currentCar.id;
    const nom = document.getElementById('resa-nom').value.trim();
    const prenom = document.getElementById('resa-prenom').value.trim();
    const tel = document.getElementById('resa-tel').value.trim();
    const email = document.getElementById('resa-email')?.value.trim() || '';
    const dateDebut = document.getElementById('resa-date-debut').value;
    const heureDebut = document.getElementById('resa-heure-debut')?.value || '08:00';
    const dateFin = document.getElementById('resa-date-fin').value;
    const heureFin = document.getElementById('resa-heure-fin')?.value || '18:00';
    const typeTarif = document.getElementById('resa-type-tarif').value;
    const dureeType = document.getElementById('resa-duree-type').value;
    const optChauffeur = document.getElementById('opt-chauffeur')?.checked || false;
    
    const rawLivraison = parseFloat(document.getElementById('opt-livraison')?.value);
    const rawRecuperation = parseFloat(document.getElementById('opt-recuperation')?.value);
    const optLivraison = isNaN(rawLivraison) ? 15000 : rawLivraison;
    const optRecuperation = isNaN(rawRecuperation) ? 15000 : rawRecuperation;

    const refClient = genererRefClient(nom, prenom);
    const refFacture = genererRefFacture();
    const prixTotalTxt = document.getElementById('recap-total').innerText;

    try {
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
            paiement_montant_declare: 0,
            montant_total: parseFloat(prixTotalTxt.replace(/[^0-9]/g, '')),
            statut: 'en_attente'
        }]);

        if (error) throw error;

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
*Option Chauffeur :* ${optChauffeur ? 'Oui' : 'Non'}
*Frais Livraison :* ${optLivraison} Ar
*Frais Récupération :* ${optRecuperation} Ar

*PRIX TOTAL ESTIMÉ :* ${prixTotalTxt}
----------------------------------
_Réservation enregistrée sur le site web_`;

        const waUrl = `https://wa.me/${NUMERO_WHATSAPP_ADMIN}?text=${encodeURIComponent(msgWA)}`;
        
        closeModal('modal-reservation');
        window.open(waUrl, '_blank');

    } catch (err) {
        alert("Erreur lors de la réservation : " + err.message);
    }
}

window.ouvrirModalReservation = ouvrirModalReservation;
window.calculerTarifEtVerifierDispo = calculerTarifEtVerifierDispo;
window.soumettreReservationEtWhatsapp = soumettreReservationEtWhatsapp;
