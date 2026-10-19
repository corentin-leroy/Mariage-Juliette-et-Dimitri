// Site mariage Juliette & Dimitri — JS vanilla
// 1. Compte à rebours temps réel (jours/heures/minutes/secondes) jusqu'au 14 juillet 2027 (hero).
// 2. Nav : lien actif via IntersectionObserver + menu burger < 980px ($breakpoint-nav).
// 3. Formulaire RSVP : logique conditionnelle, honeypot, validation, envoi fetch, confirmation, erreurs.
// 4. Contact : reconstruction de l'adresse email (absente du HTML) + repli copiable.
// Le scroll doux vers #rsvp est natif (ancres + scroll-behavior CSS).

document.addEventListener('DOMContentLoaded', () => {
  initCountdown();
  initNav();
  initRsvp();
  initContact();
});

// ─── 1. Compte à rebours ──────────────────────────────────────────
function initCountdown() {
  const root = document.getElementById('countdown');
  if (!root) return;

  const units = document.getElementById('countdown-units');
  const finalMsg = document.getElementById('countdown-final');
  const srSummary = document.getElementById('countdown-sr');
  const out = {
    days: document.getElementById('cd-days'),
    hours: document.getElementById('cd-hours'),
    minutes: document.getElementById('cd-minutes'),
    seconds: document.getElementById('cd-seconds'),
  };
  if (!units || !out.days || !out.hours || !out.minutes || !out.seconds) return;

  const wedding = new Date(2027, 6, 14); // 14 juillet 2027, 00:00 heure locale (mois 0-indexé)
  const pad = (n) => String(n).padStart(2, '0');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let timer = null;
  const stop = () => { if (timer !== null) { clearInterval(timer); timer = null; } };

  // Date atteinte : on coupe l'intervalle et on bascule sur le message final,
  // plutôt que d'afficher des zéros ou des valeurs négatives.
  const showFinal = () => {
    stop();
    units.hidden = true;
    if (finalMsg) finalMsg.hidden = false;
    if (srSummary) srSummary.textContent = 'Le grand jour est arrivé !';
  };

  let lastDays = null;
  const render = () => {
    const diff = wedding.getTime() - Date.now();
    if (diff <= 0) { showFinal(); return; }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    out.days.textContent = String(days);
    out.hours.textContent = pad(hours);
    out.minutes.textContent = pad(minutes);
    out.seconds.textContent = pad(seconds);

    // Résumé vocal au jour près : évite une annonce par seconde
    if (srSummary && days !== lastDays) {
      lastDays = days;
      srSummary.textContent = 'Plus que ' + days + (days > 1 ? ' jours' : ' jour') + ' avant le mariage.';
    }
  };

  // prefers-reduced-motion : aucun défilement, on fige l'affichage sur jours + heures
  const apply = () => {
    stop();
    root.classList.toggle('hero__countdown--static', reduceMotion.matches);
    render();
    if (!reduceMotion.matches && !units.hidden) timer = setInterval(render, 1000);
  };

  apply();
  reduceMotion.addEventListener?.('change', apply);
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
  // Plat du répondant (adulte 1). Les value de ces radios sont aussi la source des
  // options des listes déroulantes des adultes 2..N : un seul endroit pour les libellés.
  const respondentDishRadios = Array.from(form.querySelectorAll('[name="plat-repondant"]'));
  const dishLabels = respondentDishRadios.map((r) => r.value);
  const requiredLogistics = [adults, ...arrivalRadios, ...lodgingRadios, ...respondentDishRadios].filter(Boolean);
  // Filet de sécurité : tout champ du bloc logistique, y compris ceux générés plus tard
  // (listes de plat des adultes 2..N) — d'où une requête refaite à chaque appel.
  const allLogisticsFields = () => logistics.querySelectorAll('input, select, textarea');
  const dishSelects = () => logistics.querySelectorAll('select[data-role="dish"]');
  // État courant, pour qu'une liste de plat créée après coup naisse avec le bon required
  let logisticsRequired = false;

  const applyLogisticsRequired = (required) => {
    logisticsRequired = required;
    // On repart toujours de zéro : garantit qu'aucun champ masqué ne reste required
    allLogisticsFields().forEach((el) => { el.required = false; });
    if (required) [...requiredLogistics, ...dishSelects()].forEach((el) => { el.required = true; });
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

  // Le nombre de bébés est un simple compteur : aucune logique attachée.

  // ─── Noms des participants (adultes 2..N et enfants 1..M) ───────
  // Le répondant (Prénom / Nom en haut du formulaire) EST l'adulte 1 : les blocs
  // générés ici ne concernent que les personnes en plus. Les bébés restent un
  // simple compteur, sans nom.
  const children = document.getElementById('rsvp-children');
  const adultNames = document.getElementById('rsvp-adult-names');
  const adultPeople = document.getElementById('rsvp-adult-people');
  const childNames = document.getElementById('rsvp-child-names');
  const childPeople = document.getElementById('rsvp-child-people');
  const adultNamesValue = document.getElementById('rsvp-adult-names-value');
  const childNamesValue = document.getElementById('rsvp-child-names-value');
  const adultDishesValue = document.getElementById('rsvp-adult-dishes-value');

  // Un bloc = un titre + une ligne « Prénom / Nom » reprenant les classes des champs
  // existants (donc côte à côte en desktop, empilés sous 640px). Aucun attribut name :
  // ces champs alimentent les colonnes concaténées, ils ne sont jamais soumis seuls.
  // Les adultes ont en plus une liste « Plat principal » sous leur nom ; pas les enfants.
  const buildPerson = (key, index, title) => {
    const block = document.createElement('div');
    block.className = 'rsvp__person';
    const id = 'rsvp-' + key + '-' + index;
    block.innerHTML =
      '<p class="rsvp__person-title">' + title + '</p>' +
      '<div class="rsvp__row">' +
        '<div class="rsvp__field">' +
          '<label for="' + id + '-first">Prénom <span class="rsvp__req" aria-hidden="true">*</span></label>' +
          '<input type="text" id="' + id + '-first" data-role="first" autocomplete="off">' +
        '</div>' +
        '<div class="rsvp__field">' +
          '<label for="' + id + '-last">Nom <span class="rsvp__req" aria-hidden="true">*</span></label>' +
          '<input type="text" id="' + id + '-last" data-role="last" autocomplete="off">' +
        '</div>' +
      '</div>';

    if (key === 'adult') {
      const field = document.createElement('div');
      field.className = 'rsvp__field rsvp__person-dish';
      field.innerHTML =
        '<label for="' + id + '-dish">Plat principal <span class="rsvp__req" aria-hidden="true">*</span></label>' +
        '<select id="' + id + '-dish" data-role="dish"></select>';
      const select = field.querySelector('select');
      // Option vide par défaut : aucun plat n'est présélectionné à la place de l'invité
      select.add(new Option('Choisir un plat…', ''));
      dishLabels.forEach((label) => select.add(new Option(label, label)));
      select.required = logisticsRequired;
      block.appendChild(field);
    }
    return block;
  };

  // Ajustement par la fin uniquement : les blocs conservés gardent leur saisie
  // quand le compteur change (passer de 3 à 2 adultes ne réinitialise rien).
  const syncPeople = (section, container, count, key, label, offset) => {
    while (container.children.length > count) container.lastElementChild.remove();
    while (container.children.length < count) {
      const number = container.children.length + offset;
      container.appendChild(buildPerson(key, number, label + ' ' + number));
    }
    section.hidden = count === 0;
  };

  // Un compteur vide vaut sa valeur par défaut (1 adulte, 0 enfant), cohérent avec
  // les placeholders et avec la normalisation à l'envoi.
  const countFrom = (input, fallback) => {
    const raw = input.value.trim();
    if (!raw) return fallback;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0) return fallback;
    return value;
  };

  const applyPeople = () => {
    // Compteur ramené à son max déclaré : garantit que le nombre de blocs de noms
    // correspond toujours au nombre annoncé.
    [adults, children].forEach((input) => {
      const max = Number(input.max);
      const value = Number(input.value.trim());
      if (Number.isInteger(value) && Number.isFinite(max) && value > max) input.value = String(max);
    });

    const nbAdults = Math.max(countFrom(adults, 1), 1);
    syncPeople(adultNames, adultPeople, nbAdults - 1, 'adult', 'Adulte', 2);
    syncPeople(childNames, childPeople, countFrom(children, 0), 'child', 'Enfant', 1);
  };
  adults.addEventListener('input', applyPeople);
  children.addEventListener('input', applyPeople);

  const personFields = (block) => ({
    first: block.querySelector('[data-role="first"]').value.trim(),
    last: block.querySelector('[data-role="last"]').value.trim(),
    dish: block.querySelector('[data-role="dish"]')?.value ?? '',   // vide pour un enfant
  });

  // Validation explicite : ces champs n'ayant pas de name, l'attribut required ne
  // suffirait pas (et le formulaire est en novalidate). Bloc par bloc, dans l'ordre
  // de l'écran : prénom, nom, puis plat pour les adultes.
  const checkNames = () => {
    const groups = [
      { container: adultPeople, label: 'l’adulte', offset: 2, withDish: true },
      { container: childPeople, label: 'l’enfant', offset: 1, withDish: false },
    ];
    for (const group of groups) {
      const blocks = Array.from(group.container.children);
      for (let i = 0; i < blocks.length; i++) {
        const { first, last, dish } = personFields(blocks[i]);
        const who = group.label + ' ' + (i + group.offset);
        if (!first) return 'Merci d’indiquer le prénom de ' + who + '.';
        if (!last) return 'Merci d’indiquer le nom de ' + who + '.';
        if (group.withDish && !dish) return 'Merci de choisir le plat principal de ' + who + '.';
      }
    }
    return null;
  };

  // Concaténation vers les colonnes de la Sheet. Sur un refus, les champs partent
  // vides : personne ne vient, au même titre que les compteurs à 0.
  const collectNames = (attending) => {
    if (!attending) {
      adultNamesValue.value = '';
      childNamesValue.value = '';
      adultDishesValue.value = '';
      return;
    }
    // « prénom|nom » : le « | » garde la frontière prénom / nom exploitable, y compris
    // pour les prénoms et noms composés. Une personne entièrement vide est ignorée,
    // et le filtre évite tout « ; » en trop en début ou en fin de chaîne.
    const entry = (first, last) => (!first && !last ? '' : first + '|' + last);
    const personEntry = (block) => {
      const { first, last } = personFields(block);
      return entry(first, last);
    };
    // Adultes traités en paires { nom, plat } filtrées UNE seule fois : « Plats adultes »
    // reste ainsi aligné sur « Noms adultes » (le n-ième plat est celui du n-ième nom).
    const respondent = {
      name: entry(form.querySelector('[name="Prénom"]').value.trim(),
                  form.querySelector('[name="Nom"]').value.trim()),
      dish: respondentDishRadios.find((r) => r.checked)?.value ?? '',
    };
    const others = Array.from(adultPeople.children).map((block) => {
      const { first, last, dish } = personFields(block);
      return { name: entry(first, last), dish };
    });
    const adultList = [respondent, ...others].filter((adult) => adult.name);
    adultNamesValue.value = adultList.map((adult) => adult.name).join(' ; ');
    adultDishesValue.value = adultList.map((adult) => adult.dish).join(' ; ');
    childNamesValue.value = Array.from(childPeople.children).map(personEntry).filter(Boolean).join(' ; ');
  };

  applyPresence();
  applyPeople();

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
      // Contrôles dans l'ordre de l'écran : arrivée, logement, plat du répondant, puis
      // compteurs et blocs de noms (avec le plat des adultes 2..N).
      if (!arrivalRadios.some((r) => r.checked)) return 'Merci d’indiquer votre jour d’arrivée.';
      if (!lodgingRadios.some((r) => r.checked)) {
        return 'Merci d’indiquer si vous avez besoin d’un logement sur place.';
      }

      if (!respondentDishRadios.some((r) => r.checked)) return 'Merci de choisir votre plat principal.';

      // Champ adultes laissé vide = 1 (le libellé dit « vous compris ») : on ne bloque
      // que sur une saisie explicitement invalide, jamais sur un champ non touché.
      const rawAdults = adults.value.trim();
      if (rawAdults) {
        const nbAdults = Number(rawAdults);
        if (!Number.isInteger(nbAdults) || nbAdults < 1) {
          return 'Le nombre d’adultes doit être un nombre entier, au minimum 1.';
        }
      }

      // Tout bloc de nom affiché doit être complet (prénom ET nom)
      const missingName = checkNames();
      if (missingName) return missingName;
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

    // Les champs nombre n'ont plus de valeur pré-remplie : un champ laissé vide doit
    // arriver dans la Sheet comme un nombre, jamais comme une cellule vide. « Adultes »
    // vaut 1 si l'invité vient (il compte au moins pour lui-même) et 0 s'il décline,
    // pour que la colonne reste sommable sans gonfler le total avec des absents.
    const attending = form.querySelector('[name="Présence"]:checked')?.value === 'Oui';
    collectNames(attending);   // remplit les champs cachés avant la lecture du formulaire
    const payload = new FormData(form);
    // Le name des radios de plat ne sert qu'à les grouper : le plat du répondant part
    // déjà dans « Plats adultes », pas de colonne en plus dans la Sheet.
    payload.delete('plat-repondant');
    const fallbacks = {
      'Adultes': attending ? '1' : '0',
      'Enfants': '0',
      'Bébés': '0',
    };
    Object.entries(fallbacks).forEach(([name, fallback]) => {
      const value = payload.get(name);
      if (typeof value === 'string' && value.trim() === '') payload.set(name, fallback);
    });

    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = 'Envoi…';

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: payload,
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

// ─── 4. Contact : email reconstruit + repli ───────────────────────
function initContact() {
  const cta = document.getElementById('contact-cta');
  const fallback = document.getElementById('contact-fallback');
  const mailOut = document.getElementById('contact-mail');
  if (!cta && !fallback) return;

  // Adresse stockée en fragments : elle n'existe en entier dans aucune chaîne
  // du HTML ni du JS, seulement en mémoire après exécution. Le « @ » passe par
  // son code de caractère pour qu'aucun motif « ...@... » ne soit lisible ici.
  const user = ['juliette', 'chenuaud'].join('.');
  const domain = ['gmail', 'com'].join('.');
  const address = user + String.fromCharCode(64) + domain;

  if (cta) {
    cta.href = 'mailto:' + address + '?subject=' + encodeURIComponent('Question — Mariage');
    cta.classList.remove('is-pending');
    cta.removeAttribute('aria-disabled');
  }

  // Repli : l'invité dont le client mail ne s'ouvre pas (webmail, aucun client
  // configuré) doit pouvoir lire et copier l'adresse sans quitter la page.
  if (mailOut) mailOut.textContent = address;
  if (fallback) fallback.hidden = false;
}
