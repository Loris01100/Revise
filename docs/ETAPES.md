# Revise — Étapes de création du site

Checklist tirée de [Revise — Plan de conception.pdf](Revise%20—%20Plan%20de%20conception.pdf). Suit la feuille de route en 4 phases ; chaque phase se termine sur quelque chose d'utilisable.

Contexte produit : [PRODUCT.md](../PRODUCT.md). Tout travail d'UX/UI passe par les skills (voir [README](../README.md)) : **Intent** pour la structure et le parcours, **Impeccable** pour le rendu codé.

---

## Phase 0 — Décisions et prérequis

- [x] Framework frontend : **SolidJS**
- [x] Nom : **Revise** (remplace « Ancre »)
- [x] `/impeccable init` → [PRODUCT.md](../PRODUCT.md)
- [ ] Génération de cartes depuis des images (photos de tableau, notes manuscrites) : oui / non / plus tard
- [x] Sous-domaine : `revise.reesch.com`
- [x] Installer les outils : Node.js, `wrangler`, Rust + cible `wasm32-unknown-unknown`, `wasm-pack`
- [x] `wrangler login` sur le compte Cloudflare qui possède le domaine
- [ ] Console Claude : créer une clé API dédiée à Revise et fixer une **limite de dépense mensuelle**

---

## Phase 1 — Fondations sécurisées

> **Terminé quand** une requête hors connexion est refusée et que la page s'affiche après connexion.

### 1.1 Monorepo

- [x] Créer la structure :
  ```
  revise/
  ├── core/      # crate Rust → WASM (wasm-bindgen)
  ├── worker/    # Worker TypeScript (Hono)
  │   ├── src/
  │   ├── migrations/
  │   └── wrangler.toml
  └── web/       # frontend Vite + SolidJS
  ```
- [x] `worker/` : initialiser le projet TS, installer `hono` et `jose`
- [x] `web/` : initialiser Vite + SolidJS
- [x] `core/` (crate `revise-core`, car `core` est réservé par Rust) : `cargo new --lib`, ajouter `wasm-bindgen`, `crate-type = ["cdylib", "rlib"]`

### 1.2 Ressources Cloudflare

- [x] `wrangler d1 create revise`
- [x] ~~`wrangler r2 bucket create revise-imports`~~ — abandonné : l'import se fait par copier-coller, sans fichier stocké

### 1.3 `wrangler.toml`

- [x] Liaison D1 (`revise`)
- [x] Static assets → `web/dist`
- [x] Route personnalisée `revise.reesch.com` (custom domain)
- [x] `workers_dev = false`
- [x] `preview_urls = false`
- [x] Variables : `CLAUDE_MODEL` (défaut `claude-sonnet-5-5`), `TEAM_DOMAIN`, `POLICY_AUD`, `OWNER_EMAIL`

### 1.4 Cloudflare Access (Zero Trust)

- [x] Créer une application **self-hosted** sur `revise.reesch.com`
- [x] Une seule règle **Allow** : ton adresse e-mail
- [x] Méthode de connexion : code à usage unique par e-mail (ou Google/GitHub)
- [x] Copier le **tag AUD** de l'application dans `POLICY_AUD`

### 1.5 Middleware JWT (`worker/src/auth.ts`)

Sur chaque route `/api/*` :
- [x] Lire l'en-tête `Cf-Access-Jwt-Assertion` (pas le cookie `CF_Authorization`)
- [x] Vérifier la signature RS256 avec les clés de `https://<équipe>.cloudflareaccess.com/cdn-cgi/access/certs` (`jose`, `createRemoteJWKSet`)
- [x] Vérifier `aud = POLICY_AUD` et `iss = TEAM_DOMAIN`
- [x] Vérifier `email = OWNER_EMAIL`, sinon **403**

### 1.6 Base de données D1

- [x] Écrire la migration initiale dans `worker/migrations/` avec les 7 tables :
  `subjects`, `sources`, `cards`, `card_state` (+ index `idx_card_state_due`), `reviews`, `sessions`, `parked_thoughts`
  (schéma complet dans le plan de conception — dates en ISO 8601 texte, ids en UUID)
