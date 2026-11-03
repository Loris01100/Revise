## Voice and Tone Framework

### Voix

| Principe | Ce que c'est | Ce que ce n'est pas | Oui | Non |
|---|---|---|---|---|
| **Calme** | Phrases courtes, rythme posé, une information à la fois | Froid, administratif | « Pause. Lève-toi, bois un verre d'eau. » | « Il est recommandé d'effectuer une pause. » |
| **Direct** | Le verbe d'action d'abord, sans détour ni mise en scène | Sec, impératif à chaque ligne | « Réviser 5 cartes » | « C'est parti pour une super session ! » |
| **Sans jugement** | Décrit ce qui est fait, jamais ce qui manque | Félicitations, encouragements, reproches | « 5 cartes revues en 4 min. » | « Bravo ! » · « Tu as 120 cartes en retard. » |
| **Proche** | Tutoiement, mots de tous les jours | Familier, blagues, émojis | « Ta réponse » | « Balance ta réponse 😉 » |

### Ton selon le contexte

| Contexte | Ton | Exemple |
|---|---|---|
| Session en cours | Le plus effacé possible : libellés, aucune phrase | « Afficher la réponse » |
| Fin de session | Bref et factuel | « 5 cartes revues en 4 min. » |
| État vide | Une phrase qui explique, une action | « Commence par une matière. » |
| Erreur récupérable | Ce qui se passe, ce qui est sauf, quoi faire | « Ta connexion a expiré. Tes notes sont gardées sur cet appareil. » |
| Action destructive | Grave et précis : nommer l'objet et la conséquence | « Supprimer cette carte ? Son historique de révision sera perdu. » |

### Règles d'écriture

- **Tutoiement partout.**
- **Aucune marque de genre de la personne.** Pas d'adjectif ni de participe accordé à « tu » : la phrase porte sur l'action ou la chose, pas sur la personne.

  | À éviter | À écrire |
  |---|---|
  | Tu es prêt ? | On commence ? → **Réviser 5 cartes** |
  | Tu es à jour. | Tout est à jour. |
  | Tu es déconnecté. | Ta connexion a expiré. |
  | Tu es bloqué sur cette carte ? | La réponse s'affiche après 60 s sans saisie. |
  | Content de te revoir ! | *(rien : l'accueil est le même que d'habitude)* |
  | Es-tu sûr de vouloir supprimer ? | Supprimer cette carte ? |

- **Aucun point d'exclamation**, aucun émoji, aucune félicitation.
- **Aucun chiffre décoratif.** Un nombre n'apparaît que là où il sert à cet instant : la progression en session, le bilan de fin.
- **Pluriels et durées gérés par le format de message (ICU)**, jamais par concaténation : « 1 carte revue », « 5 cartes revues » ; « en moins d'une minute », « en 4 min », « en 1 h 05 ».
- **Raccourcis clavier** écrits après un point médian dans le libellé : « Garder · Entrée ». Sur téléphone, le raccourci disparaît.

## Copy Deck

`{n}`, `{durée}`, `{matière}` : valeurs du système. ⟷ : chaîne qui varie selon l'état.

### Accueil

| Élément | Texte |
|---|---|
| Action principale | Réviser 5 cartes ⟷ Réviser {n} carte(s) quand moins de 5 sont disponibles |
| Rappel clavier | Entrée |
| Chargement (dans le bouton) | Préparation… |
| Action secondaire | Session de {durée} min |
| Lien de durée | Changer la durée |
| Titre de liste | Matières |
| Pastille | À revoir |
| Liens du haut | Matières · Réglages |
| Premier lancement, titre | Commence par une matière. |
| Premier lancement, texte | Crée-la, ajoute quelques cartes, et ta première session sera prête. |
| Premier lancement, action | Créer ma première matière |
| Rien à revoir, titre | Tout est à jour. |
| Rien à revoir, texte | Prochaines cartes demain. ⟷ Prochaines cartes le {jour}. |
| Rien à revoir, action | Ajouter des cartes |
| Hors connexion | Pas de connexion. Tes cartes reviennent dès qu'elle revient. |

### Session

