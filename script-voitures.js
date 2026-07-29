/* ==========================================================================
   SCRIPT GESTION DU CATALOGUE ET DES RESERVATIONS (script-voitures.js)
   ========================================================================== */

let allVoitures = [];

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
        console.error("Erreur de chargement des véhicules :", err);
        grid.innerHTML = `<p style="color: var(--text-sub);">Impossible de charger les véhicules.</p>`;
    }
}

function renderVoitures(voitures) {
    const grid = document.getElementById('grid-voitures-public');
    if (!voitures.length) {
        grid.innerHTML = '<p>Aucun véhicule ne correspond à vos critères.</p>';
        return;
    }

    grid.innerHTML = voitures.map(v => `
        <div class="car-card-pub">
            <img src="${v.image_url || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=500'}" alt="${v.marque} ${v.modele}">
            <div class="car-info">
                <h3>${v.marque} ${v.modele}</h3>
                <div class="car-tags">
                    <span><i class="fas fa-users"></i> ${v.places || 5} places</span>
                    <span><i class="fas fa-cog"></i> ${v.transmission || 'Manuelle'}</span>
                    <span><i class="fas fa-gas-pump"></i> ${v.carburant || 'Essence'}</span>
                </div>
                <p class="car-price">${formatPrix(v.prix_24h_sans_chauffeur || v.prix_24h_avec_chauffeur || 150000)} / jour</p>
                <button class="btn-primary" onclick="openReservationModal(${v.id})">Réserver</button>
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

    openModal('modal-reservation');
}

async function soumettreReservation(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-submit-resa');
    btn.disabled = true;
    btn.textContent = "Traitement...";

    const carId = parseInt(document.getElementById('resa-car-id').value);
    const nom = document.getElementById('resa-nom').value.trim();
    const prenom = document.getElementById('resa-prenom').value.trim();
    const tel = document.getElementById('resa-tel').value.trim();
    const email = document.getElementById('resa-email').value.trim();
    const dateDebut = document.getElementById('resa-date-debut').value;
    const dateFin = document.getElementById('resa-date-fin').value;

    // Generer les références personnalisées
    const refClient = genererRefClient(nom, prenom);
    const refFacture = genererRefFacture(Math.floor(Math.random() * 900) + 100);

    try {
        // 1. Sauvegarde client avec ref_client
        await sb.from('clients').upsert([{
            ref_client: refClient,
            nom: `${nom} ${prenom}`,
            tel: tel,
            email: email
        }], { onConflict: 'tel' });

        // 2. Création réservation avec ref_facture
        const { error } = await sb.from('reservations').insert([{
            ref_facture: refFacture,
            id_voiture: carId,
            nom: `${nom} ${prenom}`,
            tel: tel,
            date_debut: dateDebut,
            date_fin: dateFin,
            statut: 'en_attente'
        }]);

        if (error) throw error;

        alert(`Réservation enregistrée !\n\nRéférence Facture : ${refFacture}\nRéférence Client : ${refClient}`);
        closeModal('modal-reservation');
    } catch (err) {
        alert("Erreur lors de l'enregistrement : " + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "Confirmer la réservation";
    }
}
