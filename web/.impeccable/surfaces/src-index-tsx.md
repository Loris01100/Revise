---
version: 1
slug: "src-index-tsx"
primary_target: "src/index.tsx"
related_targets: []
---

# Revise — interface de la phase 2

Mode **Operate**. Écrans : accueil, session (question, correction, QCM), parking, pause, fin, Matières, ajout/modification de carte, Réglages, et les états de docs/design/states-revision.md. Structure : docs/design/wireframes-revision.html ; textes : docs/design/copy-revision.md ; accessibilité : docs/design/accessibility-revision.md.

Terme clé : marqué `==terme==` dans la réponse ; sans marque, rien n'est surligné. Police servie par @fontsource.

## Direction contract

THESIS: la révision est un polycopié qu'on surligne pour retenir ; l'écran est une feuille, une question, un geste. Refuse le tableau de bord de flashcards (cartes à ombre, compteurs, badges colorés, série).

OWN-WORLD: fond gris de photocopie à grain de toner discret, encre noire, Atkinson Hyperlegible 400/700. Boutons noirs pleins ou cadrés d'un filet, coins 4 px, aucune ombre. Cinq surligneurs (jaune, rose, vert, bleu, orange) posés derrière le texte, une bande qui laisse le haut et le bas de la ligne libres ; jamais en couleur de texte, jamais sur un bouton.

STORY: l'utilisateur ouvre, appuie sur Entrée, répond, voit la correction se faire surligner, note, recommence ; il repart avec un bilan factuel et ses pensées parquées.

FIRST VIEWPORT: accueil en colonne de 480 px centrée : « Réviser 5 cartes » noir pleine largeur, focalisé, « Entrée » dessous ; « Session de 15 min » cadré ; liste des matières, chaque nom surligné de sa couleur, pastille « À revoir ». En haut : Revise à gauche, Matières · Réglages à droite. Session : barre fine « 3 / 5 », matière surlignée à côté, « Pause · Échap » à droite ; colonne de 760 px qui s'ouvre sur la question en 38 px gras, puis le champ « Ta réponse ».

FORM: surligneur sur polycopié, première de la liste ; seed:60d530b333cbaa02. Mouvement signature : à la révélation, le terme clé reçoit son trait de gauche à droite en 300 ms ; immobile sous prefers-reduced-motion.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
