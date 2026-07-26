// Site mariage Juliette & Dimitri — JS vanilla
// 1. Compte à rebours J-XXX jusqu'au 14 juillet 2027 (hero).
// 2. Nav : lien actif via IntersectionObserver + menu burger < 640px.
// 3. Formulaire RSVP : logique conditionnelle, honeypot, validation, envoi fetch, confirmation, erreurs.
// Le scroll doux vers #rsvp est natif (ancres + scroll-behavior CSS).

document.addEventListener('DOMContentLoaded', () => {
  initCountdown();
  initNav();
  initRsvp();
});

// ─── 1. Compte à rebours ──────────────────────────────────────────
function initCountdown() {
  const target = document.getElementById('countdown-days');
  if (!target) return;

  const wedding = new Date(2027, 6, 14); // 14 juillet 2027 (mois 0-indexé)
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.max(0, Math.round((wedding - startOfToday) / msPerDay));

  target.textContent = days;
}

// ─── 2. Navigation : burger + lien actif ──────────────────────────
function initNav() {
  const burger = document.querySelector('.nav__burger');
  const menu = document.getElementById('nav-menu');
  const links = Array.from(document.querySelectorAll('.nav__link'));

  // Menu burger (< 640px)
  if (burger && menu) {
    const closeMenu = () => {
      menu.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Ouvrir le menu');
    };
    burger.addEventListener('click', () => {
      const open = menu.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    });
    // Fermer au clic sur un lien (mobile)
    links.forEach((link) => link.addEventListener('click', closeMenu));
  }

  // État actif via IntersectionObserver
  const sections = Array.from(document.querySelectorAll('main section[id]'));
  if (!sections.length) return;

  const linkById = new Map();
  links.forEach((link) => {
    const id = link.getAttribute('href')?.replace('#', '');
    if (id) linkById.set(id, link);
  });

  const setActive = (id) => {
    linkById.forEach((link, key) => link.classList.toggle('is-active', key === id));
  };

  // On mémorise le ratio de visibilité de chaque section et on recalcule à chaque
  // callback la section dominante — évite tout état actif « périmé ».
  const ratios = new Map();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((e) => ratios.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0));
    let bestId = null;
    let best = 0;
    ratios.forEach((ratio, id) => { if (ratio > best) { best = ratio; bestId = id; } });
    if (bestId) setActive(bestId);
  }, {
    rootMargin: '-64px 0px -45% 0px', // -64px = hauteur nav ; bas resserré pour privilégier la section haute
    threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
  });

  sections.forEach((section) => observer.observe(section));
}

