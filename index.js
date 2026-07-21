document.addEventListener('DOMContentLoaded', async () => {
    try {
        const config = await loadSiteConfig();
        if (config) {
            applySiteConfig(config);
        }
    } catch (error) {
        console.error("Initialisation de la page d'accueil impossible :", error);
    }
});

function applySiteConfig(config) {
    // Header
    setText('header-site-name', config.header?.siteName);
    setAttr('header-logo', 'src', config.header?.logoUrl);
    
    // Footer
    setText('footer-title', config.header?.siteName);
    setText('footer-address', config.footer?.address);
    setText('footer-phone', config.contact?.phoneDisplay);
    setText('footer-nif', config.footer?.nif);
    setText('footer-stat', config.footer?.stat);

    // Socials
    const socialsContainer = document.getElementById('footer-socials');
    if (socialsContainer && config.footer?.socials) {
        const icons = { facebook: 'fab fa-facebook', instagram: 'fab fa-instagram', tiktok: 'fab fa-tiktok' };
        socialsContainer.innerHTML = Object.entries(config.footer.socials)
            .filter(([, url]) => url && url !== '#')
            .map(([network, url]) => `
                <a href="${url}" target="_blank" rel="noopener" style="color:white;margin:0 8px;font-size:1.3rem;">
                    <i class="${icons[network] || 'fas fa-globe'}"></i>
                </a>
            `).join('');
    }

    // Features
    const featuresContainer = document.getElementById('features-container');
    if (featuresContainer && config.features) {
        featuresContainer.innerHTML = config.features.map(feat => `
            <div class="flip-card" onclick="this.classList.toggle('flipped')">
                <div class="flip-card-inner">
                    <div class="flip-card-front">
                        <span class="feature-emoji">${feat.emoji}</span>
                        <h3>${feat.title}</h3>
                        <small>(Cliquez ici)</small>
                    </div>
                    <div class="flip-card-back">
                        <p>${feat.text}</p>
                    </div>
                </div>
            </div>
        `).join('');
    }
}
