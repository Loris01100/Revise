## State Inventory

États absents des maquettes [wireframes-import.html] et du parcours [journey-import.md].

### Import — prompt

| État | Ce que l'utilisateur voit | Ce qu'il peut faire | Reprise |
|---|---|---|---|
| Aucun type coché | Le dernier type coché ne se décoche pas ; sous la liste : « Garde au moins un type. » au moment où il essaie | Cocher d'autres types | — |
| Nombre hors limites | Le champ ramène la valeur entre 5 et 60 quand il perd le focus ; aucune erreur affichée | Corriger | — |
| Copie refusée par le navigateur | **Voir le prompt** se déplie, le texte est sélectionné ; « Copie le texte sélectionné. » sous le bouton | `Ctrl+C`, ou sélection à la main | — |

### Import — collage

| État | Ce que l'utilisateur voit | Ce qu'il peut faire | Reprise |
|---|---|---|---|
| Champ vide | « Colle la réponse de Claude. » sous le champ, focus dans le champ | Coller | — |
| Aucun tableau trouvé (texte collé sans cartes, prompt recollé par erreur) | « Ce texte ne contient pas de cartes. Copie la réponse de Claude, celle qui commence par [ . » sous le champ ; le collage reste | Coller autre chose | — |
| Réponse coupée (JSON qui s'arrête en cours de route) | « La réponse semble coupée. Demande à Claude de la renvoyer en entier, puis colle-la ici. » ; le collage reste | Coller la réponse complète | — |
| JSON invalide pour une autre raison | « Claude a renvoyé un format illisible. Demande-lui de renvoyer uniquement le bloc JSON. » ; le collage reste | Coller une autre réponse | — |
| Tableau vide | « La réponse ne contient aucune carte. » ; le collage reste | Coller une autre réponse | — |
| Texte de plus de 1 Mo | « Ce texte est trop long pour un seul import. Découpe le cours et importe-le en plusieurs fois. » | Coller un lot plus petit | — |
| Envoi en cours | **Importer les cartes** désactivé, libellé « Import… » ; le champ reste lisible | Attendre | Le rapport remplace le bloc à l'arrivée |
| Hors connexion ou erreur serveur | « L'import n'a pas abouti. Le texte collé est conservé. » et **Réessayer** | Réessayer | Réessayer renvoie le même texte ; les cartes déjà créées par un envoi qui a réussi sans réponse sont écartées comme doublons |
| Accès expiré | Le bandeau commun : « Ta connexion a expiré. » **Se reconnecter** ; le collage est perdu au rechargement | Se reconnecter, puis recoller depuis Claude | La réponse est toujours chez Claude |

### Rapport d'import

| État | Ce que l'utilisateur voit | Ce qu'il peut faire | Reprise |
|---|---|---|---|
| Toutes les cartes sont des doublons | « Aucune nouvelle carte : toutes étaient déjà dans la matière. » ; action principale **Retour à la matière** | Revenir | — |
| Beaucoup de cartes écartées (plus de 10) | La liste dépliée défile ; les raisons identiques ne sont pas regroupées, chaque carte garde sa ligne | Lire, revenir à Claude | — |
| Question écartée très longue | Coupée à une ligne avec points de suspension ; la raison reste entière | — | — |

### Relecture

| État | Ce que l'utilisateur voit | Ce qu'il peut faire | Reprise |
|---|---|---|---|
| Chargement des brouillons | La progression et la carte gardent leur place, vides ; aucun indicateur sous 1 s | Attendre | — |
| Aucun brouillon (lien ouvert après une relecture finie) | Retour direct à la matière, sans message | — | — |
| Acceptation non enregistrée | La carte reste affichée ; « La carte n'a pas été acceptée. Réessaie. » au-dessus des actions ; le focus reste sur **Accepter** | Réessayer | La relecture ne saute jamais une carte non enregistrée |
| Suppression non enregistrée | Rien : la suppression part en arrière-plan à l'action suivante ; si elle échoue, la carte reste un brouillon | — | Elle revient à la prochaine relecture, jamais acceptée à tort |
| Carte supprimée ailleurs entre-temps (autre onglet) | Accepter ou supprimer réussit sans erreur visible ; la carte suivante s'affiche | — | — |
| Carte longue (réponse longue de 5 phrases, explication) | La carte défile ; sur téléphone, les actions restent fixées en bas | Faire défiler, décider | — |
| Accès expiré | Le bandeau commun ; les décisions déjà prises sont enregistrées | Se reconnecter | La relecture reprend à la première carte encore en brouillon |

## Edge Case Catalog

| Catégorie | Scénario | Comportement recommandé | Priorité |
|---|---|---|---|
| Comportement | Double clic sur **Importer les cartes** | Le bouton est désactivé dès le premier clic ; un second envoi passerait de toute façon par le dédoublonnage | Majeure |
| Comportement | Même réponse collée deux fois, à quelques minutes d'écart | Le second rapport annonce que toutes étaient déjà dans la matière | Mineure |
| Comportement | Retour arrière du navigateur depuis la relecture | Revient à la matière ; les brouillons attendent | Mineure |
| Comportement | Relecture ouverte dans deux onglets | Chaque onglet suit sa propre liste ; une carte déjà traitée dans l'autre réussit sans erreur (voir l'inventaire) | Mineure |
| Contenu | Claude renvoie un lot dans une autre matière par erreur (autre cours) | Rien ne le détecte ; la relecture permet de tout supprimer, carte par carte | Mineure |
| Temps | Brouillons laissés plusieurs semaines | Ils restent ; seule la ligne de la matière les rappelle, sans insistance | Mineure |

## Resilience Recommendations

- **Critique** : Import — Hors connexion ou erreur serveur (le collage doit survivre) ; Relecture — Acceptation non enregistrée.
- **Majeure** : Réponse coupée ; Aucun tableau trouvé ; Copie refusée par le navigateur ; double clic sur **Importer les cartes**.
- **Mineure** : Toutes les cartes sont des doublons ; Texte de plus de 1 Mo ; Aucun brouillon ; deux onglets ; retour arrière.
