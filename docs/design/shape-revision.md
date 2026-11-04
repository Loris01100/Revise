# Revise : monde visuel de la phase 2

## Job and audience

L'unique utilisateur, étudiant avec un TDAH, révise ses cours seul, surtout sur ordinateur, le téléphone ensuite [PRODUCT.md]. Mode **Operate** : l'app sert une tâche répétée chaque jour (démarrer, répondre, noter, s'arrêter). Clair et sombre à égalité : le thème suit l'appareil.

## Outcome and proof

- Première carte en une action, en moins de 5 secondes ; au moins 80 % des sessions menées jusqu'au bilan [brief-revise.md, Goals].
- La preuve est l'écran de session lui-même : une question, un champ, une action, rien d'autre [wireframes-revision.html].

## Selected direction

**Surligneur sur polycopié.** Le monde du cours photocopié qu'on surligne pour retenir.

- **Fond** : blanc de photocopie légèrement grisé, grain de toner à peine visible ; jamais crème ni papier ancien.
- **Encre** : noir de toner pour tout le texte.
- **Surligneur** : un trait fluo posé *derrière* le texte, jamais en couleur de texte. Chaque matière a sa couleur de surligneur (jaune, rose, vert, bleu, orange).
- **Mouvement signature** : à la révélation, le terme clé de la correction reçoit son trait de surligneur, tracé de gauche à droite en 300 ms ; sans animation avec `prefers-reduced-motion`.
- **Typographie** : Atkinson Hyperlegible, conçue pour la lisibilité ; graisses 400 et 700 seulement.
- **Usage du fluo, borné** : la matière, le terme clé révélé, la pastille « À revoir ». Les boutons, la navigation et la progression restent en noir et gris : le fluo marque ce qu'on retient, il ne décore pas.

## Scope and boundaries

- Écrans de la phase 2 : accueil, session (question, correction, QCM), parking, pause, fin, matières, ajout de carte, réglages, et les états de [states-revision.md].
- Construction pilotée par le code, sans maquette image : la composition de référence est le croquis choisi.
- **À éviter** : tout ce qui rend ludique (plusieurs fluos sur un même écran, illustrations, mascotte, confettis) et tout ce qui fait « tech » (fond noir néon, police à chasse fixe).

## States and ranges

- Questions de 1 à 6 lignes ; réponses longues jusqu'à 15 lignes ; noms de matière jusqu'à 40 caractères ; de 1 à 30 matières ; jusqu'à 500 cartes par matière.
- États à rendre dans ce monde : chargement, hors connexion, enregistrement en attente, erreurs, vides [states-revision.md].

## Interaction and layout

- Structure des wireframes conservée : colonne centrale de 760 px en session, liste et détail dans Matières.
- Thème sombre : fond gris toner foncé, texte blanc cassé ; le surligneur reste derrière le texte, en teinte assombrie, avec un texte qui garde 4,5:1 de contraste.
- Contrastes : texte ≥ 4,5:1 sur le fond et sur chaque surligneur, dans les deux thèmes [accessibility-revision.md].

## Constraints and open decisions

- SolidJS + Vite, servi par le Worker [PRODUCT.md, Stack].
- Contrat de direction et DESIGN.md écrits au moment de la construction, pas avant [.claude/skills/impeccable/reference/new-work.md].
- Couleurs exactes des cinq surligneurs, en clair et en sombre, à fixer à la construction sous la contrainte de contraste.
