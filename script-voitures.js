let allVoitures = [];
let maintenancesList = [];
let reservationsList = [];

document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([loadVoituresPublic(), loadMaintenancesAndReservations()]);
});

async function loadVoituresPublic() {
    const { data, error } = await sb.from('voitures').select('*').eq('est_public', true);
    if (error) {
        document.getElementById('grid-voitures-public').innerHTML = '<p>Erreur de chargement des voitures.</p>';
        return;
    }
    allVoitures = data || [];
    renderVoitures(allVoitures);
}

async function loadMaintenancesAndReservations() {
    const [mResp, rResp] = await Promise.all([
        sb.from('maintenances').select('*'),
        sb.from('reservations').select('*').neq('statut', 'annulee')
    ]);
    maintenancesList = mResp.data || [];
    reservationsList = rResp.data || [];
}

function renderVoitures(voitures) {
    const grid = document.getElementById('grid-voitures-public');
    if (!voitures.length) {
        grid.innerHTML = '<p>Aucun véhicule ne correspond à vos critères.</p>';
        return;
    }

    grid.innerHTML = voitures.map(v => `
        <div class="car-card-pub">
            <img src="${v.image_url || 'placeholder.jpg'}" alt="${v.marque} ${v.modele}" class="car-img">
            <div class="car-info">
                <h3>${v.marque} ${v.modele}</h3>
                <div class="car-tags">
                    <span><i class="fas fa-users"></i> ${v.places} places</span>
                    <span><i class="fas fa-cog"></i> ${v.transmission}</span>
                    <span><i class="fas fa-gas-pump"></i> ${v.carburant}</span>
                </div>
                <p class="car-price"><strong>${formatPrix(v.prix_24h_sans_chauffeur || v.prix_24h_avec_chauffeur || 0)} Ar</strong> / jour</p>
                <button class="btn-primary btn-full" onclick="openReservationModal(${v.id})">Réserver</button>
            </div>
        </div>
    `).join('');
}

function filtrerVoitures() {
    const places = document.getElementById('filter-places').value;
    const chauffeur = document.getElementById('filter-chauffeur').value;
    const transmission = document.getElementById('filter-transmission').value;
    const carburant = document.getElementById('filter-carburant').value;

    const res = allVoitures.filter(v => {
        if (places && v.places < parseInt(places)) return false;
        if (chauffeur && v.modele_chauffeur !== chauffeur) return false;
        if (transmission && v.transmission !== transmission) return false;
        if (carburant && v.carburant !== carburant) return false;
        return true;
    });

    renderVoitures(res);
}

function openReservationModal(carId) {
    const car = allVoitures.find(v => v.id === carId);
    if (!car) return;

    document.getElementById('form-reservation').reset();
    document.getElementById('resa-car-id').value = car.id;
    document.getElementById('resa-prix-24h').value = car.prix_24h_sans_chauffeur || car.prix_24h_avec_chauffeur || 0;
    document.getElementById('modal-car-title').textContent = `Réserver : ${car.marque} ${car.modele}`;
    
    // Initialiser les dates par défaut (demain)
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const afterTomorrow = new Date(today); afterTomorrow.setDate(today.getDate() + 2);

    document.getElementById('resa-date-debut').value = tomorrow.toISOString().split('T')[0];
    document.getElementById('resa-date-fin').value = afterTomorrow.toISOString().split('T')[0];

    toggleModePaiement();
    calculerEtVerifierDates();
    toggleModal('modal-reservation', true);
}

function toggleModePaiement() {
    const isAcompte = document.querySelector('input[name="type_reservation"]:checked').value === 'acompte';
    const sectionPaiement = document.getElementById('section-paiement-acompte');
    sectionPaiement.style.display = isAcompte ? 'block' : 'none';
    document.getElementById('resa-montant-acompte').required = isAcompte;
    document.getElementById('resa-ref-mvola').required = isAcompte;
    calculerEtVerifierDates();
}