| Élément | Texte |
|---|---|
| Progression | {position} / {total} |
| Rappel de la session minutée | {durée} min, puis une pause. |
| Pause | Pause · Échap |
| Libellé du champ | Ta réponse |
| Aide sous le champ | Entrée pour voir la réponse · Maj+Entrée pour aller à la ligne |
| Bouton de révélation | Afficher la réponse |
| Titre de ta réponse | Ta réponse |
| Titre de la correction | Réponse |
| Source | Cours, p. {page} |
| Groupe des notes (lecteur d'écran) | Note ta réponse |
| Notes | 1 · À revoir · 2 · Difficile · 3 · Bien · 4 · Facile |
| Aide de « À revoir » | La carte revient aujourd'hui. |
| Aide de « Difficile » | La carte revient bientôt. |
| Aide de « Bien » | La carte revient dans quelques jours. |
| Aide de « Facile » | La carte revient plus tard. |
| Corriger | Corriger la note précédente |
| Parking | Noter une pensée · P |
| Indicateur d'attente | Enregistrement en attente |
| Indicateur rattrapé (lecteur d'écran) | Tout est enregistré. |

### Parking à pensées

| Élément | Texte |
|---|---|
| Libellé | Une pensée à garder pour plus tard |
| Aide | Elle t'attendra à la fin de la session. |
| Actions | Annuler · Échap — Garder · Entrée |
| Confirmation (lecteur d'écran) | Pensée gardée. |

### Pause

| Élément | Texte |
|---|---|
| Titre | Pause |
| Suggestion | Lève-toi, bois un verre d'eau. |
| Minuteur terminé | Pause terminée. |
| Actions | Reprendre · Entrée — Arrêter là |
| Champ du parking | Une pensée à garder pour plus tard · *texte indicatif :* Note-la ici… |
| Bouton du parking | Garder |

### Fin de session

| Élément | Texte |
|---|---|
| Bilan | {n} carte(s) revue(s) en {durée}. |
| Aucune carte faite | Session arrêtée avant la première carte. |
| Notes en attente | {n} note(s) partira/partiront dès que la connexion revient. |
| Titre des pensées | Tes pensées notées |
| Actions par pensée | Fait · Garder |
| Actions | Terminer — 5 cartes de plus |

### Matières

| Élément | Texte |
|---|---|
| Titre | Matières |
| Lien d'évitement | Aller aux cartes |
| Nouvelle matière | Nouvelle matière |
| Champs | Nom · Couleur |
| Actions de la matière | Ajouter une carte — Réviser cette matière |
| Recherche | Chercher une carte |
| Colonnes | Question · Type · État |
| Types | Question / réponse · Texte à trous · QCM · Réponse longue |
| États | Active · Suspendue |
| Actions par carte | Modifier · Suspendre ⟷ Réactiver · Supprimer |
| Matière sans carte | Pas encore de carte dans cette matière. |
| Recherche vide | Aucune carte ne contient « {recherche} ». · Effacer la recherche |
| Toast de suspension | Carte suspendue. · Annuler |
| Confirmation de suppression | Supprimer « {début de la question} » ? Son historique de révision sera perdu. · Supprimer — Garder |

### Ajouter une carte

| Élément | Texte |
|---|---|
| Titre | Nouvelle carte · {matière} |
| Champs | Question · Réponse · Explication (facultatif) |
| Texte indicatif de Réponse | La réponse attendue |
| Texte indicatif d'Explication | Ce qui aide à retenir |
| Texte à trous, aide | Marque le mot à retrouver avec ___. |
| QCM, champs | Choix 1 à 4 · Bonne réponse |
| Actions | Annuler — Ajouter et en créer une autre — Ajouter |
| Abandon | Abandonner cette carte ? · Abandonner — Continuer |

### Réglages

| Élément | Texte |
|---|---|
| Titre | Réglages |
| Section | Session |
| Durée | Durée de la session minutée · De 10 à 25 min |
| Révélation | Révéler la correction automatiquement · Quand rien n'est tapé pendant le délai choisi |
| Délai | Délai avant révélation · De 15 à 180 s |
| Section | Affichage |
| Thème | Thème · Comme l'appareil · Clair · Sombre |

## Error Message Inventory

| Déclencheur | Message | Action | Gravité |
|---|---|---|---|
| Session impossible à lancer (erreur serveur) | La session n'a pas pu démarrer. | Réessayer | Récupérable |
| Accès Cloudflare expiré | Ta connexion a expiré. Tes notes sont gardées sur cet appareil. | Se reconnecter | Récupérable, risque de perte évité |
| Carte non ajoutée | La carte n'a pas été ajoutée. Ce que tu as écrit est conservé. | Réessayer | Récupérable |
| Réglage non enregistré | Pas enregistré. Réessaie. | *(changer à nouveau)* | Récupérable |
| Question vide | Écris la question. | — | Validation |
| Réponse vide | Écris la réponse attendue. | — | Validation |
| QCM à moins de 2 choix | Ajoute au moins 2 choix. | — | Validation |
| QCM sans bonne réponse | Indique la bonne réponse. | — | Validation |
| Texte à trous sans trou | Marque le mot à retrouver avec ___. | — | Validation |
| Nom de matière vide | Donne un nom à la matière. | — | Validation |

