let clientsCache = [];
let reservationsCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await Promise.all([loadClients(), loadAllReservations()]);
    renderClients();
    document.getElementById('search-client').addEventListener('input', renderClients);
});

async function loadClients() {
    const { data } = await sb.from('clients').select('*').order('nom');
    clientsCache = data || [];
}

async function loadAllReservations() {
    const { data } = await sb.from('reservations').select('*, voitures(marque, modele)');
    reservationsCache = data || [];
}

function renderClients() {
    const searchTerm = document.getElementById('search-client').value.toLowerCase();
    const filteredClients = clientsCache.filter(c => c.nom.toLowerCase().includes(searchTerm) || c.tel?.includes(searchTerm));
    const tbody = document.getElementById('clients-body');

    tbody.innerHTML = filteredClients.length ? filteredClients.map(client => {
        const clientReservations = reservationsCache.filter(r => r.tel === client.tel);
        const totalDepense = clientReservations.reduce((sum, r) => sum + (r.paiement_montant_declare || 0), 0);
        return `
            <tr>
                <td>${client.nom}</td>
                <td>${client.tel || '-'}</td>
                <td>${clientReservations.length}</td>
                <td><strong>${formatPrix(totalDepense)} Ar</strong></td>
                <td><button class="btn-small" onclick="showClientHistory('${client.tel}')"><i class="fas fa-history"></i> Historique</button></td>
            </tr>
        `;
    }).join('') : '<tr><td colspan="5">Aucun client trouvé.</td></tr>';
}

function showClientHistory(tel) {
    const client = clientsCache.find(c => c.tel === tel);
    if (!client) return;

    setText('client-history-name', client.nom);
    const clientReservations = reservationsCache.filter(r => r.tel === tel).sort((a, b) => new Date(b.date_debut) - new Date(a.date_debut));
    const totalDepense = clientReservations.reduce((sum, r) => sum + (r.paiement_montant_declare || 0), 0);
    setText('client-history-total', `${formatPrix(totalDepense)} Ar`);

    const historyList = document.getElementById('client-history-list');
    historyList.innerHTML = clientReservations.length ? clientReservations.map(r => `
        <li class="history-item">
            <div class="hist-date">${new Date(r.date_debut).toLocaleDateString('fr-FR')}</div>
            <div class="hist-details">
                <strong>${r.voitures?.marque || ''} ${r.voitures?.modele || ''}</strong><br>
                <small>Du ${r.date_debut} au ${r.date_fin}</small>
            </div>
            <div class="hist-cout">${formatPrix(r.paiement_montant_declare || 0)} Ar</div>
        </li>
    `).join('') : '<li>Aucune réservation.</li>';

    toggleModal('modal-client-history', true);
}

window.showClientHistory = showClientHistory;
