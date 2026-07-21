let voituresCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadCarDashboard();
});

async function loadCarDashboard() {
    const container = document.getElementById('grid-voitures');
    container.innerHTML = '<p>Analyse des données en cours...</p>';

    const { data, error } = await sb.from('voitures').select('*').order('id');
    if (error) {
        container.innerHTML = `<p>Erreur: ${error.message}</p>`;
        return;
    }
    voituresCache = data || [];

    if (voituresCache.length === 0) {
        container.innerHTML = '<p>Aucun véhicule enregistré.</p>';
        return;
    }

    container.innerHTML = voituresCache.map(v => `
        <div class="car-card">
            <div class="card-header">
                <strong>${v.marque} ${v.modele}</strong>
                <label class="switch" title="Afficher/Masquer sur le site public">
                    <input type="checkbox" ${v.est_public ? 'checked' : ''} onchange="toggleCarVisibility(${v.id}, this.checked)">
                    <span class="slider"></span>
                </label>
            </div>
            <p>Immat: ${v.immatriculation || 'N/A'}</p>
            <div class="card-actions">
                <button class="btn-action-card" onclick="openCarModal(${v.id})">Modifier</button>
            </div>
        </div>
    `).join('');
}

function openCarModal(carId = null) {
    const form = document.getElementById('car-form');
    form.reset();
    setText('car-feedback', '');
    document.getElementById('car-id').value = carId || '';

    if (carId) {
        const car = voituresCache.find(v => v.id === carId);
        if (car) {
            setText('car-modal-title', 'Modifier le véhicule');
            ['marque', 'modele', 'immatriculation', 'places', 'transmission', 'carburant', 'modele_chauffeur', 'image_url', 'description'].forEach(field => {
                const el = document.getElementById(`car-${field}`);
                if (el) el.value = car[field] || '';
            });
            ['prix_12h_sans_chauffeur', 'prix_24h_sans_chauffeur', 'prix_12h_avec_chauffeur', 'prix_24h_avec_chauffeur', 'prix_option_chauffeur'].forEach(field => {
                const el = document.getElementById(`car-${field.replace(/_/g, '-')}`);
                if (el) el.value = car[field] || '';
            });
            document.getElementById('car-disponible-province').checked = car.disponible_province;
        }
    } else {
        setText('car-modal-title', 'Ajouter un véhicule');
    }
    toggleModal('car-modal', true);
}

async function submitCar(event) {
    event.preventDefault();
    setText('car-feedback', 'Enregistrement...');

    const carId = document.getElementById('car-id').value;
    const payload = {
        marque: document.getElementById('car-marque').value,
        modele: document.getElementById('car-modele').value,
        immatriculation: document.getElementById('car-immatriculation').value,
        places: parseInt(document.getElementById('car-places').value),
        transmission: document.getElementById('car-transmission').value,
        carburant: document.getElementById('car-carburant').value,
        modele_chauffeur: document.getElementById('car-modele-chauffeur').value,
        prix_12h_sans_chauffeur: parseInt(document.getElementById('car-prix-12h-sans-chauffeur').value) || null,
        prix_24h_sans_chauffeur: parseInt(document.getElementById('car-prix-24h-sans-chauffeur').value) || null,
        prix_12h_avec_chauffeur: parseInt(document.getElementById('car-prix-12h-avec-chauffeur').value) || null,
        prix_24h_avec_chauffeur: parseInt(document.getElementById('car-prix-24h-avec-chauffeur').value) || null,
        prix_option_chauffeur: parseInt(document.getElementById('car-prix-option-chauffeur').value) || null,
        image_url: document.getElementById('car-image-url').value,
        description: document.getElementById('car-description').value,
        disponible_province: document.getElementById('car-disponible-province').checked,
    };

    const { error } = carId
        ? await sb.from('voitures').update(payload).eq('id', carId)
        : await sb.from('voitures').insert([payload]);

    if (error) {
        setText('car-feedback', `Erreur: ${error.message}`);
    } else {
        setText('car-feedback', 'Succès !');
        await loadCarDashboard();
        setTimeout(() => closeModal('car-modal'), 1000);
    }
}

async function toggleCarVisibility(carId, isVisible) {
    await sb.from('voitures').update({ est_public: isVisible }).eq('id', carId);
}

window.openCarModal = openCarModal;
window.submitCar = submitCar;
window.toggleCarVisibility = toggleCarVisibility;