- [x] `wrangler d1 migrations apply revise --local` puis `--remote`

### 1.7 Premier déploiement

- [x] Worker « hello » + page statique minimale
- [x] `wrangler deploy`
- [x] Test en navigation privée : l'écran de connexion Access apparaît
- [x] Test `curl https://revise.reesch.com/api/subjects` → refusé (302 vers la connexion Access)
- [x] Vérifier que l'URL `*.workers.dev` ne répond pas

---

## Phase 2 — Révision manuelle

> **Terminé quand** tu révises chaque jour des cartes écrites à la main.

### 2.1 Cœur Rust (`core/`)

- [x] `src/fsrs.rs` : fonction pure `schedule(state, grade, now) -> state`
  - [x] Crate : **`rs-fsrs` 1.2** — compile en `wasm32-unknown-unknown` (`fsrs` 6.6 échoue : `getrandom` sans `wasm_js`, et embarque `burn`). `Card::new()` et `Parameters::default()` lisent l'horloge (`Utc::now()`, qui passe par `Date.now()` grâce à la feature `wasmbind` de chrono) ; `schedule` construit la carte elle-même pour rester pure en `now`
  - [x] Rétention cible : 90 %
  - [x] Notes : 1 « à revoir », 2 « difficile », 3 « bien », 4 « facile »
- [x] `src/session.rs` : composition d'une session
  - [x] Tri des cartes dues par date
  - [x] Limite de cartes nouvelles (défaut 10/jour) — le Worker passe le quota restant du jour
  - [x] Alternance des matières et des types de questions
  - [x] Mode `quick5` : les 5 cartes les plus en retard
- [x] Tests `cargo test` sur FSRS et la composition de session
- [x] `wasm-pack build core --target web` et import dans le Worker ([worker/src/core.ts](../worker/src/core.ts))
  - [x] Cible `web` + `initSync` : wrangler importe le `.wasm` comme `WebAssembly.Module`, ce que la cible `bundler` n'attend pas
  - [x] Recompilé à chaque `wrangler dev` / `deploy` (section `[build]` de `wrangler.toml`)
  - [x] `schedule` et `compose` échangent du JSON calqué sur les lignes D1 (`card_state`, + `id`, `subject_id`, `type` pour `compose`)

### 2.2 API ([`worker/src/routes.ts`](../worker/src/routes.ts))

- [x] `GET /api/subjects` — matières + nombre de cartes actives et dues
- [x] `POST /api/subjects` — créer une matière
- [x] `GET /api/subjects/:id/cards` — cartes d'une matière (page Matières ; la recherche se fait côté client)
- [x] `POST /api/cards` — création manuelle (directement en `active` + ligne `card_state` initiale)
- [x] `PATCH /api/cards/:id` — modifier / accepter (`active`, crée la ligne `card_state` si absente) / suspendre
- [x] `DELETE /api/cards/:id`
- [x] `POST /api/sessions` — ouvrir une session (`quick5`, `timed`, `subject`) et renvoyer la file ; file vide = aucune session créée
  - [x] Quota de nouvelles : 10 moins les cartes dont la première note date d'aujourd'hui (jour UTC)
- [x] `POST /api/sessions/:id/reviews` — enregistrer la note, appeler `schedule`, mettre à jour `card_state`, insérer dans `reviews`
  - [x] Idempotent sur l'`id` de la note, choisi par le client : la file hors ligne peut renvoyer une note sans la compter deux fois
  - [x] `reviewed_at` facultatif : une note envoyée en retard est planifiée à l'heure où elle a été donnée
- [x] `POST /api/sessions/:id/end` — clôturer (idempotent) et renvoyer le bilan avec les pensées non traitées
- [x] `POST /api/parked` — noter une pensée parasite
- [x] `PATCH /api/parked/:id` — « Fait » au bilan
- [ ] Clôture automatique d'une session sans note depuis 30 min ([decisions.md](design/decisions.md))

### 2.3 Design (avant le code de l'interface)

