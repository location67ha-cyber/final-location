/* ==========================================================================
   AGRÉGATEUR ADMINISTRATION UNIFIÉ (script-admin.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
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

async function chargerVoituresAdmin() {
    const tbody = document.getElementById('tbody-voitures');
    if (!tbody) return;

    try {
        const { data, error } = await sb.from('voitures').select('*');
        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Aucune voiture dans la base.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(v => `
            <tr>
                <td><strong>${v.marque || ''} ${v.modele || ''}</strong></td>
                <td>${v.immatriculation || 'Non renseignée'}</td>
                <td>${v.places || 5} places</td>
                <td>${formatPrix(v.prix_24h_sans_chauffeur || v.prix_24h_avec_chauffeur || 0)}</td>
                <td>
                    <span class="badge ${v.est_public ? 'valide' : 'annulee'}">
                        ${v.est_public ? 'Publié' : 'Masqué'}
                    </span>
                </td>
                <td>
                    <button class="btn-small" onclick="alert('Modifier voiture ID ${v.id}')"><i class="fas fa-edit"></i> Modifier</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: #ef4444;">Erreur : ${err.message}</td></tr>`;
    }
}

async function chargerReservationsAdmin() {
    const tbody = document.getElementById('tbody-reservations');
    if (!tbody) return;

    try {
        const { data, error } = await sb.from('reservations').select('*, voitures(marque, modele)');
        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Aucune réservation trouvée.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(r => `
            <tr>
                <td><code>${r.ref_facture || '#' + r.id}</code></td>
                <td><strong>${r.nom || 'Client'}</strong><br><small>${r.tel || ''}</small></td>
                <td>${r.voitures ? `${r.voitures.marque} ${r.voitures.modele}` : 'Véhicule #' + r.id_voiture}</td>
                <td>Du ${r.date_debut || '-'} au ${r.date_fin || '-'}</td>
                <td><span class="badge ${r.statut || 'en_attente'}">${r.statut || 'En attente'}</span></td>
                <td>
                    <button class="btn-small" onclick="genererFacturePDF(${r.id})"><i class="fas fa-file-pdf"></i> PDF</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: #ef4444;">Erreur : ${err.message}</td></tr>`;
    }
}

async function chargerClientsAdmin() {
    const tbody = document.getElementById('tbody-clients');
    if (!tbody) return;

    try {
        const { data, error } = await sb.from('clients').select('*');
        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Aucun client enregistré.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(c => `
            <tr>
                <td><code>${c.ref_client || 'N/A'}</code></td>
                <td><strong>${c.nom || ''}</strong></td>
                <td>${c.tel || 'N/A'}</td>
                <td>${c.email || 'N/A'}</td>
                <td>${c.cin_passeport || 'Non fourni'}</td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: #ef4444;">Erreur : ${err.message}</td></tr>`;
    }
}

async function chargerMaintenanceAdmin() {
    const tbody = document.getElementById('tbody-maintenance');
    if (!tbody) return;

    try {
        const { data, error } = await sb.from('maintenances').select('*, voitures(marque, modele)');
        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Aucune fiche de maintenance.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(m => `
            <tr>
                <td>${m.voitures ? `${m.voitures.marque} ${m.voitures.modele}` : 'Véhicule #' + m.id_voiture}</td>
                <td>${m.type_intervention || 'Entretien général'}</td>
                <td>${m.date_prevue || '-'}</td>
                <td>${formatPrix(m.cout_estime || 0)}</td>
                <td>${m.details || '-'}</td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: #ef4444;">Erreur : ${err.message}</td></tr>`;
    }
}

function genererFacturePDF(idResa) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("LOCATION TANA - FACTURE", 20, 20);
    doc.setFontSize(12);
    doc.text(`Identifiant Réservation : #${idResa}`, 20, 35);
    doc.text("Merci pour votre confiance !", 20, 50);
    
    doc.save(`Facture_Reservation_${idResa}.pdf`);
}
