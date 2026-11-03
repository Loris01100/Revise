# Parcours de révision

## Problem Statement

L'utilisateur veut mémoriser ses cours sans devoir décider quoi réviser, ni pour combien de temps. Le parcours doit franchir les trois moments où la révision échoue : démarrer, rester, revenir [brief-revise.md, Gap].

Critères de succès [brief-revise.md, Goals] :
- première carte affichée en une action et en moins de 5 secondes après l'ouverture ;
- au moins 80 % des sessions menées jusqu'au bilan ;
- révision au moins 5 jours sur 7.

Hors périmètre : import et relecture des cartes générées (parcours d'import, phase 3), écran Statistiques (phase 4).

## User Context & Variations

| Variation | Situation | Ce qui change |
|---|---|---|
| Habituelle | Ouvre l'app sur ordinateur, quelques cartes dues | Parcours principal |
| Premier lancement | Aucune matière, aucune carte | L'accueil mène à la création d'une matière et des premières cartes |
| Retour après absence | Plusieurs jours sans réviser, beaucoup de cartes dues | Strictement le même accueil que d'habitude : 5 cartes, aucun compte de retard |
| Rien à revoir | Aucune carte due ni nouvelle carte disponible aujourd'hui | L'accueil dit que tout est à jour et quand la prochaine carte revient |
| Session interrompue | Onglet fermé ou changé en cours de session | Chaque note est déjà enregistrée ; au retour, l'accueil est l'accueil normal |

Appareil : ordinateur au clavier d'abord. Le téléphone est prévu dès la structure (voir Device Variants).

## Screen-by-Screen Flow

### 1. Accueil

**Rôle** : démarrer sans décision.

- Action principale, seule mise en avant : **Réviser 5 cartes**. `Entrée` la déclenche dès l'ouverture.
- Action secondaire : **Session de 15 min**. La durée se règle de 10 à 25 min et la dernière valeur choisie est conservée.
- En dessous, la liste des matières. Une matière qui a des cartes à revoir porte une pastille, sans nombre. Un clic ouvre la matière (écran 6).
- Aucun compteur global, aucune série, aucune date de dernière session.

**Composition de `quick5`** : les 5 cartes dues les plus en retard. S'il y en a moins de 5, le complément vient des cartes nouvelles (10 par jour au plus) [plan de conception p. 7]. Les matières et les types de cartes alternent.

**Branches** :
- Aucune matière → l'action principale devient **Créer ma première matière** (écran 6).
- Des matières mais aucune carte → **Ajouter des cartes**.
- Rien à revoir → « Tout est à jour. Prochaines cartes demain. » L'action principale devient **Ajouter des cartes**, la session de 15 min reste disponible et révise par anticipation les cartes les plus proches de leur échéance.

### 2. Session focus

**Rôle** : rester. Une carte à la fois, rien d'autre à l'écran.

Contenu : la question, un champ de réponse déjà focalisé, une progression discrète (`3 / 5` en `quick5`, une fine barre de temps écoulé en session minutée), et un bouton pause discret dans un coin.

États d'une carte :

| État | Ce qui est visible | Clavier | Transition |
|---|---|---|---|
| Question | Question, champ de réponse focalisé | Saisie libre ; `Entrée` révèle ; `Maj+Entrée` passe à la ligne | → Révélée |
| Révélée | La réponse tapée, la correction, l'explication et la page source ; quatre notes | `1` à revoir · `2` difficile · `3` bien · `4` facile | Note enregistrée → carte suivante, ou Fin |
| QCM, question | Question et choix numérotés | `1`–`4` choisit, puis la correction s'affiche | → Révélée |

- La note revient toujours à l'utilisateur. La réponse tapée est affichée à côté de la correction pour qu'il juge lui-même ; rien n'est noté automatiquement.
- Le champ vide est accepté : `Entrée` révèle quand même. Un trou de mémoire est une information, pas une erreur.
- Chaque note est enregistrée immédiatement (`POST /api/sessions/:id/reviews`), ce qui rend toute interruption sans perte.
- `Échap` met en pause à tout moment. `P` ouvre le parking à pensées quand le champ de réponse n'a pas le focus (après la révélation).

### 3. Parking à pensées

**Rôle** : capter une pensée parasite sans quitter la session.

- Un petit champ par-dessus la carte : « Une pensée à garder pour plus tard ». `Entrée` enregistre et referme, `Échap` referme sans enregistrer.
- La carte reste en place, avec la réponse en cours conservée.
- Le même champ est présent sur l'écran Pause, pour les pensées qui arrivent pendant la saisie.

### 4. Pause

**Rôle** : souffler sans perdre le fil. Accessible par `Échap`, et proposée automatiquement à la fin d'une session minutée.

- Minuteur de pause de 5 min, une suggestion simple (se lever, boire un verre d'eau), le champ du parking à pensées.
- **Reprendre** (`Entrée`) revient à la carte exacte, avec la réponse en cours.
- **Arrêter là** termine la session et mène au bilan ; les cartes faites restent comptées.
- À la fin du minuteur, rien ne se déclenche seul : l'écran indique que la pause est finie et attend.

### 5. Fin de session

**Rôle** : clore sur ce qui est acquis et vider le parking.

- Bilan : cartes revues, temps passé. Pas de score, pas de pourcentage d'échecs.
- Les pensées parquées pendant la session, chacune avec **Fait** et **Plus tard**. Celles des sessions précédentes sont repliées sous « {n} pensées gardées plus tôt ».
- Action principale : **Terminer** (retour à l'accueil). Action secondaire : **5 cartes de plus**. Rien ne s'enchaîne sans action.

### 6. Matières

**Rôle** : préparer le contenu, hors révision.

- Liste des matières ; **Nouvelle matière** demande un nom et une couleur.
- Page d'une matière : ses cartes, une recherche, **Ajouter une carte** (type, question, réponse, choix pour un QCM, explication), et **Réviser cette matière** (mode `subject`).
- Une carte se modifie, se suspend ou se supprime. Supprimer demande une confirmation qui nomme la carte ; suspendre est réversible sans confirmation.
- Une carte ajoutée à la main est active d'emblée et entre dans la file dès le lendemain, comme une carte nouvelle.

### 7. Réglages

**Rôle** : adapter la session une fois, pour ne plus y penser ensuite. Accessible par un lien discret depuis l'accueil, jamais pendant une session.

- **Révéler la correction automatiquement** : interrupteur, désactivé par défaut.
- **Délai avant révélation** : visible seulement quand l'interrupteur est activé ; 60 s par défaut, réglable de 15 s à 180 s par pas de 15 s.
- Chaque réglage s'applique dès la carte suivante, sans bouton Enregistrer.

Effet en session : quand l'option est active et que le champ de réponse reste vide pendant le délai, la correction s'affiche comme avec `Entrée`. Toute frappe dans le champ annule le compte à rebours pour cette carte. Aucun compte à rebours n'est affiché.

## Device Variants

**Ordinateur (cible principale)** : tout le parcours se fait au clavier. `Entrée` démarre, révèle et reprend ; `1`–`4` notent ; `Échap` met en pause ; `P` ouvre le parking. La carte occupe une colonne centrale de lecture confortable.

**Téléphone (prévu dès la structure)** :
- Les quatre notes forment deux rangées de deux grands boutons en bas d'écran, à portée de pouce.
- **Afficher la réponse** est un bouton sous le champ, car le clavier virtuel n'a pas d'`Entrée` fiable dans un champ multiligne.
- La pause passe par le bouton du coin ; le parking par un bouton visible après la révélation.
- Le clavier virtuel ne doit jamais masquer le champ ni le bouton de révélation.

L'adaptation complète au téléphone (gestes, mode hors ligne) relève de `/transpose` en phase 4.

## Copy Specifications

Chaînes indicatives ; `/articulate` les fixe.

| Endroit | Chaîne |
|---|---|
| Accueil, action principale | Réviser 5 cartes |
| Accueil, action secondaire | Session de 15 min |
| Accueil, rien à revoir | Tout est à jour. Prochaines cartes demain. |
| Accueil, premier lancement | Créer ma première matière |
| Session, champ de réponse | Ta réponse… |
| Session, notes | À revoir · Difficile · Bien · Facile |
| Parking | Une pensée à garder pour plus tard |
| Pause | Pause. Lève-toi, bois un verre d'eau. |
| Pause, actions | Reprendre · Arrêter là |
| Fin | 5 cartes revues en 4 min. |
| Fin, actions | Terminer · 5 cartes de plus |

Le ton ne juge jamais : pas de « bravo », pas de « dommage », pas de mention du retard.

## Interaction Specifications

- **Transitions** : passage d'une carte à l'autre par un fondu court (200 ms) ; aucun mouvement avec `prefers-reduced-motion`.
- **Focus** : le champ de réponse reçoit le focus à chaque nouvelle carte ; à la révélation, le focus passe sur la rangée de notes ; au retour de pause, il revient là où il était.
- **Enregistrement** : optimiste. La carte suivante s'affiche tout de suite ; si l'envoi de la note échoue, il est retenté en arrière-plan sans bloquer la session (le détail relève de `/fortify`).
- **Interruption** : une session sans note depuis 30 min est close automatiquement, avec les cartes déjà faites. Au retour, aucun message « session abandonnée ».
- **Annuler** : la dernière note peut être corrigée tant que la carte suivante n'a pas reçu la sienne, par le bouton **Corriger la note précédente** dans la barre du haut ; aucun raccourci clavier.
- **Lecteur d'écran** : chaque nouvelle carte est annoncée (« Carte 3 sur 5 », puis la question) ; la révélation annonce la correction.

## Flow Metrics & Success Criteria

| Mesure | Seuil | Source |
|---|---|---|
| Temps entre l'ouverture et la première carte affichée | < 5 s, une action | horodatage client |
| Sessions menées jusqu'au bilan (fin ou « Arrêter là ») | ≥ 80 % | table `sessions`, `ended_at` |
| Jours avec au moins une session | ≥ 5 sur 7 | table `sessions` |
| Retours après 3 jours d'absence ou plus | aussi fréquents que les sessions ordinaires | table `sessions` |
| Rétention mesurée (notes ≥ 2 sur cartes en révision) | proche de 90 % | table `reviews` |

## Open Questions

- Le minuteur de pause de 5 min doit-il être réglable ?
