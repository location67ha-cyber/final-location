// ==========================================
// CONFIGURATION SUPABASE
// ==========================================
// Remarque : Pas de slash '/' à la fin de l'URL !
const SUPABASE_URL = 'https://xxlehrxxrcuismlcnwhh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4bGVocnh4cmN1aXNtbGNud2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMzQ1NjcsImV4cCI6MjA1NjgxMDU2N30.Exemple_remplacer_par_votre_cle_exacte';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let siteConfig = null;

// ==========================================
// CHARGEMENT DE LA CONFIGURATION DU SITE
// ==========================================
async function loadSiteConfig() {
  if (siteConfig) return siteConfig;
  try {
    const resp = await fetch('site_config.json');
    if (!resp.ok) throw new Error('Impossible de charger site_config.json');
    siteConfig = await resp.json();
    return siteConfig;
  } catch (err) {
    console.error("Erreur lors du chargement de la config:", err);
    return null;
  }
}

// ==========================================
// INJECTION AUTOMATIQUE DE LA CONFIG SUR LA PAGE
// ==========================================
async function renderSiteConfig() {
  const config = await loadSiteConfig();
  if (!config) return;

  // 1. Affichage du NIF et STAT dans le footer
  const footerInfo = document.querySelector('footer p') || document.getElementById('footer-nif-stat');
  if (footerInfo && config.footer) {
    footerInfo.textContent = `NIF: ${config.footer.nif} | STAT: ${config.footer.stat}`;
  }

  // 2. Mise à jour du logo si l'élément existe
  const logoImg = document.getElementById('site-logo');
  if (logoImg && config.header && config.header.logoUrl) {
    logoImg.src = config.header.logoUrl;
  }

  // 3. Mise à jour du téléphone/contact si l'élément existe
  const phoneElem = document.getElementById('contact-phone');
  if (phoneElem && config.contact) {
    phoneElem.textContent = config.contact.phoneDisplay;
    phoneElem.href = `tel:${config.contact.phoneCall}`;
  }
}

// Lancer le chargement dès que la page HTML est prête
document.addEventListener('DOMContentLoaded', renderSiteConfig);
