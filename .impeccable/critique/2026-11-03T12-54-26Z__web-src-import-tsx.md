---
target: Import et Relecture
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Dev\\Revise\\web\\src\\Import.tsx"
target_fingerprint: "sha256:47e1a13884b67ae160c79315552996e91272221841e95995d4e4769de9353d52"
target_path: "C:\\Dev\\Revise\\web\\src\\Import.tsx"
timestamp: 2026-11-03T12-54-26Z
slug: web-src-import-tsx
---
# Critique Import + Relecture — 28/40 (Bon)

Heuristiques : 1:3 2:3 3:2 4:3 5:2 6:3 7:3 8:3 9:3 10:3.

Spécificité : système visuel bien appliqué, mais surligneur absent en Relecture (prompt.ts ne demande pas ==terme==, nom de matière non surligné Review.tsx:106). Pastilles d'étapes rondes (style.css:1067) contre DESIGN.md. Détecteur : 0 constat sur les composants, 6 alertes de tokens style.css (faux positifs documentés, petite dérive dialog::backdrop rgb(20 20 19)), flat-type-hierarchy sur Import (h1/h2 19px vs corps 17px).

## Problèmes prioritaires
- [P1] Retour depuis Claude non conçu : page inchangée après copie, champ de collage à ~820px sur mobile. Fix : étape 1 marquée faite + bouton secondaire, visibilitychange → défiler vers l'étape 3, option « Coller la réponse » (clipboard.readText). /impeccable layout
- [P1] Entrée accepte sans lire, pas d'annulation (Review.tsx:73-80). Fix : ignorer e.repeat et Entrée ~400ms après affichage ; toast « Carte acceptée. Annuler ». /impeccable harden
- [P1] Surligneur absent des cartes importées. Fix : règle == dans le prompt, vérifier cœur Rust, <mark> sur le nom de matière. /impeccable colorize
- [P2] Erreur « commence par [ » contredit le bloc ```json ; message hors écran à 390px. /impeccable clarify
- [P2] aria-hidden/aria-keyshortcuts manquants sur .key (Review.tsx:199, Import.tsx:213), pastilles rondes, « Relire » pas primaire en fiche matière. /impeccable polish

## Profils
Alex : pas de touches Modifier/Supprimer, pas de carte précédente. Sam : noms de boutons incluent le raccourci ; bilan h1 pas lu. Casey : collage sous la ligne de flottaison, erreur hors écran, pied du dialogue Modifier coupé à 390px. Étudiant TDAH : pas de sens de la fin, Entrée en pilote automatique, 22 « Accepter » dans le tableau.

## Mineures
Prompt déplié ~1000px si copie refusée ; réponse 21px gras sous question grasse ; pas de repère pour le nombre de cartes ; vérifier pointer:coarse sur vrai téléphone.

## Questions
Import en deux écrans successifs ? Accepter doit-il avoir le focus par défaut ? ==terme== produit par Claude ?
