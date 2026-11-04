# Revise — Étapes de création du site

Checklist tirée de [Revise — Plan de conception.pdf](Revise%20—%20Plan%20de%20conception.pdf). Suit la feuille de route en 4 phases ; chaque phase se termine sur quelque chose d'utilisable.

Contexte produit : [PRODUCT.md](../PRODUCT.md). Tout travail d'UX/UI passe par les skills (voir [README](../README.md)) : **Intent** pour la structure et le parcours, **Impeccable** pour le rendu codé.

---

## Phase 0 — Décisions et prérequis

- [x] Framework frontend : **SolidJS**
- [x] Nom : **Revise** (remplace « Ancre »)
- [x] `/impeccable init` → [PRODUCT.md](../PRODUCT.md)
- [x] Génération de cartes depuis des images : **oui, par le prompt** — photo jointe dans Claude comme un PDF ; illisible = notion ignorée, `source_page` null
- [x] Sous-domaine : `revise.reesch.com`
- [x] Installer les outils : Node.js, `wrangler`, Rust + cible `wasm32-unknown-unknown`, `wasm-pack`
- [x] `wrangler login` sur le compte Cloudflare qui possède le domaine

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
- [x] Variables : `TEAM_DOMAIN`, `POLICY_AUD` (`OWNER_EMAIL` retiré au passage multi-utilisateur)

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
- [x] ~~Vérifier `email = OWNER_EMAIL`~~ — remplacé : la policy Access est la seule liste des invités, l'e-mail du JWT identifie la personne (`c.var.user`)

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
- [x] Clôture automatique d'une session sans note depuis 30 min ([decisions.md](design/decisions.md))
  - [x] Faite à l'ouverture de la session suivante ; `ended_at` = heure de la dernière note (ou de l'ouverture si aucune)

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
  - [x] « Refaire ces cartes » : mêmes cartes en entraînement, aucune note envoyée (le planning FSRS ne bouge pas)
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

- [x] Design : `/journey` (copier le prompt → Claude → coller → relecture), `/wireframe` Import et Relecture, `/fortify` (JSON invalide, cartes rejetées, collage vide), `/articulate` (consignes et erreurs)
- [x] **Import** : choix matière / nombre / types (question / réponse, texte à trous, QCM, réponse longue), bouton « Copier le prompt », zone de collage
- [x] **Relecture** : cartes brouillon une par une → accepter / modifier / supprimer
  - Entrée depuis la matière (`/matieres/:id/import`, `/matieres/:id/relecture`) ; brouillons en attente signalés dans la matière ; suppression annulable, sans confirmation
- [x] Seules les cartes acceptées reçoivent un `card_state` et entrent en révision
- [x] `/impeccable critique`, `audit` et `polish` sur Import et Relecture → [web/.impeccable/critique/](../web/.impeccable/critique/)

### 3.5 Vérification

- [x] Tester avec un cours de 20 pages : < 5 min, cartes exploitables
- [x] Nettoyage : retirer `CLAUDE_MODEL` de `wrangler.toml` et de `worker/src/index.ts`

### 3.6 Code et schémas dans les cartes

- [x] Rendu dans `question`, `answer`, `explanation` : `` `code` ``, bloc ` ```langage `, bloc ` ```mermaid ` en schéma (Mermaid chargé à la demande, thème clair/sombre, source affiché si invalide)
- [x] Limite à part pour les blocs ` ``` ` : `MAX_CODE = 2000` ; lecture du JSON importé sans se fier aux ` ``` `
- [x] Prompt : code en ligne ou en bloc, schéma Mermaid seulement s'il est dans le cours
- [x] Session : champ de réponse à chasse fixe, sans correcteur, `Tab` insère une tabulation sur les cartes de code
- [x] Éditeur et relecture : aperçu rendu sous chaque champ qui contient du code
- [x] Vérifier dans le navigateur : schéma clair/sombre, aperçu, `Tab` (Chrome, API simulée)
- [x] Coloration syntaxique : Shiki chargé à la demande, thèmes GitHub clair/sombre via `light-dark()`, texte brut si langage inconnu
- [x] Dessin à main levée et formes simples : crayon, trait, flèche, rectangle, ellipse ; table `drawings` (migration 0002), carte → `![dessin](id)`, SVG reconstruit depuis les coordonnées
- [x] Migration 0002 sur la base distante : `wrangler d1 migrations apply revise --remote`
- [x] Dessins : modifier un dessin existant, texte dans le dessin, suppression des dessins orphelins
  - Modifier enregistre un nouveau dessin et remplace la référence dans le champ ; un dessin ne change jamais
  - Outil « Texte » : forme `{ t: "text", p: [x, y], s }`, 100 caractères au plus
  - Dessin que plus aucune carte ne cite : effacé à la création d'un dessin suivant, un jour après sa propre création
- [x] Trous `___` dans du code : blanc dans le code en ligne et les blocs colorés ; le prompt autorise les « cloze » sur du code
- [x] Mermaid en cache hors ligne : précaché par le service worker (phase 4)

---

## Phase 4 — Confort et suivi

- [x] `GET /api/stats` + écran **Statistiques** : cartes maîtrisées, à venir, temps réel de révision par semaine
  - [x] `/measure` : indicateurs et refus dans `docs/design/metrics-stats.md` (pas de série, pas d'arriéré, à venir dès demain)
  - [x] `/impeccable` : phrases et barres d'encre, sans chiffre-vedette ; barres sous leur libellé au téléphone
- [x] PWA installable + hors ligne (réviser sans réseau)
  - Service worker `web/sw.js` : build précaché (7,7 Mo, grammaires Shiki au premier usage), API en réseau d'abord, réponse gardée après 4 s
  - File gardée de 60 cartes (`GET /api/queue`), préparée à chaque accueil en ligne avec ses dessins et sa coloration ; session hors ligne enregistrée au retour (`POST /sessions` avec `id`, `started_at` ; `/end` avec `ended_at`)
  - [x] `/transpose` + `/impeccable adapt` : `docs/design/adaptation-revise-mobile.md` — pas de clavier ouvert d'office, retour Android = pause, survol réservé à la souris, cibles de 44 px
  - [x] `/fortify` : `docs/design/states-offline.md` — délais réseau, stockage plein, version précédente gardée après déploiement
  - [x] Vérifier l'installation sur le vrai domaine : manifeste et icônes passent par Access (`crossorigin="use-credentials"`) ; si Chrome ne propose pas l'installation, ajouter une règle Bypass Access pour `/manifest.webmanifest` et `/icon-*.png`
- [x] Export des cartes : bouton « Exporter » d'une matière, fichier JSON au format de l'import (brouillons exclus, dessins cités par leur id)
- [x] Plusieurs personnes : contenu partagé (matières, cartes, dessins), progression propre à chacun (`card_state`, `reviews`, `sessions`, `parked_thoughts` par `user_id`) — migration `0003_users.sql`
  - Inviter : Zero Trust → Access → Applications → Revise → Policies → ajouter l'e-mail à la règle Allow

---

## Checklist sécurité finale

- [x] Access actif, une seule règle Allow (e-mails invités uniquement)
- [x] JWT revérifié dans le Worker sur toutes les routes `/api/*` (`app.use("/api/*", requireUser)`, `run_worker_first` ; sans session : 302 vers Access)
- [x] `workers_dev = false` et `preview_urls = false`
- [x] Garde-fou import : 1 Mo de texte collé (`bodyLimit`, 413), validation par le cœur Rust (`validate_cards`)
