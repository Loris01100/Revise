## State Inventory

États absents des wireframes [wireframes-revision.html] et du parcours [journey-revision.md].

### Accueil

| État | Ce que l'utilisateur voit | Ce qu'il peut faire | Reprise |
|---|---|---|---|
| Chargement de la file | Le bouton principal reste à sa place, libellé « Préparation… » avec un indicateur dans le bouton. Le bouton n'est jamais retiré ni déplacé. | Attendre ; Matières et Réglages restent utilisables | La première carte s'affiche dès que la file arrive |
| Moins de 5 cartes disponibles | « Réviser 2 cartes » : le libellé donne le nombre réel, la progression affiche « 1 / 2 » | Lancer la session | — |
| Hors connexion | Sous le bouton : « Pas de connexion. Tes cartes reviennent dès qu'elle revient. » Le bouton principal est désactivé. | Rien d'autre que patienter ; le message ne propose pas d'action inutile | Nouvel essai automatique toutes les 10 s ; le bouton se réactive seul |
| Erreur serveur au lancement | « La session n'a pas pu démarrer. » et un bouton **Réessayer** | Réessayer | Réessayer relance la même demande |
| Accès expiré (session Cloudflare Access) | « Ta connexion a expiré. » et un bouton **Se reconnecter** | Se reconnecter | Retour à l'accueil après connexion |

### Session focus

| État | Ce que l'utilisateur voit | Ce qu'il peut faire | Reprise |
|---|---|---|---|
| Note en attente d'envoi | En haut, à côté de la progression : une icône de nuage barré et « Enregistrement en attente ». Rien d'autre ne change. | Continuer à réviser normalement | Les notes partent dans l'ordre dès que le réseau revient ; l'indicateur disparaît quand la file est vide |
| Accès expiré pendant la session | Le même indicateur, puis à la fin de la carte en cours : « Ta connexion a expiré. Tes notes sont gardées sur cet appareil. » et **Se reconnecter** | Se reconnecter | Après connexion, les notes gardées sont envoyées et la session reprend à la carte suivante |
| Carte longue | Question, réponse et explication défilent dans la colonne ; la rangée des notes reste fixée en bas, toujours visible | Faire défiler, noter | — |
| Carte supprimée ailleurs entre-temps | Rien : la note est ignorée côté serveur, la session continue | — | — |
| Fin du temps en session minutée | La carte en cours se termine normalement ; la pause s'ouvre après sa note | Noter, puis Reprendre ou Arrêter là | — |

### Pause

| État | Ce que l'utilisateur voit | Ce qu'il peut faire | Reprise |
|---|---|---|---|
| Notes en attente pendant la pause | L'indicateur « Enregistrement en attente » reste visible en haut | Reprendre ou Arrêter là | Comme en session |

### Fin de session

| État | Ce que l'utilisateur voit | Ce qu'il peut faire | Reprise |
|---|---|---|---|
| Aucune carte faite | « Session arrêtée avant la première carte. » Pas de bilan chiffré. | Terminer | — |
| Aucune pensée notée | La section des pensées n'apparaît pas | Terminer, 5 cartes de plus | — |
| Notes encore en attente | Sous le bilan : « 3 notes partiront dès que la connexion revient. » | Terminer sans attendre | L'envoi continue en arrière-plan, y compris depuis l'accueil |

### Matières

| État | Ce que l'utilisateur voit | Ce qu'il peut faire | Reprise |
|---|---|---|---|
| Matière sans carte | À la place du tableau : « Pas encore de carte dans cette matière. » et **Ajouter une carte** ; **Réviser cette matière** est absent | Ajouter une carte | — |
| Rien à revoir dans la matière | **Réviser cette matière** reste actif et révise par anticipation les cartes les plus proches de leur échéance | Réviser | — |
| Recherche sans résultat | « Aucune carte ne contient « giffen ». » et **Effacer la recherche** | Effacer, modifier la recherche | — |
| Beaucoup de cartes (500 et plus) | Le tableau charge 50 cartes, puis les suivantes au défilement | Chercher, défiler | — |
| Nom de matière long | Tronqué avec points de suspension dans les listes, complet dans le titre et au survol | — | — |
| Suspendre | Toast « Carte suspendue. » avec **Annuler** pendant 5 s | Annuler | Annuler la réactive |
| Supprimer | Confirmation : « Supprimer « Qu'est-ce que l'élasticité-prix… » ? Son historique de révision sera perdu. » **Supprimer** / **Garder** | Confirmer ou garder | — |