- [x] `/intent` : poser le contexte du projet → [design/context-revise.md](design/context-revise.md), [design/decisions.md](design/decisions.md)
- [x] `/strategize` : brief, hypothèses et critères de succès → [design/brief-revise.md](design/brief-revise.md)
- [x] `/journey` : parcours Accueil → Session focus → Pause → Fin de session, et Matières → [design/journey-revision.md](design/journey-revision.md), [schéma](design/journey-revision.html)
- [x] `/wireframe` : maquettes en niveaux de gris des écrans de la phase 2 → [design/wireframes-revision.html](design/wireframes-revision.html)
- [x] `/fortify` : états vides, erreurs, chargement, coupure réseau en session → [design/states-revision.md](design/states-revision.md)
- [x] `/include` : clavier complet, lecteur d'écran, mouvement réduit, besoins TDAH → [design/accessibility-revision.md](design/accessibility-revision.md)
- [x] `/articulate` : textes d'interface en français → [design/copy-revision.md](design/copy-revision.md)
- [x] `/impeccable shape` : monde visuel « surligneur sur polycopié » → [design/shape-revision.md](design/shape-revision.md)
- [x] Construction de l'interface dans ce monde ([web/src/](../web/src/)), revue de finition Impeccable
  - [x] Terme clé marqué `==terme==` dans la réponse, surligné à la correction ; police servie par `@fontsource`
  - [x] `GET /api/subjects` renvoie aussi `next_due` (« Prochaines cartes le {jour} »)
- [x] DESIGN.md, écrit depuis l'interface construite → [web/DESIGN.md](../web/DESIGN.md)

### 2.4 Frontend (`web/`)

- [x] **Accueil** : gros bouton « 5 cartes », bouton « Session 15 min », matières avec pastille « Cartes du jour » sans nombre ([decisions.md](design/decisions.md))
- [x] **Matières** : liste, cartes par matière, recherche, édition, ajout manuel
- [x] **Session focus** : une carte plein écran, champ de réponse, barre « 4 / 12 », rien d'autre
- [x] **Pause** : minuteur, suggestion de bouger/boire, « Reprendre » / « Arrêter là »
- [x] **Fin de session** : bilan (cartes, temps) + pensées de la session, les plus anciennes repliées
- [x] **Réglages** : révélation automatique de la correction (interrupteur + délai 15–180 s)

Règles du mode focus :
- [x] Aucune navigation visible pendant la session
- [x] Réponse tapée **avant** affichage de la correction, puis note 1–4
- [x] Raccourcis : `Entrée` révéler (`Ctrl+Entrée` en réponse longue), `1`–`4` noter, `P` parking après la révélation, `Échap` pause ([decisions.md](design/decisions.md)) ; bouton « Noter une pensée » visible avant la révélation
- [x] Durée réglable 10–25 min, pause proposée automatiquement à la fin
- [x] Animations douces, couleurs calmes, thème clair + sombre
- [x] Aucune notification pendant la session
- [x] Pas de streak punitive
- [x] Utilisable au clavier (desktop) et au doigt (mobile)

Vérification du rendu :
- [x] `/impeccable critique` et `/impeccable audit` sur chaque écran
  - [x] Critique (28/40) et correctifs des 2 P1 et 3 P2 → [web/.impeccable/critique/](../web/.impeccable/critique/)
  - [x] Audit (16/20 : 1 P1, 3 P2) et contrôle à l'écran par Chrome headless sur une API simulée, de 375 à 1280 px
- [x] `/impeccable polish` avant de déployer : focus conservé après chaque action, tableau replié selon sa place, titre d'onglet par écran

### 2.5 Déploiement

- [x] Build : `wasm-pack build core --target web` → build `web` → `wrangler deploy`

---

## Phase 3 — Import par copier-coller

