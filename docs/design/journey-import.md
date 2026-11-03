# Parcours d'import

## Problem Statement

L'utilisateur veut transformer un cours (PDF ou DOCX) en cartes de révision sans les écrire à la main. Revise n'appelle pas Claude [decisions.md, 2026-11-03, import par copier-coller] : le parcours passe par claude.ai ou Claude Code, puis revient dans Revise par un copier-coller. Chaque changement de fenêtre est un endroit où l'on décroche ; le parcours doit en compter le moins possible et ne jamais faire perdre ce qui a déjà été fait.

Critères de succès [brief-revise.md, Goals ; ETAPES.md, Phase 3] :
- un cours de 20 pages donne des cartes exploitables en moins de 5 minutes, copier-coller et relecture compris ;
- au moins 70 % des cartes importées sont acceptées sans modification ;
- aucune carte n'entre en révision sans avoir été acceptée [brief-revise.md, « Rien n'entre sans accord »].

Hors périmètre : envoi du fichier à Revise et génération par l'API Claude (phase 4 si le copier-coller devient pénible), import par chapitres.

## User Context & Variations

| Variation | Situation | Ce qui change |
|---|---|---|
| Habituelle | Un nouveau cours arrive, la matière existe déjà | Parcours principal |
| Matière nouvelle | Le cours ouvre une matière | « Nouvelle matière » d'abord (écran Matières), puis l'import depuis la matière créée |
| Réimport du même cours | Claude a renvoyé un lot qui recoupe les cartes existantes | Les doublons sont écartés au collage, sans rien demander ; le rapport les compte à part |
| Relecture interrompue | Onglet fermé ou autre chose à faire au milieu de la relecture | Les cartes non relues restent en brouillon ; la matière propose de reprendre la relecture |
| Réponse de Claude abîmée | Texte tronqué, JSON invalide, aucune carte valide | Le collage reste dans le champ, une phrase dit ce qui ne va pas ; rien n'est créé |

Appareil : ordinateur d'abord, Claude dans un autre onglet ou dans l'application de bureau. Sur téléphone, le même parcours passe par l'application Claude et le presse-papiers.

## Screen-by-Screen Flow

### 1. Matière (point d'entrée)

**Rôle** : partir du bon endroit. Les cartes appartiennent à une matière ; l'import commence donc depuis elle, et la matière n'a pas à être choisie une seconde fois.

- À côté de **Ajouter une carte**, une nouvelle action : **Importer des cartes**. Elle ouvre l'écran 2 sur cette matière (`/matieres/:id/import`).
- Si la matière contient des brouillons, une ligne au-dessus du tableau : « 18 cartes importées attendent ta relecture. » avec **Relire**. C'est la reprise d'une relecture interrompue. Le nombre est utile à cet instant : il dit l'effort restant.
- Matière sans carte : l'état vide propose **Importer des cartes** en action principale, **Ajouter une carte** en secondaire. Importer est le chemin le plus court vers une matière utilisable.

### 2. Import

**Rôle** : préparer la demande à Claude, puis recevoir sa réponse. Un seul écran pour l'aller et le retour : l'utilisateur revient sur l'onglet qu'il a quitté et y trouve le champ de collage, sans avoir à se souvenir où aller.

Trois blocs numérotés, dans l'ordre du geste :

1. **Le prompt** — nombre de cartes (20 par défaut, de 5 à 60) et types (les quatre cochés par défaut, au moins un). **Copier le prompt** ; le bouton devient « Prompt copié » pendant 3 s. Un lien replié **Voir le prompt** affiche le texte, sélectionnable, pour qui veut le lire ou si la copie échoue.
2. **Chez Claude** — une ligne, pas d'action : « Colle le prompt dans Claude avec ton cours en pièce jointe, puis copie sa réponse. »
3. **La réponse** — un grand champ de collage et **Importer les cartes**.

