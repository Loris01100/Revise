## But de l'écran

Montrer ce qui est acquis et le temps réellement donné, pour soi, sans rien qui ressemble à une dette. L'écran se lit en quelques secondes puis se ferme : il ne relance pas, ne compare pas, ne fixe pas d'objectif.

## Chaînes but → signal → indicateur

| But | Signal | Indicateur affiché | Calcul |
|---|---|---|---|
| Voir l'acquis | Des cartes tiennent longtemps sans être revues | **Cartes maîtrisées** sur cartes actives | `card_state.state = 'review'` et `stability >= 21` (jours), par personne |
| Savoir ce qui vient, sans arriéré | Les révisions des prochains jours | **À venir sur 7 jours**, une barre par jour, de demain à J+7 | `due` groupé par jour local ; ce qui est déjà dû n'y figure pas : « aujourd'hui » montrerait l'arriéré |
| Voir le temps donné | Temps passé à répondre, pas onglet ouvert | **Temps de révision par semaine**, 8 semaines | Somme de `reviews.duration_ms`, chaque note plafonnée à 5 min (une carte oubliée à l'écran ne gonfle pas le total) |
| Régularité sans pression (5 jours sur 7) | Jours avec au moins une note | **Jours de révision sur les 7 derniers** | Jours locaux distincts de `reviews.reviewed_at` ; un nombre, pas une suite de cases vides |
| Mémorisation (cible FSRS 90 %) | Cartes déjà apprises encore retrouvées | **Cartes retrouvées**, 30 derniers jours | Part des notes ≥ 2 sur les cartes déjà notées au moins un jour plus tôt ; affiché seulement à partir de 20 notes |

## Contre-indicateurs et refus

- Pas de série, pas de jours manqués marqués, pas de case vide pour un jour sans révision : un jour sans note n'apparaît pas.
- Pas de total « en retard » ni d'arriéré : la file l'absorbe déjà (voir `context-revise.md`, Ethical stance).
- Pas d'objectif de temps ni de ligne cible sur le graphique hebdomadaire : plus de temps n'est pas mieux.
- Pas de comparaison entre personnes : chaque indicateur est filtré par `user_id`.
- Le taux de sessions finies (critère de succès 80 %) reste hors de l'écran : l'afficher pousserait à ne pas s'arrêter. Il se lit en base si besoin.
- La rétention sous 90 % n'est pas colorée en erreur : c'est un réglage de FSRS, pas une faute.

## Limites

- Le jour local vient du fuseau envoyé par le navigateur (`tz`, minutes) ; un voyage décale l'historique d'un jour au plus.
- `duration_ms` mesure de l'affichage de la carte à la note : il inclut la lecture de la correction, pas les pauses.
- Avec une seule personne et peu de notes, la rétention bouge beaucoup : en dessous de 20 notes, l'écran ne l'affiche pas.

## Plan de suivi

- Après deux semaines d'usage : l'écran est-il ouvert, et après quoi ? Si jamais ouvert, il n'a pas sa place dans la navigation principale.
- Après un mois : la rétention mesurée est-elle proche de 90 % ? Sinon, revoir le paramètre de rétention de FSRS, pas l'écran.