> Sans API payante : Claude (claude.ai ou Claude Code, avec l'abonnement) lit le cours et renvoie les cartes en JSON ; Revise valide et range.
>
> **Terminé quand** un cours de 20 pages donne des cartes exploitables en moins de cinq minutes, copier-coller compris.

### 3.1 Prompt de génération (`web/src/prompt.ts`)

- [x] Prompt prêt à copier : une notion par carte, en français, rappel actif plutôt que reconnaissance, couvrir toutes les notions clés, citer la page source, ne rien inventer
- [x] Format de sortie imposé : un seul bloc JSON, tableau de cartes
  - Champs : `type`, `question`, `answer`, `choices` (QCM), `explanation`, `source_page` — pas de `difficulty` : aucune colonne, FSRS la calcule
- [x] Le nombre de cartes et les types choisis sont insérés dans le prompt
- [x] Essai à la main sur un vrai cours PDF et DOCX, puis ajustement du prompt
  - PDF (partiel d'architecture logicielle, 13 p.) : 21 cartes justes ; listes de 4 éléments au plus autorisées
  - DOCX (sujet CI/CD .NET, claude.ai) : 22 cartes au bon format ; sur un sujet d'exercice, viser les notions plutôt que les détails de l'énoncé ; l'explication ne répète pas la réponse

### 3.2 Validation des cartes (`core/src/cards.rs`)

- [x] Lecture du JSON collé, tolérante (texte autour, bloc ```json)
- [x] Contrôle du schéma, carte par carte, avec la raison du rejet
  - QCM : 2 à 4 propositions distinctes, la réponse en fait partie ; texte à trous : un seul `___` ; `choices` ignoré hors QCM, `source_page` invalide oubliée
- [x] Dédoublonnage (dans le lot et avec les cartes de la matière)
  - Questions comparées sans casse, espaces ni ponctuation
- [x] Rejet des cartes trop longues : question 500, réponse 1000, explication 500, proposition 200 caractères
- [x] Tests `cargo test` : les deux vrais lots (partiel PDF, sujet DOCX) dans `core/tests/fixtures/`
- [x] Export wasm `validate_cards(texte, questions existantes)` → `{cards, rejected}`

### 3.3 Route d'import

- [x] `POST /api/imports` (JSON : matière, texte collé), taille max **1 Mo**
- [x] Valider via le cœur Rust puis insérer les cartes en `draft` (`source_id` vide)
- [x] Réponse : cartes créées + cartes rejetées avec leur raison

### 3.4 Frontend

- [ ] Design : `/journey` (copier le prompt → Claude → coller → relecture), `/wireframe` Import et Relecture, `/fortify` (JSON invalide, cartes rejetées, collage vide), `/articulate` (consignes et erreurs)
- [ ] **Import** : choix matière / nombre / types (question / réponse, texte à trous, QCM, réponse longue), bouton « Copier le prompt », zone de collage
- [ ] **Relecture** : cartes brouillon une par une → accepter / modifier / supprimer
- [ ] Seules les cartes acceptées reçoivent un `card_state` et entrent en révision
- [ ] `/impeccable critique`, `audit` et `polish` sur Import et Relecture

### 3.5 Vérification

- [ ] Tester avec un cours de 20 pages : < 5 min, cartes exploitables
- [ ] Nettoyage : retirer `CLAUDE_MODEL` de `wrangler.toml` et de `worker/src/index.ts`

---

## Phase 4 — Confort et suivi

- [ ] `GET /api/stats` + écran **Statistiques** : cartes maîtrisées, à venir, temps réel de révision par semaine
  - [ ] `/measure` : choisir des indicateurs qui montrent l'acquis sans culpabiliser
  - [ ] `/impeccable` pour le rendu des graphiques
- [ ] PWA installable + hors ligne (réviser sans réseau)
  - [ ] `/transpose` + `/impeccable adapt` : expérience mobile au doigt
  - [ ] `/fortify` : comportement hors ligne et synchronisation
- [ ] Si le copier-coller devient pénible : génération par l'API Claude (clé payante, limite de dépense)
- [ ] Export des cartes

---

## Checklist sécurité finale

- [ ] Access actif, une seule règle Allow (ton e-mail)
- [ ] JWT revérifié dans le Worker sur toutes les routes `/api/*`
- [x] `workers_dev = false` et `preview_urls = false`
- [ ] Garde-fou import : 1 Mo de texte collé, validation par le cœur Rust
