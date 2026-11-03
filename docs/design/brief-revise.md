# Revise : réviser ses cours en sessions courtes, sans décision ni culpabilité

## Context

Un étudiant avec un TDAH révise seul ses propres cours, fournis en PDF ou DOCX, sur ordinateur ou sur téléphone [PRODUCT.md, Users]. La répétition espacée avec rappel actif est la méthode de mémorisation la mieux étayée, et des outils l'offrent déjà gratuitement.

Ces outils supposent un utilisateur qui fabrique ses cartes, choisit son paquet, règle sa session et absorbe seul l'arriéré. Pour cet utilisateur, chacune de ces étapes est un point où la session n'a pas lieu [context-revise.md, Users].

## Gap

Trois moments font échouer la révision, et aucun ne tient au contenu [context-revise.md, Users] :

- **Démarrer.** Fabriquer des fiches demande la même énergie que réviser. Ouvrir un outil de répétition espacée oblige ensuite à choisir un paquet, une durée, un ordre.
- **Rester.** Une notification, une pensée parasite ou un élément d'interface suffit à sortir de la session.
- **Revenir.** Après quelques jours d'absence, les outils existants affichent l'arriéré complet, souvent plusieurs centaines de cartes, puis une série remise à zéro. Le retour devient une dette.

## Opportunity

Les briques existent maintenant à coût quasi nul pour un seul utilisateur. Claude lit un PDF de cours en entier et en tire des cartes structurées. FSRS planifie mieux que les anciens algorithmes. Les paliers gratuits Cloudflare suffisent à héberger le tout [docs/Revise — Plan de conception.pdf, p. 3, 9].

Revise peut donc retirer chaque décision du chemin : le cours devient des cartes en une dépose, et la session démarre en une action. Elle est bornée, protégée des interruptions, et ne présente jamais de dette.

## Goals

- La première carte s'affiche en une action et en moins de 5 secondes après l'ouverture de l'app.
- Au moins 80 % des sessions ouvertes vont jusqu'au bilan de fin.
- Révision au moins 5 jours sur 7, sans affichage de série.
- Un cours de 20 pages donne des cartes exploitables en moins de deux minutes, relecture comprise. Au moins 70 % des cartes générées sont acceptées sans modification.
- Rétention mesurée proche de 90 %, la cible FSRS.

## Constraints

- Une seule personne pour concevoir, construire et utiliser. Pas de date imposée.
- Un Worker Cloudflare : Hono, cœur Rust en WebAssembly, D1, SolidJS. Le temps CPU par requête est limité sur le palier gratuit.
- Aucun coût variable : les cartes sont générées par Claude hors de l'app (abonnement), puis collées en JSON. Collage limité à 1 Mo.
- Interface en français uniquement. Un PDF de 600 pages au maximum par requête, au-delà découpage par chapitres.

## Guiding Principles

- **L'app décide, l'utilisateur révise.** Pendant une session, la seule question posée est celle de la carte.
- **Toujours une porte basse.** Il existe toujours une session de 5 cartes, quel que soit le retard accumulé.
- **Montrer l'acquis, jamais le manque.** Ni série, ni compteur de retard, ni message de reproche.
- **Rien n'entre sans accord.** Une carte générée est un brouillon jusqu'à son acceptation.

## Key Assumptions & Open Questions

Hypothèses, chacune avec ce qui la réfute :

1. **Si** l'accueil propose une seule action, « Réviser 5 cartes », **alors** les sessions démarrent plus souvent qu'avec un choix de paquet et de durée, **parce que** le coût de démarrage est le principal frein. Réfutée si, après trois semaines, moins de 5 jours sur 7 comptent une session.
2. **Si** la session n'a ni navigation, ni notification, et offre un parking à pensées, **alors** au moins 80 % des sessions vont jusqu'au bilan, **parce que** les sorties viennent d'interruptions captées par l'interface. Réfutée si les abandons restent fréquents même sans aucune pensée parquée.
3. **Si** l'accueil ne montre jamais l'arriéré, **alors** le retour après une absence de 3 jours ou plus se fait sans délai supplémentaire, **parce que** la dette visible décourage le redémarrage. Réfutée si les retours après absence restent plus rares que les sessions ordinaires.
4. **Si** les cartes sont générées par Claude à partir du cours, avec le prompt fourni par Revise, **alors** au moins 70 % sont acceptées sans modification, **parce que** le prompt impose une notion par carte, la page source et le rappel actif. Réfutée si la relecture prend plus de temps que la rédaction à la main.
5. **Si** la réponse est tapée avant la correction, **alors** la rétention reste proche de 90 % sans rédaction des cartes par l'utilisateur, **parce que** l'effort de rappel en session porte la mémorisation [decisions.md, 2026-11-02, relecture]. Réfutée si la rétention mesurée reste sous 80 %.

Questions ouvertes :

- Faut-il générer des cartes à partir d'images (photos de tableau, notes manuscrites) ?
- Que se passe-t-il si une réponse tapée est juste mais formulée autrement que la correction ? La note reste-t-elle entièrement à l'utilisateur ?

### Landscape

| Option | Ce qu'elle fait bien | Ce qui bloque cet utilisateur |
|---|---|---|
| Anki | FSRS intégré, gratuit, très configurable | Cartes à rédiger, choix du paquet, arriéré affiché en entier, réglages nombreux |
| Quizlet | Création rapide, jeux | Gamification, rappels et publicité qui sollicitent l'attention ; répétition espacée faible |
| RemNote, Mochi | Cartes intégrées aux notes | Prise de notes requise avant la révision ; interface dense |
| Générateurs IA de cartes (NotebookLM et autres) | Cartes tirées d'un document en quelques secondes | Pas de planification espacée, ou export vers un autre outil à configurer |
| Relire ses cours | Aucun outil, aucun réglage | Reconnaissance passive au lieu du rappel actif ; pas de fin claire |

L'espace libre est la combinaison : génération depuis le cours, planification FSRS, et une session conçue pour une attention fragile. Le coût de changement est nul, puisqu'il n'y a pas de cartes existantes à migrer.

## Proposed Scope (Phase 1)

Dans l'ordre de la feuille de route [docs/ETAPES.md] :

1. **Fondations** : accès protégé, base de données, déploiement.
2. **Révision manuelle** : matières, cartes écrites à la main, FSRS, session focus (`quick5` et minutée), pause, parking à pensées, bilan de fin. Elle permet de tester les hypothèses 1, 2, 3 et 5 avant l'arrivée de l'IA.
3. **Import** : prompt à copier, génération par Claude hors de l'app, collage du JSON, relecture. Elle teste l'hypothèse 4.

Différé à la phase 4 : écran Statistiques, mode hors ligne, import par chapitres, traitement en arrière-plan, export.

Hors périmètre : partage de cartes, plusieurs utilisateurs, cartes à partir d'images (en attente de décision), notifications de rappel.
