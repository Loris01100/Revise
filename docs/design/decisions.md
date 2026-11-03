# Décisions

## 2026-11-02 · L'accueil propose toujours 5 cartes, jamais l'arriéré complet
- Decided by: Claude, par défaut
- Why: afficher le nombre total de cartes en retard après une absence crée une dette visible qui décourage le démarrage, le point de blocage principal d'un utilisateur TDAH.
- Rejected: afficher le nombre de cartes dues par matière en premier plan (le plan le prévoit sur l'accueil ; il reste visible en secondaire).
- Rests on: PRODUCT.md, Users et Product Principles ; plan de conception p. 7.

## 2026-11-02 · Succès « Finir » à 80 % des sessions menées jusqu'au bilan
- Decided by: Claude, par défaut
- Why: le plan ne fixe pas de seuil ; 80 % laisse de la place aux vraies interruptions tout en signalant un écran de session qui fait décrocher.
- Rejected: le temps passé en session (une métrique d'engagement qui récompense la durée, pas la réussite).
- Rests on: Intent, Core principle 4 et Measurement without ethics.

## 2026-11-02 · Régularité visée à 5 jours sur 7, jamais affichée comme série
- Decided by: Claude, par défaut
- Why: la répétition espacée a besoin de régularité, mais un compteur de jours consécutifs est le motif Streak Manipulation.
- Rejected: série quotidienne ; aucun objectif de régularité.
- Rests on: plan de conception p. 8 (« pas de série punitive ») ; catalogue Intent, Streak Manipulation.

## 2026-11-02 · Import réussi si au moins 70 % des cartes générées sont acceptées sans modification
- Decided by: Claude, par défaut
- Why: le plan dit « cartes exploitables » sans seuil ; le taux d'acceptation se mesure directement à la relecture.
- Rejected: le nombre de cartes générées (une quantité ne dit rien de la qualité).
- Rests on: plan de conception p. 10.

## 2026-11-02 · Artefacts du projet : brief, parcours, maquettes, états, accessibilité, textes, mesure
- Decided by: Claude, par défaut
- Why: chaque artefact répond à un point de blocage ou à une contrainte de context-revise.md ; investigate, blueprint, organize, localize, specify et present n'apportent rien à un projet à un seul utilisateur, déjà décrit, en français.
- Rejected: la séquence complète « nouveau produit » d'Intent.
- Rests on: context-revise.md, Artifacts.

## 2026-11-02 · La relecture reste « accepter / modifier / supprimer », sans étape de reformulation imposée
- Decided by: le concepteur
- Why: les cartes générées ne privent pas d'un apprentissage utile ; le rappel actif en session (réponse tapée avant la correction) porte l'effort de mémorisation.
- Rejected: reformuler ou compléter une partie des cartes à la relecture ; en faire une hypothèse à tester.
- Rests on: réponse du concepteur, 2026-11-02.

## 2026-11-02 · Aucune notification de rappel, même optionnelle
- Decided by: Claude, par défaut
- Why: un rappel est une interruption venue de l'app, en contradiction avec la posture éthique (l'app se retire après la tâche) ; l'utilisateur garde ses propres rappels.
- Rejected: un rappel quotidien optionnel, activé par l'utilisateur.
- Rests on: context-revise.md, Ethical stance ; plan de conception p. 8.

## 2026-11-02 · La phase de révision manuelle sert à tester les hypothèses d'attention avant l'IA
- Decided by: Claude, par défaut
- Why: démarrer, rester et revenir ne dépendent pas de la génération ; les tester sur des cartes écrites à la main isole leur effet.
- Rejected: commencer par l'import, la fonction la plus visible.
- Rests on: brief-revise.md, Key Assumptions ; plan de conception p. 10.

## 2026-11-02 · Conception d'abord pour l'ordinateur au clavier, téléphone prévu dès la structure
- Decided by: le concepteur
- Why: la révision se fait surtout sur ordinateur pour le moment ; le téléphone viendra ensuite.
- Rejected: mobile d'abord ; les deux à égalité.
- Rests on: réponse du concepteur, 2026-11-02.

## 2026-11-02 · Les matières de l'accueil portent une pastille, sans nombre de cartes dues
- Decided by: Claude, par défaut
- Why: un nombre par matière reconstitue l'arriéré que l'accueil s'interdit d'afficher ; la pastille suffit à choisir une matière.
- Rejected: le nombre de cartes dues par matière en secondaire (plan de conception p. 7, et l'entrée du 2026-11-02 sur l'accueil à 5 cartes, révisée ici).
- Rests on: brief-revise.md, Guiding Principles (« Montrer l'acquis, jamais le manque »).

## 2026-11-02 · `Entrée` révèle la correction ; `Espace` et `P` ne servent pas pendant la saisie
- Decided by: Claude, par défaut
- Why: la réponse est tapée dans un champ, où `Espace` et `P` sont des caractères ; les garder comme raccourcis casserait la saisie.
- Rejected: `Espace` pour révéler et `P` pour le parking à tout moment (plan de conception p. 8).
- Rests on: journey-revision.md, Session focus.

## 2026-11-02 · La note reste à l'utilisateur, sans correction automatique de la réponse tapée
- Decided by: Claude, par défaut
- Why: une réponse juste peut être formulée autrement que la correction ; une comparaison automatique noterait faux et serait vécue comme un jugement.
- Rejected: comparaison de chaînes ; évaluation de la réponse par Claude (coût par carte, latence en session).
- Rests on: brief-revise.md, Key Assumptions & Open Questions.

## 2026-11-02 · Une session sans note depuis 30 min est close automatiquement, sans message au retour
- Decided by: Claude, par défaut
- Why: chaque note est déjà enregistrée ; proposer de « reprendre une session abandonnée » au retour ajouterait une décision et une trace d'échec.
- Rejected: proposer la reprise de la session au retour.
- Rests on: context-revise.md, Users (« revenir »).

## 2026-11-02 · La fin de session met « Terminer » en avant, « 5 cartes de plus » en secondaire
- Decided by: Claude, par défaut
- Why: la session doit avoir une fin visible ; enchaîner par défaut serait le motif Autoplay Chains.
- Rejected: enchaîner automatiquement sur 5 nouvelles cartes.
- Rests on: context-revise.md, Ethical stance.

## 2026-11-02 · Après une absence, l'accueil est identique à l'habitude
- Decided by: Claude, par défaut
- Why: tout message de retour, même bienveillant, rappelle l'absence ; la porte basse de 5 cartes suffit.
- Rejected: un message d'accueil après plusieurs jours.
- Rests on: brief-revise.md, hypothèse 3.

## 2026-11-02 · Révélation automatique de la correction : option dans les Réglages, avec délai réglable
- Decided by: le concepteur
- Why: rester bloqué sur une carte fait décrocher, mais un délai imposé presse ; le choix et la durée reviennent à l'utilisateur.
- Rejected: aucune révélation automatique ; révélation fixe après 60 s ; indice après 30 s.
- Rests on: réponse du concepteur, 2026-11-02.

## 2026-11-02 · Révélation automatique désactivée par défaut, délai de 60 s (15 à 180 s), aucun compte à rebours affiché
- Decided by: Claude, par défaut
- Why: désactivée, l'option ne change rien pour qui ne la cherche pas ; un compte à rebours visible ajouterait une pression ; toute frappe annule le délai, car l'utilisateur est en train de répondre.
- Rejected: activée par défaut ; compte à rebours visible.
- Rests on: journey-revision.md, Réglages.

## 2026-11-02 · Les quatre notes ont le même poids visuel
- Decided by: Claude, par défaut
- Why: mettre une note en avant pousserait vers elle et fausserait la planification FSRS ; c'est le motif Visual Misdirection appliqué à l'auto-évaluation.
- Rejected: « Bien » en action principale.
- Rests on: wireframes-revision.html, Session — correction.

## 2026-11-02 · Sur téléphone, les notes sont en deux rangées de deux
- Decided by: Claude, par défaut
- Why: quatre boutons sur une rangée de 390 px sont trop étroits pour le pouce et pour le libellé « Difficile ».
- Rejected: une rangée de quatre (journey-revision.md, version initiale).
- Rests on: wireframes-revision.html, Session — correction (téléphone).

## 2026-11-02 · Les Réglages portent aussi la durée de session minutée et le thème
- Decided by: Claude, par défaut
- Why: la durée doit pouvoir se changer sans encombrer l'accueil ; le thème clair et sombre est prévu par le plan.
- Rejected: un réglage du nombre de cartes nouvelles par jour (la valeur par défaut de 10 suffit tant qu'aucun besoin n'apparaît).
- Rests on: plan de conception p. 8 ; journey-revision.md, Accueil.

## 2026-11-02 · Note non enregistrée : la session continue, un indicateur discret signale la synchronisation en attente
- Decided by: le concepteur
- Why: bloquer la session ferait décrocher ; ne rien montrer laisserait croire que tout est enregistré.
- Rejected: continuer sans rien dire ; bloquer la session jusqu'au retour du réseau.
- Rests on: réponse du concepteur, 2026-11-02.

## 2026-11-02 · Les notes en attente d'envoi sont stockées sur l'appareil
- Decided by: Claude, par défaut
- Why: sans stockage local, fermer l'onglet hors connexion perdrait des révisions faites ; c'est une perte de données.
- Rejected: une file en mémoire seulement.
- Rests on: states-revision.md, Edge Case Catalog.

## 2026-11-02 · Le bouton principal donne le nombre réel quand moins de 5 cartes sont disponibles
- Decided by: Claude, par défaut
- Why: « Réviser 5 cartes » suivi d'une session de 2 cartes serait une promesse non tenue.
- Rejected: garder « Réviser 5 cartes » en toutes circonstances.
- Rests on: states-revision.md, Accueil.

## 2026-11-02 · Hors connexion, l'accueil ne propose aucune session en phase 2
- Decided by: Claude, par défaut
- Why: la révision hors ligne (PWA) est prévue en phase 4 ; d'ici là, la file de cartes vient du serveur.
- Rejected: mettre la file en cache dès la phase 2.
- Rests on: docs/ETAPES.md, Phase 4.

## 2026-11-02 · Pas de réglage d'animations propre à l'app ; elle suit `prefers-reduced-motion`
- Decided by: le concepteur
- Why: le réglage du système suffit ; un interrupteur de plus alourdirait les Réglages.
- Rejected: un interrupteur « animations réduites » dans les Réglages.
- Rests on: réponse du concepteur, 2026-11-02.

## 2026-11-02 · Corriger une note passe par un bouton, sans raccourci `Retour arrière`
- Decided by: Claude, par défaut
- Why: le focus est dans le champ de la carte suivante ; effacer sa saisie avec `Retour arrière` annulerait la note précédente sans le vouloir.
- Rejected: `Retour arrière` (journey-revision.md, version initiale) ; `Ctrl+Z`, qui annule déjà la saisie dans un champ.
- Rests on: accessibility-revision.md, Operable.

## 2026-11-02 · Les raccourcis `1`–`4` et `P` ne sont actifs que dans la carte en cours, hors champ de saisie
- Decided by: Claude, par défaut
- Why: un raccourci d'une seule touche actif partout se déclenche en tapant ailleurs (WCAG 2.1.4).
- Rejected: raccourcis globaux ; un réglage pour les désactiver.
- Rests on: accessibility-revision.md, Operable.

## 2026-11-02 · Tutoiement, et tournures sans marque de genre de la personne
- Decided by: le concepteur
- Why: l'app parle à une seule personne, sur un ton proche ; les accords au masculin ou au féminin n'ont pas à apparaître.
- Rejected: vouvoiement ; tournures neutres sans pronom ; écriture inclusive avec point médian.
- Rests on: réponse du concepteur, 2026-11-02.

## 2026-11-02 · Aucun point d'exclamation, aucun émoji, aucune félicitation
- Decided by: Claude, par défaut
- Why: le principe « sans jugement » exclut l'éloge autant que le reproche ; une félicitation après une bonne session devient une attente déçue après une mauvaise.
- Rejected: encouragements légers en fin de session.
- Rests on: brief-revise.md, Guiding Principles.

## 2026-11-02 · L'aide des notes décrit le prochain retour de la carte, sans durée exacte
- Decided by: Claude, par défaut
- Why: la durée réelle dépend de l'état FSRS de chaque carte ; une durée fixe dans le libellé serait fausse.
- Rejected: afficher l'intervalle calculé sous chaque note (comme Anki) : quatre nombres de plus à chaque carte.
- Rests on: accessibility-revision.md, Understandable.

## 2026-11-02 · Le type de carte à réponse développée s'appelle « Réponse longue »
- Decided by: le concepteur
- Why: le nom décrit ce que la carte demande, sans impératif dans une liste de types.
- Rejected: « Explique » (plan de conception p. 3) ; « Développer ».
- Rests on: réponse du concepteur, 2026-11-02. La valeur `explain` reste en base de données.

## 2026-11-02 · Monde visuel : surligneur sur polycopié
- Decided by: le concepteur
- Why: le geste de surligner pour retenir appartient déjà à la révision de l'utilisateur.
- Rejected: salle de musée (tirage) ; standard de la catégorie ; tableau des départs, échelle neutre, carte d'embarquement, grille de Crouwel, fil vertical, catalogue codé noir.
- Rests on: page de décision Impeccable, 2026-11-02 ; seed:60d530b333cbaa02.

## 2026-11-02 · Le fluo reste derrière le texte et se limite à la matière, au terme clé révélé et à la pastille « À revoir »
- Decided by: Claude, par défaut
- Why: le concepteur refuse le ludique ; un fluo partout le deviendrait, et un fluo en couleur de texte échoue au contraste.
- Rejected: fluo sur les boutons et la progression.
- Rests on: shape-revision.md, Selected direction.

## 2026-11-03 · La pastille des matières dit « Cartes du jour », plus « À revoir »
- Decided by: utilisateur
- Why: « À revoir » est aussi la note d'échec ; l'accueil étiquetait des matières entières avec ce mot.
- Rejected: « À revoir » ; « Au programme ».
- Rests on: /impeccable critique du 2026-11-03, P2.

## 2026-11-03 · « Noter une pensée » visible aussi avant la révélation ; le bilan ne montre d'abord que les pensées de la session
- Decided by: utilisateur (correctifs de la critique)
- Why: la pensée parasite arrive surtout pendant la réponse ; et les pensées gardées des sessions précédentes transformaient chaque bilan en arriéré.
- Rejected: parking accessible seulement par Échap → Pause avant la révélation ; liste de toutes les pensées non traitées à chaque bilan.
- Rests on: /impeccable critique du 2026-11-03, P1.

## 2026-11-03 · « Corriger la note précédente » disparaît 10 s après la note
- Decided by: utilisateur
- Why: corriger une erreur de touche, sans laisser une invitation permanente à ruminer.
- Rejected: bouton affiché jusqu'à la note suivante ; correction au bilan seulement.
- Rests on: /impeccable critique du 2026-11-03.

## 2026-11-03 · Réponse longue : `Entrée` va à la ligne, `Ctrl+Entrée` révèle ; un seul trou par texte à trous ; `Espace` ne note jamais
- Decided by: Claude, par défaut
- Why: une réponse longue s'écrit sur plusieurs lignes ; un texte à trous n'a qu'une réponse ; le focus arrive sur « 1 · À revoir » et `Espace` l'activait.
- Rests on: /impeccable critique du 2026-11-03, P2.
## 2026-11-03 · Tableau des cartes replié selon la largeur du détail, état affiché seulement hors « Active »
- Decided by: Claude, par défaut
- Why: à côté de la liste des matières, le tableau débordait entre 800 et 1000 px ; « Active » répété sur chaque ligne n'apprenait rien.
- Rejected: relever le point de rupture de l'écran à 1000 px, qui aurait aussi empilé la liste des matières.
- Rests on: /impeccable audit du 2026-11-03, P2 ; critique du même jour.

## 2026-11-03 · « Pensée gardée » s'affiche à la place de « Noter une pensée » pendant 3 s
- Decided by: Claude, par défaut
- Why: la confirmation n'était que lue au lecteur d'écran ; la barre du haut n'a pas la place sur téléphone, le bouton du geste si. Pendant la pause, la barre la porte.
- Rests on: /impeccable critique du 2026-11-03.

## 2026-11-03 · Import par copier-coller, sans API Claude payante
- Decided by: l'utilisateur
- Why: une clé API se facture à part de l'abonnement Claude ; pour une seule personne, un copier-coller de plus coûte moins qu'un crédit à surveiller. Claude lit lui-même le PDF ou le DOCX, ce qui supprime aussi l'extraction DOCX, le stockage R2 et le quota.
- Rejected: l'API Claude (environ 0,15 $ par cours avec Sonnet 5.5), gardée en phase 4 si le copier-coller devient pénible.
- Rests on: estimation du coût par cours du 2026-11-03.
