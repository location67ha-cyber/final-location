document.addEventListener('DOMContentLoaded', async () => {
    await chargerEngagements();
});

async function chargerEngagements() {
    const container = document.getElementById('features-container');
    if (!container) return;

    let engagements = [
        { emoji: "👨‍👩‍👧‍👦", title: "Famille", text: "Des véhicules spacieux pour le confort de toute votre famille." },
        { emoji: "💼", title: "Affaires", text: "Berlines élégantes et discrètes pour vos rendez-vous professionnels." },
        { emoji: "🌴", title: "Évasion", text: "4x4 robustes prêts à affronter toutes les routes de Madagascar." },
        { emoji: "↔️", title: "Flexibilité", text: "Horaires adaptés, options modulables et service sur mesure." }
    ];

    try {
        const res = await fetch('siteConfig.json');
        if (res.ok) {
            const config = await res.json();
            if (config.features && config.features.length) {
                engagements = config.features;
            }
        }
    } catch (e) {
        console.log("Utilisation des engagements par défaut.");
    }

    container.innerHTML = engagements.map(feat => `
        <div class="flip-card" onclick="this.classList.toggle('flipped')">
            <div class="flip-card-inner">
                <div class="flip-card-front">
                    <span class="feature-emoji">${feat.emoji}</span>
                    <h3>${feat.title}</h3>
                    <small style="color: #94a3b8; margin-top: 5px;">(Cliquez pour détails)</small>
                </div>
                <div class="flip-card-back">
                    <p>${feat.text}</p>
                </div>
            </div>
        </div>
    `).join('');
}
