document.addEventListener('DOMContentLoaded', () => {
    afficherEngagements();
});

function afficherEngagements() {
    const container = document.getElementById('features-container');
    if (!container) return;

    const engagements = [
        { emoji: "👨‍👩‍👧‍👦", title: "Famille", text: "Des véhicules spacieux pour le confort de toute votre famille." },
        { emoji: "💼", title: "Affaires", text: "Berlines élégantes et discrètes pour vos rendez-vous professionnels." },
        { emoji: "🌴", title: "Évasion", text: "4x4 robustes prêts à affronter toutes les routes de Madagascar." },
        { emoji: "↔️", title: "Flexibilité", text: "Horaires adaptés, options modulables et service sur mesure." }
    ];

    container.innerHTML = engagements.map(feat => `
        <div class="flip-card" onclick="this.classList.toggle('flipped')">
            <div class="flip-card-inner">
                <div class="flip-card-front">
                    <span class="feature-emoji">${feat.emoji}</span>
                    <h3>${feat.title}</h3>
                    <small>(Cliquez pour détails)</small>
                </div>
                <div class="flip-card-back">
                    <p>${feat.text}</p>
                </div>
            </div>
        </div>
    `).join('');
}
