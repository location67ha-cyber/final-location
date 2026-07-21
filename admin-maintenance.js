let interventions = [];
let voituresMap = {};

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadVoitures();
    await loadInterventions();
});

async function loadVoitures() {
    const { data } = await sb.from('voitures').select('id, marque, modele');
    const voitures = data || [];
    voituresMap = Object.fromEntries(voitures.map(v => [v.id, `${v.marque} ${v.modele}`]));
    const select = document.getElementById('maintenance-voiture-select');
    select.innerHTML = voitures.map(v => `<option value="${v.id}">${v.marque} ${v.modele}</option>`).join('');
}

async function loadInterventions() {
    const { data, error } = await sb.from('maintenances').select('*').order('date_prevue', { ascending: false });
    if (error) { alert(error.message); return; }
    interventions = data || [];
    renderInterventions();
}

function renderInterventions() {
    const tbody = document.getElementById('maintenance-body');
    tbody.innerHTML = interventions.length ? interventions.map(m => `
        <tr>
            <td>${voituresMap[m.id_voiture] || 'N/A'}</td>
            <td>${m.type_intervention}</td>
            <td>${m.date_prevue}</td>
            <td><span class="badge ${m.statut}">${m.statut}</span></td>
            <td>${formatPrix(m.cout_estime)} Ar</td>
            <td><button class="btn-small" onclick="deleteMaintenance(${m.id})"><i class="fas fa-trash"></i></button></td>
        </tr>
    `).join('') : '<tr><td colspan="6">Aucune intervention.</td></tr>';
}

function openMaintenanceModal() {
    document.getElementById('maintenance-form').reset();
    toggleModal('maintenance-modal', true);
}

async function saveIntervention(event) {
    event.preventDefault();
    const payload = {
        id_voiture: document.getElementById('maintenance-voiture-select').value,
        type_intervention: document.getElementById('maintenance-type').value,
        date_prevue: document.getElementById('maintenance-date').value,
        cout_estime: parseInt(document.getElementById('maintenance-cost').value) || null,
        statut: document.getElementById('maintenance-state').value,
        details: document.getElementById('maintenance-notes').value,
    };
    await sb.from('maintenances').insert([payload]);
    closeModal('maintenance-modal');
    await loadInterventions();
}

async function deleteMaintenance(id) {
    if (confirm("Supprimer cette intervention ?")) {
        await sb.from('maintenances').delete().eq('id', id);
        await loadInterventions();
    }
}

window.openMaintenanceModal = openMaintenanceModal;
window.saveIntervention = saveIntervention;
window.deleteMaintenance = deleteMaintenance;
