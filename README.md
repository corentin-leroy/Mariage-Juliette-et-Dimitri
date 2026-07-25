# Site mariage — Juliette & Dimitri

Site one-page pour le mariage des 14 & 15 juillet 2027 au Château de Faverges.
Site statique, HTML/CSS/JS pur, styles en Sass. Aucun framework.

## Structure
- `index.html` — page unique (nav fixe + 7 sections ancrées)
- `styles/` — `_variables.scss` (tokens DA), `main.scss` → compilé en `main.css`
- `scripts/main.js` — compte à rebours, nav active, logique du formulaire RSVP
- `assets/` — images aquarelle, monogramme (à fournir)

## Développement
Prérequis : Node.js.

```powershell
npm install            # installe Sass
npm run watch          # compile styles/main.scss → main.css en continu
```

Ouvrir `index.html` dans le navigateur (ou via une extension type Live Server).

## Déploiement
Site 100 % statique : déployable tel quel sur Netlify, Vercel ou Cloudflare Pages.
Lancer `npm run build` pour un CSS minifié avant mise en ligne.

## À fournir (placeholders dans le code)
- Image HD aquarelle du château (sans texte)
- Monogramme J&D (PNG transparent)
- Endpoint Sheet Monkey (formulaire RSVP)
- Email des mariés (section Contact)
- URL de la cagnotte (Liste de mariage)
- Code d'intégration Google Maps (section Venir au château)
