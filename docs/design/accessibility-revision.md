## Accessibility Audit — Per WCAG Principle

Périmètre : écrans de la phase 2 [wireframes-revision.html], parcours [journey-revision.md] et états [states-revision.md]. Cible : WCAG 2.2 AA, et au-delà pour l'attention (TDAH).

### Perceivable

**Couleurs calmes sans perte de contraste.** Le plan demande des couleurs calmes [plan de conception p. 8] ; une palette douce glisse facilement sous les seuils, et un texte pâle fatigue plus vite une attention déjà fragile. Échec possible de 1.4.3 et 1.4.11.
- Changement : texte courant ≥ 4,5:1, gros texte et bordures de contrôles ≥ 3:1, dans les deux thèmes. Le calme vient des surfaces, de l'espace et du peu d'éléments, jamais d'un texte gris clair.
- Fait quand : chaque paire texte/fond et chaque bordure de contrôle de DESIGN.md passe le contrôle de contraste, en clair et en sombre.

**Barre de temps de la session minutée.** Une barre seule ne dit rien à un lecteur d'écran (1.1.1, 4.1.2).
- Changement : `role="progressbar"` avec `aria-valuetext="8 min sur 15"`, mis à jour à la minute, sans annonce automatique.
- Fait quand : le lecteur d'écran lit « 8 min sur 15 » quand on atteint la barre.

**Couleur des matières.** Chaque matière a une couleur ; elle ne doit jamais être le seul moyen de l'identifier (1.4.1).
- Changement : le nom de la matière accompagne toujours sa couleur.
- Fait quand : en niveaux de gris, chaque carte et chaque liste reste attribuable à sa matière.

**Rangée des notes fixée en bas, au zoom.** À 400 % sur ordinateur ou sur un petit écran en paysage, une barre fixe recouvre la correction (1.4.10).
- Changement : la rangée des notes n'est fixée que si la hauteur de fenêtre dépasse 480 px ; en dessous, elle suit le contenu.
- Fait quand : à 400 % de zoom, la question, la correction et les quatre notes sont lisibles en défilant, sans chevauchement.

### Operable

**Raccourcis d'un seul caractère.** `1`–`4` et `P` sont des raccourcis d'une touche (2.1.4) ; actifs partout, ils se déclencheraient en tapant ailleurs ou par la commande vocale.
- Changement : ils ne sont actifs que lorsque le focus est dans la carte en cours, et jamais dans un champ de saisie. Chaque bouton les rappelle dans son libellé (« 3 · Bien »).
- Fait quand : taper « 3 » dans le champ de réponse ou dans la recherche des Matières écrit « 3 » et ne note rien.

**Corriger une note avec `Retour arrière`.** Le parcours prévoyait `Retour arrière` pour corriger la dernière note [journey-revision.md, Interaction Specifications] ; le focus étant dans le champ de la carte suivante, effacer sa saisie jusqu'au bout annulerait la note précédente sans le vouloir (3.2.2, 2.5.4).
- Changement : un bouton **Corriger la note précédente** dans la barre du haut de la carte suivante, présent jusqu'à la note de cette carte ; atteignable par `Maj+Tab`. Aucun raccourci.
- Fait quand : vider le champ avec `Retour arrière` ne modifie aucune note.

**Gestion du focus.**
- Nouvelle carte : focus dans le champ de réponse.
- Révélation : focus sur le groupe des notes.
- Pause : focus sur **Reprendre** ; au retour, focus là où il était.
- Fenêtres (parking, ajout de carte, confirmation de suppression) : focus piégé dans la fenêtre, `Échap` ferme, le focus revient à l'élément qui l'a ouverte (2.4.3).
- Fait quand : toute la phase 2 se parcourt au clavier, de l'accueil au bilan, sans souris et sans perdre le focus.

**Délais.** La révélation automatique est désactivée par défaut et réglable de 15 à 180 s ; la session minutée est choisie par l'utilisateur ; la clôture après 30 min d'inactivité ne perd rien. Conforme à 2.2.1. Seul le toast « Carte suspendue » avec **Annuler** pose un délai d'action.
- Changement : le toast reste tant qu'on ne fait pas une autre action, et ne disparaît jamais pendant qu'il a le focus ou le survol.
- Fait quand : on peut atteindre **Annuler** au clavier sans course contre la montre.

**Cibles tactiles sur téléphone.** **Pause** et **Noter une pensée** sont des boutons de 32 px de haut ; au pouce, dans les transports, c'est en dessous de 44 px (2.5.8 est respecté, pas la recommandation).
- Changement : sur téléphone, ces deux boutons font 44 px de haut au moins, avec 8 px d'écart avec leurs voisins.
- Fait quand : les zones touchables mesurées dans l'outil de développement font 44 × 44 px au moins.

### Understandable

**Champ de réponse sur téléphone sans libellé visible.** Le wireframe téléphone n'a qu'un texte indicatif, qui disparaît à la saisie (3.3.2).
- Changement : libellé visible « Ta réponse », comme sur ordinateur.
- Fait quand : le libellé reste visible pendant la saisie.