function calculerEtVerifierDates() {
    const carId = parseInt(document.getElementById('resa-car-id').value);
    const dateDebut = document.getElementById('resa-date-debut').value;
    const heureDebut = document.getElementById('resa-heure-debut').value;
    const dateFin = document.getElementById('resa-date-fin').value;
    const heureFin = document.getElementById('resa-heure-fin').value;
    const prixJour = parseInt(document.getElementById('resa-prix-24h').value);
    const isAcompte = document.querySelector('input[name="type_reservation"]:checked').value === 'acompte';

    const alertContainer = document.getElementById('alert-dates-container');
    const btnSubmit = document.getElementById('btn-submit-resa');
    alertContainer.innerHTML = '';
    btnSubmit.disabled = false;

    if (!dateDebut || !dateFin) return;

    // 1. Vérification Maintenance
    const enMaintenance = maintenancesList.some(m => m.id_voiture === carId && m.date_prevue >= dateDebut && m.date_prevue <= dateFin);
    if (enMaintenance) {
        alertContainer.innerHTML = `<div class="alert-danger">⚠️ Ce véhicule est en <strong>maintenance</strong> sur cette période. Veuillez choisir d'autres dates.</div>`;
        btnSubmit.disabled = true;
        return;
    }

    // 2. Vérification Chevauchement Réservation
    const chevauchement = reservationsList.some(r => r.id_voiture === carId && !(dateFin < r.date_debut || dateDebut > r.date_fin));
    if (chevauchement) {
        const autresDispos = allVoitures.filter(v => v.id !== carId && !reservationsList.some(r => r.id_voiture === v.id && !(dateFin < r.date_debut || dateDebut > r.date_fin)));
        let suggestionHtml = autresDispos.length ? `<br><strong>Autres véhicules disponibles à ces dates :</strong> ` + autresDispos.map(v => `${v.marque} ${v.modele}`).join(', ') : '';
        
        alertContainer.innerHTML = `<div class="alert-warning">⚠️ Ce véhicule est déjà réservé pour ces dates.${suggestionHtml}</div>`;
        btnSubmit.disabled = true;
        return;
    }

    // 3. Récapitulatif
    afficherRecapitulatif('recapitulatif-box', {
        dateDebut, heureDebut, dateFin, heureFin, prixJour, estAcomptePaye: isAcompte
    });
}

async function soumettreReservation(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-submit-resa');
    btn.disabled = true;
    btn.textContent = "Traitement en cours...";

    const carId = parseInt(document.getElementById('resa-car-id').value);
    const dateDebut = document.getElementById('resa-date-debut').value;
    const dateFin = document.getElementById('resa-date-fin').value;
    const typeResa = document.querySelector('input[name="type_reservation"]:checked').value;
    const isAcompte = typeResa === 'acompte';

    const prixJour = parseInt(document.getElementById('resa-prix-24h').value);
    const nbJours = calculerDuree(`${dateDebut}T08:00`, `${dateFin}T18:00`);
    const total = nbJours * prixJour;
    const acompte = isAcompte ? parseInt(document.getElementById('resa-montant-acompte').value) : 0;

    const tel = document.getElementById('resa-tel').value.trim();
    const nom = document.getElementById('resa-nom').value.trim();

    // 1. Sauvegarde/Mise à jour du Client
    await sb.from('clients').upsert([{
        nom: nom,
        email: document.getElementById('resa-email').value.trim(),
        tel: tel,
        whatsapp: document.getElementById('resa-whatsapp').value.trim(),
        cin_passeport: document.getElementById('resa-cin').value.trim(),
        cin_date: document.getElementById('resa-cin-date').value,
        permis: document.getElementById('resa-permis').value.trim(),
        permis_date: document.getElementById('resa-permis-date').value
    }], { onConflict: 'tel' });

    // 2. Création de la réservation
    const { error } = await sb.from('reservations').insert([{
        id_voiture: carId,
        nom: nom,
        tel: tel,
        date_debut: dateDebut,
        date_fin: dateFin,
        montant_total: total,
        paiement_montant_declare: acompte,
        ref_mvola: isAcompte ? document.getElementById('resa-ref-mvola').value.trim() : null,
        statut: isAcompte ? 'acompte_paye' : 'en_attente'
    }]);

    if (error) {
        alert("Erreur lors de la réservation : " + error.message);
        btn.disabled = false;
        btn.textContent = "Confirmer la réservation";
    } else {
        alert(isAcompte 
            ? "Réservation enregistrée ! Votre facture et votre contrat de location vous seront envoyés par Email et WhatsApp." 
            : "Pré-réservation enregistrée ! N'oubliez pas de régler l'acompte pour garantir la disponibilité.");
        closeModal('modal-reservation');
        await loadMaintenancesAndReservations();
    }
}
