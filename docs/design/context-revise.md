# Revise

## Users

Un seul utilisateur : l'étudiant propriétaire de l'app, avec un TDAH. Il révise ses propres cours (PDF, DOCX) seul, surtout sur ordinateur au clavier ; le téléphone au doigt vient ensuite et doit rester possible.

Ce qui bloque n'est pas la compréhension du contenu mais :
- **démarrer** : choisir quoi réviser, combien de temps, par où commencer coûte assez d'énergie pour que la session n'ait pas lieu ;
- **rester** : une notification, une pensée parasite ou un élément d'interface suffit à sortir de la session ;
- **revenir** : après une interruption ou quelques jours sans réviser, retrouver le fil sans se sentir en retard.

Situation actuelle : relire ses cours ou fabriquer des fiches à la main, ce qui demande la même énergie de démarrage que la révision elle-même.

## Product

Application web personnelle (PWA installable), nouvelle, au stade MVP. Elle importe un cours, en tire des cartes de révision via Claude, puis fait réviser par sessions courtes en répétition espacée (FSRS).

- Écrans : Accueil, Import, Relecture, Session focus, Pause, Fin de session, Matières, Statistiques [docs/Revise — Plan de conception.pdf, p. 7–8].
- Action principale de l'accueil : « Réviser 5 cartes » (`quick5`, les 5 cartes les plus en retard).
- Rappel actif : la réponse est tapée avant la correction, puis notée de 1 à 4.
- Parking à pensées : noter une pensée parasite sans quitter la session ; la liste revient en fin de session.
- Aucun modèle économique : usage personnel, coûts plafonnés par les paliers gratuits Cloudflare ; pas d'API payante, les cartes sont générées dans Claude (abonnement) puis collées.

## Constraints

- **Technique** : un Worker Cloudflare (Hono, TypeScript), cœur Rust en WebAssembly, D1, SolidJS. Temps CPU limité par requête sur le palier gratuit. Collage limité à 1 Mo.
- **Génération** : un PDF de plusieurs dizaines de pages prend jusqu'à une minute ; la progression est affichée en streaming.
- **Accès** : quelques invités derrière Cloudflare Access ; contenu partagé, progression propre à chacun.
- **Langue** : interface en français uniquement.
- **Équipe** : une personne, qui conçoit, construit et utilise. Aucun circuit de validation.
- **Réglementaire** : aucun ; pas de tiers dont les données sont traitées. Le contenu des cours est donné à Claude par l'utilisateur, hors de l'app.

## Ethical stance

- **Attention** : l'app sert la tâche puis se retire. Aucune notification, aucun badge, aucun compteur de non-lus. Le rappel de réviser vient de l'utilisateur, pas de l'app.
- **Pas de mécanique de culpabilité** : pas de série, pas de compteur de jours manqués, pas de « vous êtes en retard de 120 cartes ». Le retard est absorbé par la file : l'accueil propose toujours 5 cartes, jamais l'arriéré complet.
- **Sessions bornées** : chaque session a une fin visible (5 cartes, ou une durée de 10 à 25 min) et propose une pause. Rien n'enchaîne automatiquement sur une session suivante.
- **IA visible** : toute carte générée entre en brouillon et n'est révisée qu'après acceptation explicite. La page source est affichée avec la carte.
- **Sortie libre** : Échap met en pause à tout moment, « Arrêter là » termine sans pénalité, et les cartes faites restent comptées.
- **Données** : les originaux restent dans un bucket privé ; rien n'est collecté au-delà de ce que la planification et les statistiques utilisent.
- Tous les motifs du catalogue des anti-patterns sont refusés, en particulier Streak Manipulation, Notification Spam, Artificial Incompleteness et Attention Bait.

## Success

- **Démarrer** : depuis l'ouverture de l'app, la première carte s'affiche en une action et en moins de 5 secondes.
- **Finir** : au moins 80 % des sessions ouvertes vont jusqu'au bilan de fin (cartes terminées ou « Arrêter là »), plutôt que d'être abandonnées en cours de route.
- **Régularité sans pression** : révision au moins 5 jours sur 7, mesurée pour soi dans les statistiques, jamais affichée comme série.
- **Import** : un cours de 20 pages donne des cartes exploitables en moins de deux minutes, relecture comprise ; au moins 70 % des cartes générées sont acceptées sans modification [docs/Revise — Plan de conception.pdf, p. 10].
- **Mémorisation** : rétention mesurée proche de la cible FSRS de 90 %.

## Open questions

- Faut-il générer des cartes à partir d'images (photos de tableau, notes manuscrites) ?

## Artifacts

| Artefact | Pourquoi |
|---|---|
| Brief (`/strategize`) | Les critères de succès ci-dessus deviennent des hypothèses testables, et la question de l'apprentissage par la génération doit être tranchée avant de concevoir l'import. |
| Parcours (`/journey`) | Démarrer, rester et revenir sont les trois points de blocage ; chacun est un moment du parcours. |
| Maquettes (`/wireframe`) | 8 écrans, avec un écran de session sans navigation dont la structure décide de la réussite. |
| Inventaire des états (`/fortify`) | Interruptions, aucune carte due, retour après une absence, import échoué ou lent. |
| Accessibilité (`/include`) | Besoins attentionnels du TDAH, clavier complet, mouvement réduit. |
| Textes d'interface (`/articulate`) | Le ton sans culpabilisation repose surtout sur les mots : notes 1–4, fin de session, retour après absence. |
| Mesure (`/measure`, phase 4) | Les statistiques doivent montrer l'acquis sans devenir une mécanique de série. |

Écartés : `/investigate` (l'unique utilisateur est le concepteur), `/blueprint` (le système est déjà décrit dans le plan de conception), `/organize` (8 écrans à plat), `/localize` (français uniquement), `/specify` et `/present` (pas de passation à une autre équipe).
