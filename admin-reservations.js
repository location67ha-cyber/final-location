let reservationsCache = [];
let voituresCache = [];
let contratTemplate = null;

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await Promise.all([loadVoitures(), loadReservations(), loadContratTemplate()]);
    document.getElementById('filter-status').addEventListener('change', renderReservations);
    document.getElementById('filter-voiture').addEventListener('change', renderReservations);
    document.getElementById('filter-date').addEventListener('change', renderReservations);
});

async function loadVoitures() {
    const { data } = await sb.from('voitures').select('id, marque, modele').order('marque');
    voituresCache = data || [];
    const select = document.getElementById('filter-voiture');
    voituresCache.forEach(v => select.innerHTML += `<option value="${v.id}">${v.marque} ${v.modele}</option>`);
}

async function loadReservations() {
    const { data, error } = await sb.from('reservations').select('*, voitures(marque, modele, immatriculation)').order('id', { ascending: false });
    if (error) { alert(error.message); return; }
    reservationsCache = data || [];
    renderReservations();
}

async function loadContratTemplate() {
    try {
        const resp = await fetch('contrat_template.json');
        contratTemplate = await resp.json();
    } catch (e) {
        console.error("Erreur chargement contrat_template.json", e);
    }
}

function renderReservations() {
    const status = document.getElementById('filter-status').value;
    const voitureId = document.getElementById('filter-voiture').value;
    const date = document.getElementById('filter-date').value;

    const filtered = reservationsCache.filter(r => 
        (!status || r.statut === status) &&
        (!voitureId || r.id_voiture == voitureId) &&
        (!date || (r.date_debut <= date && r.date_fin >= date))
    );

    const tbody = document.getElementById('reservations-body');
    tbody.innerHTML = filtered.length ? filtered.map(r => {
        const reste = (r.montant_total || 0) - (r.paiement_montant_declare || 0) - (r.remise || 0);
        return `
            <tr>
                <td>#${r.id}<br><span class="badge ${r.statut}">${r.statut.replace('_', ' ')}</span></td>
                <td>${r.nom}<br><small>${r.tel}</small></td>
                <td>${r.voitures?.marque || ''} ${r.voitures?.modele || ''}<br><small>${r.date_debut} au ${r.date_fin}</small></td>
                <td>Total: ${formatPrix(r.montant_total)}<br>Payé: ${formatPrix(r.paiement_montant_declare)}<br><strong>Reste: ${formatPrix(reste)}</strong></td>
                <td>
                    <button class="btn-small" onclick="genererFacturePDF(${r.id})"><i class="fas fa-file-invoice-dollar"></i> Facture</button>
                    <button class="btn-small" onclick="genererContratPDF(${r.id})"><i class="fas fa-file-pdf"></i> Contrat</button>
                    <button class="btn-small" onclick="openEditModal(${r.id})"><i class="fas fa-edit"></i></button>
                </td>
            </tr>
        `;
    }).join('') : '<tr><td colspan="5">Aucune réservation.</td></tr>';
}

function openEditModal(id) {
    const resa = reservationsCache.find(r => r.id === id);
    if (!resa) return;
    document.getElementById('edit-resa-id').value = id;
    setText('edit-resa-client', resa.nom);
    document.getElementById('edit-resa-debut').value = resa.date_debut;
    document.getElementById('edit-resa-fin').value = resa.date_fin;
    document.getElementById('edit-resa-montant').value = resa.montant_total || 0;
    document.getElementById('edit-resa-paye').value = resa.paiement_montant_declare || 0;
    document.getElementById('edit-resa-remise').value = resa.remise || 0;
    document.getElementById('edit-resa-statut').value = resa.statut;
    toggleModal('modal-edit-resa', true);
}

async function sauvegarderModificationResa() {
    const id = document.getElementById('edit-resa-id').value;
    const payload = {
        date_debut: document.getElementById('edit-resa-debut').value,
        date_fin: document.getElementById('edit-resa-fin').value,
        montant_total: parseInt(document.getElementById('edit-resa-montant').value),
        paiement_montant_declare: parseInt(document.getElementById('edit-resa-paye').value),
        remise: parseInt(document.getElementById('edit-resa-remise').value),
        statut: document.getElementById('edit-resa-statut').value
    };
    await sb.from('reservations').update(payload).eq('id', id);
    closeModal('modal-edit-resa');
    await loadReservations();
}