- Le nombre et les types sont gardés sur l'appareil, comme les Réglages : au cours suivant, il suffit de copier.
- Le champ accepte la réponse entière de Claude, texte autour et bloc ```json compris ; l'utilisateur n'a rien à nettoyer [ETAPES.md, 3.2].
- `Ctrl+Entrée` dans le champ lance l'import.

**Branches** :
- Champ vide → « Colle la réponse de Claude. » sous le champ, focus dans le champ.
- Texte illisible (aucun tableau, JSON invalide, tableau vide) → la phrase dit quoi faire, le collage reste en place (voir states-import.md).
- Toutes les cartes écartées → l'écran 3 s'affiche avec 0 carte à relire et la liste des raisons.

### 3. Rapport d'import

**Rôle** : dire ce qui est entré et ce qui ne l'est pas, puis mener à la relecture. Il remplace le bloc de collage sur le même écran ; il n'a pas de page à lui.

- Titre : « 22 cartes à relire. » Action principale : **Relire les cartes** (le focus y est posé).
- S'il y a des cartes écartées : « 3 cartes écartées » en dessous, dépliable. Chaque ligne donne le début de la question et la raison en clair (« La bonne réponse ne fait pas partie des choix »). Les doublons sont regroupés en une ligne : « 2 étaient déjà dans la matière. » Un doublon n'est pas une erreur, c'est le dédoublonnage qui a fonctionné.
- Action secondaire : **Importer un autre lot**, qui vide le champ et revient à l'écran 2.
- Aucune carte valide → « Aucune carte n'a pu être importée. » et la liste des raisons ; action principale **Coller une autre réponse**, le collage d'origine est remis dans le champ pour comparaison.

Rien n'est encore révisable à ce stade : les cartes sont en brouillon, ce qui rend l'étape sans risque. L'utilisateur peut partir ici et reprendre la relecture plus tard depuis la matière.

### 4. Relecture

**Rôle** : décider de chaque carte, une à la fois, aussi vite que la lecture le permet.

Contenu : la progression (`3 / 22`), le type de carte, la question, la réponse (la bonne proposition marquée dans un QCM, le trou rendu visible dans un texte à trous), l'explication et la page source (« p. 4 »). La carte est affichée telle qu'elle apparaîtra à la correction en session : c'est ce qu'il faut juger.

Trois actions :

| Action | Effet | Clavier |
|---|---|---|
| **Accepter** (principale) | La carte devient active, reçoit son état FSRS et entre en révision. Carte suivante. | Le focus est sur **Accepter** à chaque carte : `Entrée` |
| **Modifier** | Ouvre le formulaire de carte déjà utilisé dans Matières. **Enregistrer et accepter** enregistre et passe à la suivante ; **Annuler** revient à la carte, sans rien changer. | `Tab` puis `Entrée` |
| **Supprimer** | La carte est supprimée sans confirmation, un toast « Carte supprimée. » propose **Annuler** jusqu'à l'action suivante. Un brouillon n'a pas d'historique, une confirmation ralentirait chaque refus. | `Tab` `Tab` puis `Entrée` |

- Les cartes défilent dans l'ordre du cours, celui du lot.
- Pas de « Tout accepter » : accepter sans lire viderait la relecture de son sens, et le rythme d'une carte par `Entrée` reste rapide (decisions.md).
- **Retour** (en haut, et `Échap`) revient à la matière. Les cartes déjà traitées le restent, les autres attendent en brouillon.

### 5. Fin de relecture

**Rôle** : clore, et ouvrir la révision sans l'imposer.

- « 22 cartes relues : 20 acceptées, 2 supprimées. » Factuel, sans félicitation [copy-revision.md, Règles d'écriture].
- Action principale : **Réviser cette matière**. Secondaire : **Retour à la matière**.
- Toutes supprimées → « 22 cartes relues, aucune acceptée. » ; action principale **Importer un autre lot**.

## Device Variants

| Écran | Ordinateur | Téléphone |
|---|---|---|
| Import | Les trois blocs dans une colonne de lecture ; le champ de collage fait une dizaine de lignes | Même colonne. Le champ ne prend pas le focus à l'arrivée, sinon le clavier cache le bouton **Copier le prompt** |
| Relecture | Carte au centre, actions sous la carte | Actions fixées en bas de l'écran, à portée du pouce, **Accepter** le plus large ; la carte défile au-dessus |

Sur téléphone, l'aller-retour passe par l'application Claude. Si le navigateur recharge l'onglet au retour, le nombre et les types sont déjà gardés et la matière est dans l'adresse : seul le collage reste à faire.

## Multi-Channel Map

| Étape | Lieu | Ce qui doit tenir |
|---|---|---|
| Choisir le nombre et les types, copier le prompt | Revise | Les choix, gardés sur l'appareil |
| Joindre le cours, coller le prompt, attendre la réponse | Claude (claude.ai, application, Claude Code) | Rien côté Revise ; l'onglet reste ouvert sur l'écran d'import |
| Copier la réponse, la coller, importer | Revise | La matière (dans l'adresse) ; le collage, conservé dans le champ en cas d'erreur |
| Relire | Revise, maintenant ou plus tard | Les brouillons, en base : la relecture reprend là où elle s'est arrêtée, sur n'importe quel appareil |

Deux transitions, toutes deux faites par l'utilisateur. Le prompt dit à Claude de ne renvoyer qu'un bloc JSON, ce qui rend la copie de la réponse triviale (bouton de copie du bloc de code chez Claude).

## Interaction Specifications

- **Copier le prompt** : `navigator.clipboard.writeText`. Succès : libellé « Prompt copié » pendant 3 s et annonce au lecteur d'écran. Échec : **Voir le prompt** se déplie, le texte est sélectionné, et la ligne « Copie le texte sélectionné. » apparaît.
- **Importer les cartes** : bouton désactivé avec « Import… » pendant la requête ; le champ reste lisible.
- **Rapport** : le focus passe sur **Relire les cartes** ; le titre est annoncé.
- **Relecture** : après chaque décision, la carte suivante remplace la précédente sans animation de défilement (une transition de fondu de 150 ms au plus, aucune sous `prefers-reduced-motion`) ; le focus revient sur **Accepter** ; la progression est annoncée (« Carte 4 sur 22 »).
- **Accepter** est enregistré immédiatement (`PATCH /api/cards/:id`, `status: active`). En cas d'échec, la carte reste affichée avec « La carte n'a pas été acceptée. Réessaie. » ; la relecture ne saute jamais une carte non enregistrée.
- **Supprimer** est réversible par le toast jusqu'à l'action suivante : la carte disparaît de la relecture, mais la suppression ne part qu'à l'action suivante ou en quittant la relecture. **Annuler** la remet à l'écran. Si l'onglet se ferme avant, la carte reste un brouillon et reviendra à la prochaine relecture : rien n'est perdu ni accepté à tort.

## Flow Metrics & Success Criteria

| Mesure | Cible | Source |
|---|---|---|
| Temps entre l'ouverture de l'import et la dernière carte relue, cours de 20 pages | < 5 min | Chronomètre, essai de l'étape 3.5 |
| Cartes acceptées sans modification | ≥ 70 % | Fin de relecture : acceptées sans passage par **Modifier** |
| Cartes écartées au collage, hors doublons | < 10 % | Rapport d'import ; au-delà, c'est le prompt qu'il faut reprendre |

## Open Questions

- Une relecture de 40 cartes ou plus reste-t-elle sous les 5 minutes sans « Tout accepter » ? L'essai de l'étape 3.5 le dira.
