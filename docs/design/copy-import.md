## Copy Deck

Voix, ton et règles d'écriture : [copy-revision.md](copy-revision.md). `{n}`, `{matière}` : valeurs du système. ⟷ : chaîne qui varie selon l'état. Pluriels gérés par `Intl.PluralRules`, jamais par concaténation.

### Matière (ajouts)

| Élément | Texte |
|---|---|
| Action d'import | Importer des cartes |
| Brouillons en attente | {n} carte(s) importée(s) attend(ent) ta relecture. |
| Action de reprise | Relire |
| État du brouillon dans le tableau | Brouillon |
| Action sur un brouillon (à la place de « Suspendre ») | Accepter |
| Matière sans carte, action principale | Importer des cartes |

### Import

| Élément | Texte |
|---|---|
| Titre de page | Importer des cartes · {matière} |
| Titre de l'onglet | Import · Revise |
| Étape 1 | Le prompt |
| Champ nombre | Nombre de cartes |
| Groupe de types | Types |
| Types | Question / réponse · Texte à trous · QCM · Réponse longue |
| Action | Copier le prompt ⟷ Prompt copié (3 s) |
| Annonce lecteur d'écran | Prompt copié. |
| Lien replié | Voir le prompt ⟷ Masquer le prompt |
| Étape 2 | Chez Claude |
| Consigne | Colle le prompt dans Claude avec ton cours en pièce jointe, puis copie sa réponse. |
| Étape 3 | La réponse |
| Champ | Réponse de Claude |
| Placeholder | Colle ici la réponse entière |
| Action | Importer les cartes ⟷ Import… |
| Rappel clavier | Ctrl+Entrée |

### Rapport d'import

| Élément | Texte |
|---|---|
| Titre | {n} carte(s) à relire. |
| Sous-titre | Elles entreront en révision une fois acceptées. ⟷ Elle entrera en révision une fois acceptée. |
| Action principale | Relire les cartes ⟷ Relire la carte |
| Cartes écartées (replié) | {n} carte(s) écartée(s) |
| Ligne d'une carte écartée | {début de la question} — {raison} |
| Carte écartée sans question lisible | Carte {position} — {raison} |
| Ligne des doublons | {n} étai(en)t déjà dans la matière. |
| Action secondaire | Importer un autre lot |
| Aucune carte valide, titre | Aucune carte n'a pu être importée. |
| Aucune carte valide, action | Coller une autre réponse |
| Toutes en doublon, titre | Aucune nouvelle carte : toutes étaient déjà dans la matière. |
| Toutes en doublon, action | Retour à la matière |

Les raisons d'une carte écartée sont celles du cœur Rust (`core/src/cards.rs`), affichées telles quelles avec une majuscule initiale : elles nomment le champ fautif (« « answer » manquant »), ce qui sert aussi à les recopier à Claude.

### Relecture

| Élément | Texte |
|---|---|
| Titre de l'onglet | Relecture · Revise |
| Retour | {matière} (avec la flèche ; libellé accessible : Retour à la matière) |
| Progression | {i} / {n} |
| Annonce lecteur d'écran à chaque carte | Carte {i} sur {n}. |
| En-tête de carte | {type} · p. {page} ⟷ {type} quand la page est inconnue |
| Action principale | Accepter · Entrée (sur téléphone : Accepter) |
| Actions secondaires | Modifier · Supprimer |
| Toast de suppression | Carte supprimée. **Annuler** |
| Formulaire, titre | Modifier la carte |
| Formulaire, action principale | Enregistrer et accepter |
| Formulaire, sortie | Annuler |

### Fin de relecture

| Élément | Texte |
|---|---|
| Bilan | {n} carte(s) relue(s) : {a} acceptée(s), {s} supprimée(s). ⟷ sans la partie « supprimée(s) » quand {s} = 0 |
| Aucune acceptée | {n} carte(s) relue(s), aucune acceptée. |
| Action principale | Réviser cette matière ⟷ Importer un autre lot quand aucune n'est acceptée |
| Action secondaire | Retour à la matière |

## Error Message Inventory

| Déclencheur | Texte | Place |
|---|---|---|
| Champ vide | Colle la réponse de Claude. | Sous le champ |
| Aucun tableau JSON | Ce texte ne contient pas de cartes. Copie la réponse de Claude, celle qui commence par [ . | Sous le champ |
| JSON coupé (fin de texte inattendue) | La réponse semble coupée. Demande à Claude de la renvoyer en entier, puis colle-la ici. | Sous le champ |
| Autre JSON invalide | Claude a renvoyé un format illisible. Demande-lui de renvoyer uniquement le bloc JSON. | Sous le champ |
| Tableau vide | La réponse ne contient aucune carte. | Sous le champ |
| Plus de 1 Mo | Ce texte est trop long pour un seul import. Découpe le cours et importe-le en plusieurs fois. | Sous le champ |
| Réseau ou serveur | L'import n'a pas abouti. Le texte collé est conservé. **Réessayer** | Au-dessus de l'action |
| Copie refusée | Copie le texte sélectionné. | Sous **Copier le prompt** |
| Dernier type décoché | Garde au moins un type. | Sous les types |
| Acceptation non enregistrée | La carte n'a pas été acceptée. Réessaie. | Au-dessus des actions |

Ton : erreur récupérable, une phrase pour ce qui se passe, une pour quoi faire, jamais de « invalide » adressé à l'utilisateur. La faute n'est jamais la sienne : c'est le texte, ou Claude, qui est en cause.
