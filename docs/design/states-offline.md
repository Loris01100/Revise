## Inventaire des états

| Écran ou élément | État | Ce qu'on voit | Ce qu'on peut faire | Retour à la normale |
|---|---|---|---|---|
| Accueil | Hors ligne, cartes gardées | Matières de la dernière visite en ligne ; « Pas de connexion. Tu révises les cartes gardées sur cet appareil, tes notes partiront dès qu'elle revient. » | Réviser jusqu'à 5 cartes dues de la file gardée, ou une session minutée sur toute la file | Nouvel essai toutes les 10 s et au retour du réseau ; la file gardée est remise à jour |
| Accueil | Hors ligne, rien de gardé | « Pas de connexion. Tes cartes reviennent dès qu'elle revient. » ; boutons de session désactivés | Rien à réviser | Idem |
| Accueil | Réseau très lent (4 s) | Comme hors ligne, avec les dernières données gardées | Idem | La réponse suivante du réseau efface l'avis |
| Démarrage de session | Réseau lent (8 s) ou coupé | Session ouverte sur la file gardée, sans attendre | Réviser | Session, notes et clôture envoyées dans l'ordre au retour, avec leurs heures réelles |
| Fin de session | Hors ligne | « N notes partiront dès que la connexion revient. » | « 5 cartes de plus » sur ce qui reste dans la file gardée | — |
| Fin de session | Hors ligne, file gardée vide | « Pas de connexion, et plus de carte gardée sur cet appareil. Les suivantes arrivent avec la connexion. » | Terminer, Refaire ces cartes | — |
| Statistiques | Hors ligne, déjà ouvertes en ligne | « Pas de connexion : chiffres de ta dernière visite en ligne. » au-dessus des chiffres | Lire | Recharger en ligne |
| Statistiques | Hors ligne, jamais ouvertes | « Pas de connexion. Réessayer » | Réessayer | — |
| Schéma Mermaid | Module absent hors ligne | Source du schéma en bloc de code | Lire | Rendu à la prochaine ouverture en ligne |
| Dessin | Jamais chargé en ligne | « Dessin indisponible » | Continuer la carte | Les dessins des cartes gardées sont chargés à la préparation |
| Matières, édition, import | Hors ligne | Messages d'échec existants (« Pas enregistré. Réessaie. »), saisie conservée | Réessayer | Hors périmètre : seule la révision fonctionne sans réseau |
| App | Nouvelle version déployée | Rien : la nouvelle version prend la main à l'ouverture suivante | — | Une page déjà ouverte garde ses modules (version précédente conservée dans le cache) |

## Cas limites

| Cas | Comportement |
|---|---|
| Carte notée sur un autre appareil, encore dans la file gardée | Peut être revue une deuxième fois ; FSRS planifie chaque note à l'heure où elle est donnée. File remise à jour à chaque accueil en ligne |
| Carte supprimée ou suspendue pendant la révision hors ligne | La note reçoit une 404 et sort de la file d'envoi, le reste part |
| File gardée préparée il y a plusieurs jours | Les cartes dues le sont toujours ; les nouvelles cartes du jour restent celles du jour de préparation |
| Connexion Access expirée pendant le hors ligne | Bandeau « Ta connexion a expiré. Tes notes sont gardées sur cet appareil. » ; la file attend la reconnexion |
| Stockage de l'appareil plein | La file gardée reste en mémoire pour la page ; la note en cours est toujours enregistrée |
| Deux personnes sur le même appareil | Hors ligne, la seconde voit les matières et la file de la première ; accepté (usage personnel) |
| Deux onglets | Chacun envoie la file ; notes et sessions sont idempotentes sur leur id |
| Première visite jamais faite en ligne | Rien à afficher : la PWA demande une première ouverture en ligne |

## Recommandations

- **Fait** : délai de 4 s puis réponse gardée (service worker), délai de 8 s au démarrage de session, 20 s sur toute requête, garde du stockage plein, source Mermaid hors ligne, version précédente gardée après déploiement, avis hors ligne sur les statistiques.
- **Mineur, laissé** : modifier des cartes hors ligne (file d'envoi pour PATCH /cards) ; à faire si la relecture dans le métro devient un besoin.