**Pause automatique annoncée.** En session minutée, la pause arrive à la fin du temps ; arrivant sans prévenir, elle surprend (3.2.5).
- Changement : au lancement, sous la barre : « 15 min, puis une pause. » ; la pause s'ouvre après la note de la carte en cours, jamais au milieu d'une saisie.
- Fait quand : aucune pause ne s'ouvre pendant que le champ de réponse a du texte non validé.

**Sens des quatre notes.** « À revoir », « Difficile », « Bien », « Facile » décrivent la mémorisation, pas la justesse ; sans repère, le choix redevient une décision à chaque carte.
- Changement : au survol et au focus, chaque note dit ce qu'elle déclenche (« Bien : la carte revient dans quelques jours »).
- Fait quand : le texte d'aide est lu par le lecteur d'écran avec le bouton (`aria-describedby`).

### Robust

**Structure et repères.** Une page = un `main` ; la barre de session (progression, pause, indicateur d'enregistrement) dans un `header`. Titres : `h1` par écran (la question en session, « Pause », la phrase du bilan, le nom de la matière) ; aucun niveau sauté. `lang="fr"` sur le document.
- Fait quand : la liste des titres et des repères du lecteur d'écran donne la structure de chaque écran.

**Contrôles natifs.** Interrupteur de révélation : `button role="switch"` avec `aria-checked`. Types de carte et thème : boutons `aria-pressed`. Durées et délai : `select` natif. Notes et choix de QCM : `button` natifs, groupés dans un `role="group"` nommé.
- Fait quand : axe ne relève aucune erreur de rôle ou de nom sur les écrans de la phase 2.

## Screen Reader Flow Documentation

| Changement d'état | Annonce | Mode | Focus |
|---|---|---|---|
| Nouvelle carte | « Carte 3 sur 5. Microéconomie. » puis la question, lue comme description du champ | polie | champ de réponse, décrit par la question (`aria-describedby`) |
| Correction révélée (`Entrée` ou délai) | « Correction : » puis le texte de la correction | polie | groupe des notes, nommé « Note ta réponse » |
| Note enregistrée | rien : la carte suivante s'annonce | — | carte suivante |
| Note en attente d'envoi | « Enregistrement en attente. » une seule fois | polie | inchangé |
| Envoi rattrapé | « Tout est enregistré. » | polie | inchangé |
| Pensée gardée | « Pensée gardée. » | polie | retour à l'élément d'origine |
| Pause ouverte | « Pause, 5 minutes. » | polie | **Reprendre** |
| Fin du minuteur de pause | « Pause terminée. » ; pas d'annonce à chaque seconde | polie | inchangé |
| Fin de session | la phrase du bilan, comme titre de page | — | **Terminer** |
| Accès expiré | « Ta connexion a expiré. Tes notes sont gardées sur cet appareil. » | assertive (`role="alert"`) | **Se reconnecter** |
| Erreur d'ajout de carte | « La carte n'a pas été ajoutée. » | assertive | **Réessayer** |
| Erreur de validation d'un champ | le message d'erreur, lié au champ (`aria-describedby`, `aria-invalid`) | — | premier champ en erreur |

## Keyboard Navigation Map

**Accueil.** Le focus est placé sur **Réviser 5 cartes** à l'ouverture, pour que `Entrée` démarre. L'ordre de tabulation suit l'ordre visuel : Matières, Réglages, puis le bouton principal, la session minutée, Changer la durée, les matières.

**Session.** Ordre : Corriger la note précédente (si présent), Pause, champ de réponse, Afficher la réponse ; après révélation, les quatre notes (flèches gauche/droite pour passer de l'une à l'autre, un seul arrêt de tabulation pour le groupe), puis Noter une pensée.

**Fenêtres.** Parking, ajout de carte, confirmation : focus piégé, `Échap` ferme (avec confirmation si une saisie est en cours dans l'ajout), retour du focus à l'élément d'origine.

**Matières.** Un lien d'évitement « Aller aux cartes » est le premier élément tabulable. Liste des matières : un seul arrêt, flèches haut/bas pour changer de matière.

## Remediation Plan

À appliquer pendant la construction de la phase 2.

### Critical — Blocks access for some users
- Corriger une note avec `Retour arrière`
- Raccourcis d'un seul caractère
- Gestion du focus

### High — Significantly degrades the experience
- Couleurs calmes sans perte de contraste
- Rangée des notes fixée en bas, au zoom
- Champ de réponse sur téléphone sans libellé visible
- Pause automatique annoncée

### Medium — Below WCAG AA compliance
- Barre de temps de la session minutée
- Délais (toast « Carte suspendue »)
- Structure et repères
- Contrôles natifs

### Low — Below best practices
- Cibles tactiles sur téléphone
- Sens des quatre notes
- Couleur des matières