async function genererContratPDF(reservationId) {
    if (!contratTemplate) { alert("Modèle de contrat non chargé."); return; }
    const reservation = reservationsCache.find(r => r.id === reservationId);
    if (!reservation) return;

    const { data: clientData } = await sb.from('clients').select('*').eq('tel', reservation.tel).single();
    const client = clientData || { nom: reservation.nom, tel: reservation.tel, adresse: 'N/A', cin_passeport: 'N/A', permis: 'N/A' };
    const voiture = reservation.voitures || { marque: 'N/A', modele: 'N/A', immatriculation: 'N/A' };

    let texteFinal = contratTemplate.corps
        .replace(/\${client.nom}/g, client.nom)
        .replace(/\${client.adresse}/g, client.adresse)
        .replace(/\${client.tel}/g, client.tel)
        .replace(/\${client.permis}/g, client.permis)
        .replace(/\${client.cin_passeport}/g, client.cin_passeport)
        .replace(/\${voiture.marque}/g, voiture.marque)
        .replace(/\${voiture.modele}/g, voiture.modele)
        .replace(/\${voiture.immatriculation}/g, voiture.immatriculation)
        .replace(/\${reservation.date_debut}/g, new Date(reservation.date_debut).toLocaleDateString('fr-FR'))
        .replace(/\${reservation.date_fin}/g, new Date(reservation.date_fin).toLocaleDateString('fr-FR'))
        .replace(/\${formatPrix\(reservation.paiement_montant_declare\)}/g, formatPrix(reservation.paiement_montant_declare))
        .replace(/\${formatPrix\(reservation.montant_total - reservation.paiement_montant_declare - reservation.remise\)}/g, formatPrix(reservation.montant_total - (reservation.paiement_montant_declare || 0) - (reservation.remise || 0)));

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFontSize(14).setFont('helvetica', 'bold').text(contratTemplate.titre, 105, 15, { align: 'center' });
    doc.setFontSize(10).setFont('helvetica', 'normal');
    const splitText = doc.splitTextToSize(texteFinal, 180);
    doc.text(splitText, 15, 30);
    doc.save(`Contrat-${reservation.id}-${client.nom}.pdf`);
}

async function genererFacturePDF(reservationId) {
    const reservation = reservationsCache.find(r => r.id === reservationId);
    if (!reservation) return;

    const voiture = reservation.voitures || { marque: 'N/A', modele: 'N/A' };
    const { data: clientData } = await sb.from('clients').select('*').eq('tel', reservation.tel).single();
    const client = clientData || { nom: reservation.nom, tel: reservation.tel, adresse: 'N/A', cin_passeport: 'N/A' };

    const duree = Math.ceil((new Date(reservation.date_fin) - new Date(reservation.date_debut)) / (1000 * 60 * 60 * 24)) + 1;
    const totalAPayer = (reservation.montant_total || 0) - (reservation.remise || 0);
    const reste = totalAPayer - (reservation.paiement_montant_declare || 0);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const margin = 15, pageWidth = doc.internal.pageSize.width;
    let y = 20;

    doc.addImage(siteConfig.header.logoUrl, 'PNG', margin, y - 10, 80, 20);
    doc.setFontSize(10).setFont('helvetica', 'bold').text('FACTURE DE LOCATION', pageWidth - margin, y, { align: 'right' });
    doc.setFont('helvetica', 'normal').text('ANDRIANASOLO Volandrato', pageWidth - margin, y + 5, { align: 'right' });
    y += 30;

    doc.setFillColor(142, 68, 173).rect(margin, y, 30, 7, 'F').setTextColor(255).text('Référence ID', margin + 2, y + 5);
    doc.setFillColor(142, 68, 173).rect(margin + 60, y, 30, 7, 'F').text('Date facture', margin + 62, y + 5);
    y += 12;
    doc.setTextColor(0).text(`LOC-${reservation.id}`, margin + 2, y).text(new Date().toLocaleDateString('fr-FR'), margin + 62, y);
    y += 15;

    doc.setFillColor(31, 42, 55).rect(margin, y, 25, 7, 'F').setTextColor(255).text('CLIENT', margin + 2, y + 5);
    y += 10;
    doc.setTextColor(0).text(`Nom: ${client.nom}`, margin, y).text(`Contact: ${client.tel}`, margin, y + 5);

    y += 30;
    doc.setFillColor(142, 68, 173).rect(margin, y, 60, 7, 'F').setTextColor(255).text('Désignation', margin + 2, y + 5);
    doc.rect(margin + 140, y, 40, 7, 'F').text('Montant', margin + 142, y + 5);
    y += 10;
    doc.setTextColor(0).text('Location véhicule', margin + 2, y).text(formatPrix(reservation.montant_total), margin + 142, y);
    y += 7;
    if (reservation.remise > 0) {
        doc.text('Remise', margin + 2, y).text(`- ${formatPrix(reservation.remise)}`, margin + 142, y);
        y += 7;
    }
    doc.line(margin, y, pageWidth - margin, y);
    y += 7;

    doc.setFont('helvetica', 'bold').text('Total à payer', margin + 100, y).text(formatPrix(totalAPayer), margin + 142, y);
    y += 7;
    doc.setFont('helvetica', 'normal').text('Montant payé', margin + 100, y).text(formatPrix(reservation.paiement_montant_declare), margin + 142, y);
    y += 7;
    doc.setFont('helvetica', 'bold').text('Reste', margin + 100, y).text(formatPrix(reste), margin + 142, y);

    doc.save(`Facture-${reservation.id}-${client.nom}.pdf`);
}

window.openEditModal = openEditModal;
window.sauvegarderModificationResa = sauvegarderModificationResa;
window.genererContratPDF = genererContratPDF;
window.genererFacturePDF = genererFacturePDF;
