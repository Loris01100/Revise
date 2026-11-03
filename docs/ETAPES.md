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
- [ ] `wrangler r2 bucket create revise-imports` (**aucun domaine public**) — reporté en phase 3 : activer R2 dans le dashboard (moyen de paiement demandé, palier gratuit), puis remettre la liaison `IMPORTS` dans `wrangler.toml`

### 1.3 `wrangler.toml`

- [x] Liaison D1 (`revise`) ; liaison R2 en phase 3
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

### 2.2 API (`worker/src/routes/`)

- [ ] `GET /api/subjects` — matières + nombre de cartes dues
- [ ] `POST /api/subjects` — créer une matière
- [ ] Création manuelle de cartes (directement en `active` + ligne `card_state` initiale)
- [ ] `PATCH /api/cards/:id` — modifier / accepter (`active`) / suspendre
- [ ] `DELETE /api/cards/:id`
- [ ] `POST /api/sessions` — ouvrir une session (`quick5`, `timed`, `subject`) et renvoyer la file
- [ ] `POST /api/sessions/:id/reviews` — enregistrer la note, appeler `schedule`, mettre à jour `card_state`, insérer dans `reviews`
- [ ] `POST /api/sessions/:id/end` — clôturer et renvoyer le bilan
- [ ] `POST /api/parked` — noter une pensée parasite

### 2.3 Design (avant le code de l'interface)

- [x] `/intent` : poser le contexte du projet → [design/context-revise.md](design/context-revise.md), [design/decisions.md](design/decisions.md)
- [x] `/strategize` : brief, hypothèses et critères de succès → [design/brief-revise.md](design/brief-revise.md)
- [x] `/journey` : parcours Accueil → Session focus → Pause → Fin de session, et Matières → [design/journey-revision.md](design/journey-revision.md), [schéma](design/journey-revision.html)
- [x] `/wireframe` : maquettes en niveaux de gris des écrans de la phase 2 → [design/wireframes-revision.html](design/wireframes-revision.html)
- [x] `/fortify` : états vides, erreurs, chargement, coupure réseau en session → [design/states-revision.md](design/states-revision.md)
- [x] `/include` : clavier complet, lecteur d'écran, mouvement réduit, besoins TDAH → [design/accessibility-revision.md](design/accessibility-revision.md)
- [x] `/articulate` : textes d'interface en français → [design/copy-revision.md](design/copy-revision.md)
- [x] `/impeccable shape` : monde visuel « surligneur sur polycopié » → [design/shape-revision.md](design/shape-revision.md)
- [ ] Construction de l'interface dans ce monde, puis DESIGN.md (écrit à la fin, depuis l'interface construite)

### 2.4 Frontend (`web/`)

- [ ] **Accueil** : gros bouton « 5 cartes », bouton « Session 15 min », cartes dues par matière
- [ ] **Matières** : liste, cartes par matière, recherche, édition, ajout manuel
- [ ] **Session focus** : une carte plein écran, champ de réponse, barre « 4 / 12 », rien d'autre
- [ ] **Pause** : minuteur, suggestion de bouger/boire, « Reprendre » / « Arrêter là »
- [ ] **Fin de session** : bilan (cartes, temps) + liste du parking à pensées
- [ ] **Réglages** : révélation automatique de la correction (interrupteur + délai 15–180 s)

Règles du mode focus :
- [ ] Aucune navigation visible pendant la session
- [ ] Réponse tapée **avant** affichage de la correction, puis note 1–4
- [ ] Raccourcis : `Espace` révéler, `1`–`4` noter, `P` parking à pensées, `Échap` pause
- [ ] Durée réglable 10–25 min, pause proposée automatiquement à la fin
- [ ] Animations douces, couleurs calmes, thème clair + sombre
- [ ] Aucune notification pendant la session
- [ ] Pas de streak punitive
- [ ] Utilisable au clavier (desktop) et au doigt (mobile)

Vérification du rendu :
- [ ] `/impeccable critique` et `/impeccable audit` sur chaque écran
- [ ] `/impeccable polish` avant de déployer

### 2.5 Déploiement

- [ ] Build : `wasm-pack build core --target bundler` → build `web` → `wrangler deploy`

---

## Phase 3 — Import intelligent

> **Terminé quand** un cours de 20 pages donne des cartes exploitables en moins de deux minutes.

