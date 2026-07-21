let voituresCache = [];
let calendar = null;
let voitureSelectionnee = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadSiteConfig();
        await chargerVoitures();
    } catch (e) {
        console.error("Erreur d'initialisation:", e);
    }
});

async function chargerVoitures() {
    const container = document.getElementById('container-voitures');
    container.innerHTML = '<p>Chargement du catalogue...</p>';

    const { data, error } = await sb.from('voitures').select('*').eq('est_public', true);
    if (error) {
        container.innerHTML = `<p>Erreur: ${error.message}</p>`;
        return;
    }
    voituresCache = data || [];
    renderModeles(voituresCache);
}

function renderModeles(voitures) {
    const container = document.getElementById('container-voitures');
    const modeles = voitures.reduce((acc, voiture) => {
        const modeleKey = `${voiture.marque} ${voiture.modele}`;
        if (!acc[modeleKey]) {
            acc[modeleKey] = {
                voitures: [],
                prixMin: Infinity,
                image: voiture.image_url,
                description: voiture.description
            };
        }
        acc[modeleKey].voitures.push(voiture);
        const prix = voiture.prix_12h_sans_chauffeur || voiture.prix_12h_avec_chauffeur || Infinity;
        if (prix < acc[modeleKey].prixMin) {
            acc[modeleKey].prixMin = prix;
        }
        return acc;
    }, {});

    if (Object.keys(modeles).length === 0) {
        container.innerHTML = '<p>Aucun véhicule disponible.</p>';
        return;
    }

    container.innerHTML = Object.entries(modeles).map(([nomModele, data]) => `
        <article class="carte-voiture">
            <img src="${data.image || 'https://placehold.co/800x500'}" alt="${nomModele}">
            <div class="carte-body">
                <h3>${nomModele}</h3>
                <p class="carte-desc">${data.description || ''}</p>
                <p class="prix">À partir de ${formatPrix(data.prixMin)} Ar <small>/ 12h</small></p>
                <button class="btn-hero" onclick="afficherChoixSpecifiques('${nomModele.replace(/'/g, "\\'")}')">Choisir ce modèle</button>
            </div>
        </article>
    `).join('');
}

function afficherChoixSpecifiques(modeleKey) {
    const voituresDuModele = voituresCache.filter(v => `${v.marque} ${v.modele}` === modeleKey);
    const modalBody = document.getElementById('modal-choix-body');
    setText('modal-choix-titre', `Choisir un ${modeleKey}`);

    modalBody.innerHTML = voituresDuModele.map(v => {
        let prixHtml = '';
        switch (v.modele_chauffeur) {
            case 'mixte':
                prixHtml = `
                    <button onclick="ouvrirReservation(${v.id}, 'sans')">Sans Chauffeur: ${formatPrix(v.prix_12h_sans_chauffeur)} Ar</button>
                    <button onclick="ouvrirReservation(${v.id}, 'avec')">Avec Chauffeur: ${formatPrix(v.prix_12h_avec_chauffeur)} Ar</button>`;
                break;
            case 'sans_chauffeur_special':
                prixHtml = `<button onclick="ouvrirReservation(${v.id}, 'sans')">Sans Chauffeur: ${formatPrix(v.prix_12h_sans_chauffeur)} Ar</button>`;
                break;
            case 'avec_chauffeur_inclus':
                prixHtml = `<button onclick="ouvrirReservation(${v.id}, 'avec')">Avec Chauffeur: ${formatPrix(v.prix_12h_avec_chauffeur)} Ar</button>`;
                break;
        }
        return `
            <div class="choix-specifique-item">
                <h4>${v.marque} ${v.modele} (${v.immatriculation})</h4>
                <div class="choix-actions">${prixHtml}</div>
            </div>
        `;
    }).join('');

    toggleModal('modal-choix-specifique', true);
}

function ouvrirReservation(voitureId, typeChauffeur) {
    voitureSelectionnee = voituresCache.find(v => v.id === voitureId);
    if (!voitureSelectionnee) return;

    voitureSelectionnee.choix_chauffeur = typeChauffeur;
    closeModal('modal-choix-specifique');

    setText('nom-voiture-selectionnee', `${voitureSelectionnee.marque} ${voitureSelectionnee.modele}`);
    document.getElementById('reservation-section').style.display = 'block';
    document.getElementById('reservation-section').scrollIntoView({ behavior: 'smooth' });

    const optChauffeurContainer = document.getElementById('option-chauffeur-container');
    if (voitureSelectionnee.modele_chauffeur === 'sans_chauffeur_special') {
        optChauffeurContainer.style.display = 'block';
        setText('label-opt-chauffeur', `Ajouter un chauffeur (+${formatPrix(voitureSelectionnee.prix_option_chauffeur)} Ar/j)`);
    } else {
        optChauffeurContainer.style.display = 'none';
    }

    initCalendar(voitureId);
    calculerPrix();
}

