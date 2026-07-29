/* ==========================================================================
   SCRIPT ESPACE ADMINISTRATION (script-admin.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
    // Chargement simultané de tous les modules
    await chargerToutesLesDonneesAdmin();
});

async function chargerToutesLesDonneesAdmin() {
    await Promise.all([
        chargerVoituresAdmin(),
        chargerReservationsAdmin(),
        chargerClientsAdmin(),
        chargerMaintenanceAdmin()
    ]);
}

/* --------------------------------------------------------------------------
   1. CHARGEMENT DES VOITURES
   -------------------------------------------------------------------------- */
async function chargerVoituresAdmin() {
    const tbody = document.getElementById('tbody-voitures');
    if (!tbody) return;

    try {
        const { data, error } = await sb.from('voitures').select('*');
        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-sub);">Aucune voiture dans la base.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(v => `
            <tr>
                <td><strong>${v.marque || ''} ${v.modele || ''}</strong></td>
                <td>${v.immatriculation || 'Non renseignée'}</td>
                <td>${v.places || 5} places</td>
                <td>${formatPrix(v.prix_24h_sans_chauffeur || v.prix_24h_avec_chauffeur || 0)}</td>
                <td>
                    <span class="badge ${v.disponible !== false ? 'badge-success' : 'badge-danger'}">
                        ${v.disponible !== false ? 'Disponible' : 'Occupé'}
                    </span>
                </td>
                <td>
                    <button class="btn-sm" onclick="supprimerVoiture(${v.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error("Erreur Voitures Admin:", err);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: #ef4444;">Erreur : ${err.message}</td></tr>`;
    }
}

/* --------------------------------------------------------------------------
   2. CHARGEMENT DES RÉSERVATIONS
   -------------------------------------------------------------------------- */
async function chargerReservationsAdmin() {
    const tbody = document.getElementById('tbody-reservations');
    if (!tbody) return;

    try {
        const { data, error } = await sb.from('reservations').select('*, voitures(marque, modele)');
        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-sub);">Aucune réservation trouvée.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(r => `
            <tr>
                <td><code>${r.ref_facture || 'N/A'}</code></td>
                <td><strong>${r.nom || 'Client'}</strong><br><small>${r.tel || ''}</small></td>
                <td>${r.voitures ? `${r.voitures.marque} ${r.voitures.modele}` : 'Véhicule #' + r.id_voiture}</td>
                <td>Du ${r.date_debut || '-'} au ${r.date_fin || '-'}</td>
                <td><span class="badge badge-info">${r.statut || 'En attente'}</span></td>
                <td>
                    <button class="btn-sm" onclick="imprimerFacture('${r.ref_facture}')"><i class="fas fa-file-pdf"></i> PDF</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error("Erreur Réservations Admin:", err);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: #ef4444;">Erreur : ${err.message}</td></tr>`;
    }
}

/* --------------------------------------------------------------------------
   3. CHARGEMENT DES CLIENTS
   -------------------------------------------------------------------------- */
async function chargerClientsAdmin() {
    const tbody = document.getElementById('tbody-clients');
    if (!tbody) return;

    try {
        const { data, error } = await sb.from('clients').select('*');
        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-sub);">Aucun client enregistré.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(c => `
            <tr>
                <td><code>${c.ref_client || 'N/A'}</code></td>
                <td><strong>${c.nom || ''}</strong></td>
                <td>${c.tel || 'N/A'}</td>
                <td>${c.email || 'N/A'}</td>
                <td>${c.cin_ou_passeport || 'Non fourni'}</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error("Erreur Clients Admin:", err);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: #ef4444;">Erreur : ${err.message}</td></tr>`;
    }
}

/* --------------------------------------------------------------------------
   4. CHARGEMENT DE LA MAINTENANCE
   -------------------------------------------------------------------------- */
async function chargerMaintenanceAdmin() {
    const tbody = document.getElementById('tbody-maintenance');
    if (!tbody) return;

    try {
        const { data, error } = await sb.from('maintenances').select('*, voitures(marque, modele)');
        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-sub);">Aucune fiche de maintenance.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(m => `
            <tr>
                <td>${m.voitures ? `${m.voitures.marque} ${m.voitures.modele}` : 'Véhicule #' + m.id_voiture}</td>
                <td>${m.type_entretien || 'Entretien général'}</td>
                <td>${m.date_entretien || '-'}</td>
                <td>${formatPrix(m.cout || 0)}</td>
                <td>${m.remarques || '-'}</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error("Erreur Maintenance Admin:", err);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: #ef4444;">Erreur : ${err.message}</td></tr>`;
    }
}