### 3.1 Secret

- [ ] `wrangler secret put ANTHROPIC_API_KEY` (jamais envoyée au navigateur)

### 3.2 Extraction DOCX (`core/src/docx.rs`)

- [ ] Ouvrir l'archive ZIP, lire `word/document.xml`
- [ ] Produire un Markdown qui conserve titres et listes
- [ ] Tests `cargo test` avec un DOCX d'exemple

### 3.3 Validation des cartes (`core/src/cards.rs`)

- [ ] Contrôle du schéma
- [ ] Dédoublonnage
- [ ] Rejet des cartes trop longues

### 3.4 Appel Claude (`worker/src/claude.ts`)

- [ ] `POST https://api.anthropic.com/v1/messages` avec `CLAUDE_MODEL`
- [ ] Outil `save_cards` avec schéma JSON, forcé via `tool_choice`
  - Champs : `type`, `question`, `answer`, `choices` (QCM), `explanation`, `source_page`, `difficulty`
- [ ] PDF → bloc `document` base64 (limites : 32 Mo/requête, 600 pages — 100 pour les modèles 200k)
- [ ] DOCX → Markdown du cœur Rust dans un bloc `text`
- [ ] Prompt système : une notion par carte, en français, rappel actif plutôt que reconnaissance, couvrir toutes les notions clés, citer la page source, ne rien inventer
- [ ] Streaming : relayer le flux de Claude au navigateur pour afficher la progression
- [ ] Enregistrer `tokens_in` / `tokens_out` dans `sources`

### 3.5 Route d'import

- [ ] `POST /api/imports` (multipart : fichier, matière, nombre de cartes, types)
  - [ ] Taille max **20 Mo**
  - [ ] Octets magiques : `%PDF` (PDF) / `PK` (DOCX)
  - [ ] **Quota d'imports par jour** stocké dans D1
  - [ ] Stocker l'original dans R2 (`imports/<id>.pdf|docx`)
  - [ ] Créer la ligne `sources` en `processing` → `ready` / `failed` (+ `error`)
  - [ ] Valider via le cœur Rust puis insérer les cartes en `draft`
- [ ] `GET /api/imports/:id` — statut + cartes brouillon

### 3.6 Frontend

- [ ] Design : `/journey` (import → génération → relecture), `/wireframe` Import et Relecture, `/fortify` (fichier refusé, quota atteint, génération échouée ou lente), `/articulate` (messages d'erreur et de progression)
- [ ] **Import** : dépôt du fichier, choix matière / nombre / types (question / réponse, texte à trous, QCM, réponse longue), progression en direct
- [ ] **Relecture** : cartes brouillon une par une → accepter / modifier / supprimer
- [ ] Seules les cartes acceptées reçoivent un `card_state` et entrent en révision
- [ ] `/impeccable critique`, `audit` et `polish` sur Import et Relecture

### 3.7 Vérification

- [ ] Tester avec un cours de 20 pages : < 2 min, cartes exploitables
- [ ] Surveiller le temps CPU (palier gratuit) ; si un gros DOCX dépasse → Workers Paid (5 $/mois)

---

## Phase 4 — Confort et suivi

- [ ] `GET /api/stats` + écran **Statistiques** : cartes maîtrisées, à venir, temps réel de révision par semaine
  - [ ] `/measure` : choisir des indicateurs qui montrent l'acquis sans culpabiliser
  - [ ] `/impeccable` pour le rendu des graphiques
- [ ] PWA installable + hors ligne (réviser sans réseau)
  - [ ] `/transpose` + `/impeccable adapt` : expérience mobile au doigt
  - [ ] `/fortify` : comportement hors ligne et synchronisation
- [ ] Import par chapitres (gros PDF au-delà des limites de l'API)
- [ ] Cloudflare Queues pour traiter les gros documents en arrière-plan
- [ ] Export des cartes

---

## Checklist sécurité finale

- [ ] Access actif, une seule règle Allow (ton e-mail)
- [ ] JWT revérifié dans le Worker sur toutes les routes `/api/*`
- [x] `workers_dev = false` et `preview_urls = false`
- [ ] Bucket R2 privé
- [ ] `ANTHROPIC_API_KEY` en secret, limite de dépense définie dans la console Claude
- [ ] Garde-fous import : 20 Mo, octets magiques, quota journalier