### Ajouter une carte

| État | Ce que l'utilisateur voit | Ce qu'il peut faire | Reprise |
|---|---|---|---|
| Question ou réponse vide | À l'envoi, erreur sous le champ : « Écris la question. » / « Écris la réponse attendue. » | Compléter | La saisie est conservée |
| QCM incomplet | « Ajoute au moins 2 choix. » ou « Indique la bonne réponse. » sous la liste des choix | Compléter | — |
| Texte à trous sans trou | « Marque le mot à retrouver avec ___ . » sous la question | Corriger | — |
| Échec d'enregistrement | Erreur en haut de la fenêtre : « La carte n'a pas été ajoutée. » **Réessayer** ; la fenêtre reste ouverte et tout est conservé | Réessayer, Annuler | — |
| Fermeture avec saisie en cours | « Abandonner cette carte ? » **Abandonner** / **Continuer** | Choisir | — |

### Réglages

| État | Ce que l'utilisateur voit | Ce qu'il peut faire | Reprise |
|---|---|---|---|
| Échec d'enregistrement d'un réglage | Le réglage reprend sa valeur précédente et « Pas enregistré. Réessaie. » apparaît sous lui | Changer à nouveau | — |

## Edge Case Catalog

| Catégorie | Scénario | Comportement attendu | Priorité |
|---|---|---|---|
| Réseau | Onglet fermé alors que des notes attendent l'envoi | Les notes en attente sont stockées sur l'appareil (localStorage) et envoyées à la prochaine ouverture de l'app | Critique |
| Comportement | Double clic sur une note, ou `3` pressé deux fois | Seule la première note compte ; les touches de note sont ignorées jusqu'à l'affichage de la carte suivante | Critique |
| Comportement | `Entrée` pressée deux fois rapidement sur la question | La première révèle ; la seconde ne fait rien (`Entrée` ne note jamais) | Majeure |
| Temps | Révélation automatique activée, onglet en arrière-plan | Le délai ne court que quand l'onglet est visible | Majeure |
| Temps | Pause laissée ouverte, onglet en arrière-plan | Le minuteur se calcule sur l'heure réelle ; au retour, il affiche le temps restant juste, ou « Pause terminée » | Mineure |
| Comportement | `Échap` dans le parking à pensées | Ferme le parking seulement, sans ouvrir la pause | Majeure |
| Comportement | `Entrée` dans le parking avec un champ vide | Ferme le parking sans rien enregistrer | Mineure |
| Comportement | Rechargement de la page au milieu d'une carte | Les notes déjà données sont gardées ; la réponse en cours de saisie est perdue ; l'accueil s'affiche normalement | Mineure |
| Comportement | Deux onglets ouverts sur une session | Chaque onglet a sa propre session ; une même carte notée deux fois garde les deux notes dans l'historique | Mineure |
| Contenu | Pluriels et durées dans le bilan | « 1 carte revue », « 5 cartes revues » ; « en moins d'une minute », « en 4 min », « en 1 h 05 » ; aucune chaîne construite par concaténation | Mineure |

## Resilience Recommendations

**Critique**
- Accueil, Session : accès expiré pendant la session.
- Catalogue : notes en attente stockées sur l'appareil à la fermeture de l'onglet.
- Catalogue : double note sur une même carte.
- Session : note en attente d'envoi (indicateur).

**Majeure**
- Accueil : chargement de la file, hors connexion, erreur serveur au lancement.
- Session : carte longue.
- Ajouter une carte : échec d'enregistrement, fermeture avec saisie en cours.
- Catalogue : `Entrée` répétée, délai de révélation en arrière-plan, `Échap` dans le parking.

**Mineure**
- Accueil : moins de 5 cartes disponibles.
- Fin de session : aucune carte faite, aucune pensée, notes encore en attente.
- Matières : matière sans carte, recherche sans résultat, beaucoup de cartes, suspendre avec annulation.
- Ajouter une carte : validations.
- Réglages : échec d'enregistrement.
- Catalogue : pause en arrière-plan, parking vide, rechargement, deux onglets, pluriels.

**Cosmétique**
- Matières : nom de matière long.