async function initCalendar(voitureId) {
    if (calendar) calendar.destroy();
    const { data: resas } = await sb.from('reservations').select('date_debut, date_fin, statut').eq('id_voiture', voitureId).neq('statut', 'annulee');
    
    const events = (resas || []).map(r => {
        let color = '#cccccc'; // en_attente
        if (r.statut === 'acompte_paye') color = '#f39c12'; // orange
        if (r.statut === 'valide') color = '#e74c3c'; // rouge
        return { start: r.date_debut, end: r.date_fin, display: 'background', color };
    });

    const calendarEl = document.getElementById('calendrier-dispo');
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'fr',
        events,
        dateClick: (info) => {
            const dDebut = document.getElementById('date-debut');
            const dFin = document.getElementById('date-fin');
            if (!dDebut.value || (dDebut.value && dFin.value)) {
                dDebut.value = info.dateStr;
                dFin.value = '';
            } else {
                if (new Date(info.dateStr) < new Date(dDebut.value)) dDebut.value = info.dateStr;
                else dFin.value = info.dateStr;
            }
            calculerPrix();
        }
    });
    calendar.render();
}

function calculerPrix() {
    if (!voitureSelectionnee) return;

    const d1 = new Date(document.getElementById('date-debut').value + 'T' + document.getElementById('heure-depart').value);
    const d2 = new Date(document.getElementById('date-fin').value + 'T' + document.getElementById('heure-retour').value);

    if (isNaN(d1) || isNaN(d2) || d2 <= d1) {
        setText('prix-total', '0');
        setText('prix-acompte', '0');
        return;
    }

    const dureeMs = d2 - d1;
    const dureeHeures = dureeMs / (1000 * 60 * 60);
    const nbJours = Math.ceil(dureeHeures / 24);

    let prixBase = 0;
    let choixChauffeur = voitureSelectionnee.choix_chauffeur;
    if (voitureSelectionnee.modele_chauffeur === 'sans_chauffeur_special' && document.getElementById('opt-chauffeur').checked) {
        choixChauffeur = 'avec';
    }

    if (nbJours > 2) {
        const prix12h = (choixChauffeur === 'avec') ? voitureSelectionnee.prix_12h_avec_chauffeur : voitureSelectionnee.prix_12h_sans_chauffeur;
        prixBase = prix12h * nbJours;
    } else if (dureeHeures <= 12) {
        prixBase = (choixChauffeur === 'avec') ? voitureSelectionnee.prix_12h_avec_chauffeur : voitureSelectionnee.prix_12h_sans_chauffeur;
    } else {
        prixBase = (choixChauffeur === 'avec') ? voitureSelectionnee.prix_24h_avec_chauffeur : voitureSelectionnee.prix_24h_sans_chauffeur;
    }
    
    if (voitureSelectionnee.modele_chauffeur === 'sans_chauffeur_special' && document.getElementById('opt-chauffeur').checked) {
        prixBase += (voitureSelectionnee.prix_option_chauffeur || 0) * nbJours;
    }

    let total = prixBase;
    if (document.getElementById('opt-livraison').checked) total += siteConfig?.cout_livraison || 15000;
    if (document.getElementById('opt-recuperation').checked) total += siteConfig?.cout_recuperation || 15000;

    setText('prix-total', formatPrix(total));
    setText('prix-acompte', formatPrix(Math.round(total / 2)));
}

async function lancerReservationWhatsApp() {
    if (!document.getElementById('check-conditions-step1').checked) {
        alert("Veuillez accepter les conditions générales.");
        return;
    }

    const payload = {
        id_voiture: voitureSelectionnee.id,
        date_debut: document.getElementById('date-debut').value,
        date_fin: document.getElementById('date-fin').value,
        nom: document.getElementById('loueur-nom').value.trim(),
        tel: document.getElementById('loueur-tel').value.trim(),
        adresse: document.getElementById('loueur-adresse').value.trim(),
        cin_passeport: document.getElementById('loueur-cin').value.trim(),
        montant_total: parseInt(document.getElementById('prix-total').innerText.replace(/\s/g, '')),
        statut: 'en_attente'
    };

    if (!payload.nom || !payload.tel || !payload.date_debut || !payload.date_fin) {
        alert("Veuillez remplir toutes les informations.");
        return;
    }

    const waNumber = siteConfig?.contact?.whatsapp?.replace(/\D/g, '');
    const message = `Bonjour, je souhaite pré-réserver :\n- Voiture: ${voitureSelectionnee.marque} ${voitureSelectionnee.modele}\n- Du: ${payload.date_debut} au ${payload.date_fin}\n- Client: ${payload.nom}\n- Montant total: ${formatPrix(payload.montant_total)} Ar`;
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`, '_blank');

    await sb.from('clients').upsert({ nom: payload.nom, tel: payload.tel, adresse: payload.adresse, cin_passeport: payload.cin_passeport }, { onConflict: 'tel' });
    await sb.from('reservations').insert([payload]);
    
    alert("Votre demande de pré-réservation a été envoyée. Nous vous contacterons sous peu.");
    document.getElementById('reservation-section').style.display = 'none';
}