// ─── 3. Formulaire RSVP ───────────────────────────────────────────
function initRsvp() {
  const form = document.getElementById('rsvp-form');
  if (!form) return;

  const logistics = document.getElementById('rsvp-logistics');
  const emailInput = document.getElementById('rsvp-email');
  const emailReq = document.getElementById('rsvp-email-req');
  const babies = document.getElementById('rsvp-babies');
  const cribsField = document.getElementById('rsvp-cribs-field');
  const cribs = document.getElementById('rsvp-cribs');
  const errorBox = document.getElementById('rsvp-error');
  const success = document.getElementById('rsvp-success');
  const successName = document.getElementById('rsvp-success-name');
  const honeypot = form.querySelector('[name="_gotcha"]');
  const submitBtn = form.querySelector('.rsvp__submit');

  // Champs logistiques obligatoires — uniquement sur la branche « Oui ».
  // Aucun required n'est écrit en dur dans le HTML pour ces champs : il est posé
  // et retiré ici, sinon un envoi « Non » serait bloqué par des champs invisibles.
  const adults = document.getElementById('rsvp-adults');
  const arrivalRadios = Array.from(form.querySelectorAll('[name="Arrivée"]'));
  const lodgingRadios = Array.from(form.querySelectorAll('[name="Logement"]'));
  const requiredLogistics = [adults, ...arrivalRadios, ...lodgingRadios].filter(Boolean);
  // Filet de sécurité : tout champ du bloc logistique, y compris ceux ajoutés plus tard
  const allLogisticsFields = Array.from(logistics.querySelectorAll('input, select, textarea'));

  const applyLogisticsRequired = (required) => {
    // On repart toujours de zéro : garantit qu'aucun champ masqué ne reste required
    allLogisticsFields.forEach((el) => { el.required = false; });
    if (required) requiredLogistics.forEach((el) => { el.required = true; });
  };

  // Présence Oui/Non → affichage logistique + email requis
  const presenceRadios = form.querySelectorAll('[name="Présence"]');
  const applyPresence = () => {
    const value = form.querySelector('[name="Présence"]:checked')?.value;
    const attending = value === 'Oui';
    const declining = value === 'Non';

    // Par défaut (rien coché), on garde la logistique visible
    logistics.hidden = declining;
    // Email requis seulement si présent ; optionnel si absent
    emailInput.required = !declining;
    if (emailReq) emailReq.style.display = declining ? 'none' : '';
    // Même convention que l'email : obligatoire tant que l'invité n'a pas répondu « Non ».
    // Les astérisques du bloc logistique disparaissent avec lui (parent [hidden]).
    applyLogisticsRequired(!declining);
  };
  presenceRadios.forEach((r) => r.addEventListener('change', applyPresence));

  // Bébés ≥ 1 → champ lits parapluie (max = nombre de bébés)
  const applyBabies = () => {
    const count = parseInt(babies.value, 10) || 0;
    if (count >= 1) {
      cribsField.hidden = false;
      cribs.max = String(count);
      if ((parseInt(cribs.value, 10) || 0) > count) cribs.value = String(count);
    } else {
      cribsField.hidden = true;
      cribs.value = '0';
      cribs.max = '0';
    }
  };
  babies.addEventListener('input', applyBabies);

  applyPresence();
  applyBabies();

  const showError = (msg) => {
    errorBox.textContent = msg;
    errorBox.hidden = false;
    errorBox.focus?.();
  };
  const clearError = () => { errorBox.hidden = true; errorBox.textContent = ''; };

  // Validation client
  const validate = () => {
    const firstname = form.querySelector('[name="Prénom"]').value.trim();
    const lastname = form.querySelector('[name="Nom"]').value.trim();
    const presence = form.querySelector('[name="Présence"]:checked')?.value;

    if (!firstname) return 'Merci d’indiquer votre prénom.';
    if (!lastname) return 'Merci d’indiquer votre nom.';
    if (!presence) return 'Merci d’indiquer si vous serez présent(e).';

    // Logistique : contrôlée seulement sur la branche « Oui ». Sur « Non » ces champs
    // sont masqués, on ne les regarde pas — un refus ne doit jamais être bloqué.
    // Le formulaire est en novalidate : c'est bien ici que l'obligation est appliquée.
    if (presence === 'Oui') {
      const rawAdults = adults.value.trim();
      if (!rawAdults) return 'Merci d’indiquer le nombre d’adultes (au moins 1).';
      const nbAdults = Number(rawAdults);
      if (!Number.isInteger(nbAdults) || nbAdults < 1) {
        return 'Le nombre d’adultes doit être un nombre entier, au minimum 1.';
      }

      if (!arrivalRadios.some((r) => r.checked)) return 'Merci d’indiquer votre jour d’arrivée.';
      if (!lodgingRadios.some((r) => r.checked)) {
        return 'Merci d’indiquer si vous avez besoin d’un logement sur place.';
      }
    }

    if (emailInput.required) {
      const email = emailInput.value.trim();
      if (!email) return 'Merci d’indiquer un email de contact.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'L’adresse email ne semble pas valide.';
    } else if (emailInput.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim())) {
      return 'L’adresse email ne semble pas valide.';
    }
    return null;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    // Honeypot : si rempli, on simule un succès sans rien envoyer (anti-bot)
    if (honeypot && honeypot.value.trim() !== '') return;

    const problem = validate();
    if (problem) { showError(problem); return; }

    const firstname = form.querySelector('[name="Prénom"]').value.trim();
    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = 'Envoi…';

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form),
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);

      // Succès : on remplace le formulaire par le message de confirmation
      if (successName) successName.textContent = firstname || 'à vous';
      form.hidden = true;
      success.hidden = false;
      success.focus?.();
    } catch (err) {
      // Échec réseau : message clair, données conservées (le formulaire reste rempli)
      showError('L’envoi a échoué (connexion). Vos réponses sont conservées — réessayez dans un instant.');
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
}
