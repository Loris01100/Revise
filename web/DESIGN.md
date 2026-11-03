---
name: Revise
description: Surligneur sur polycopié — une feuille, une question, un geste.
colors:
  paper: "light-dark(#ededea, #1c1c1b)"
  sheet: "light-dark(#fafaf7, #252524)"
  ink: "light-dark(#1c1c1b, #ecece7)"
  ink-2: "light-dark(#4d4d4a, #b0b0aa)"
  line: "light-dark(#7e7e7a, #85857f)"
  rule: "light-dark(rgb(28 28 27 / 0.14), rgb(236 236 231 / 0.14))"
  wash: "light-dark(rgb(28 28 27 / 0.06), rgb(236 236 231 / 0.07))"
  on-ink: "light-dark(#fafaf7, #1c1c1b)"
  error: "light-dark(#a3241b, #ff9f93)"
  hl-yellow: "light-dark(#ffea3d, #5c5300)"
  hl-pink: "light-dark(#ff9dcb, #7a2c52)"
  hl-green: "light-dark(#93efa4, #1e5c30)"
  hl-blue: "light-dark(#93d4ff, #1f4e77)"
  hl-orange: "light-dark(#ffba6b, #7a4512)"
typography:
  display:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "clamp(48px, 6vw, 72px)"
    fontWeight: 700
    lineHeight: 1.1
    fontFeature: "tnum"
  headline:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "clamp(27px, 1.6vw + 18px, 38px)"
    fontWeight: 700
    lineHeight: 1.26
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "clamp(26px, 2vw + 16px, 32px)"
    fontWeight: 700
    lineHeight: 1.2
  title-sm:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.5
  body-lg:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.5
  caption:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.5
rounded:
  r: "4px"
  dialog: "6px"
spacing:
  gutter: "clamp(16px, 4vw, 48px)"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "28px"
  xl: "40px"
  xxl: "64px"
components:
  button:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.r}"
    padding: "0 18px"
    height: "44px"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.r}"
    padding: "0 18px"
    height: "44px"
  button-primary-lg:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.r}"
    height: "60px"
  button-small:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.r}"
    padding: "0 12px"
    height: "36px"
  button-quiet:
    textColor: "{colors.ink}"
    rounded: "{rounded.r}"
    padding: "0 18px"
    height: "44px"
  button-quiet-hover:
    backgroundColor: "{colors.wash}"
  field:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.r}"
    padding: "12px 14px"
    height: "48px"
  chip:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.r}"
    padding: "0 14px"
    height: "40px"
  chip-pressed:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
  badge:
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.r}"
    padding: "1px 7px"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.r}"
    padding: "12px 18px"
  row:
    textColor: "{colors.ink}"
    padding: "8px 4px"
    height: "52px"
---

# Design System: Revise

## Overview

**Creative North Star: "Le polycopié surligné"**

L'écran est une feuille de cours photocopiée : un gris de photocopie léger, un grain de toner à peine perceptible, une encre noire unique pour tout le texte. Ce qu'on retient reçoit un trait de surligneur fluo, posé derrière les mots comme un vrai feutre biseauté, qui laisse libres le haut et le bas de la ligne. Rien d'autre ne porte de couleur.

La densité est basse et l'interface tient en une colonne : une question, un champ, une action. Les contrôles sont noirs pleins ou cadrés d'un filet gris, aux coins à peine adoucis, sans aucune ombre ; la profondeur vient du contraste papier / feuille / encre, pas d'une élévation. Clair et sombre sont à égalité : le thème suit l'appareil, et chaque token est une paire `light-dark()`.

Le monde refuse le tableau de bord de flashcards (cartes à ombre, compteurs, badges colorés, série), tout ce qui rend ludique (illustrations, mascotte, confettis) et tout ce qui fait « tech » (fond noir néon, police à chasse fixe).

**Key Characteristics:**
- Une seule famille, Atkinson Hyperlegible, en 400 et 700 uniquement.
- Encre noire sur gris de photocopie, grain de toner fixe en fond.
- Cinq surligneurs, toujours derrière le texte, jamais en couleur de texte, jamais sur un bouton.
- Coins de 4 px partout, filets de 1 px, zéro ombre.
- Un seul mouvement signature : le trait se pose de gauche à droite à la révélation.

## Colors

Une palette d'encre et de papier, presque achromatique, que seuls les cinq surligneurs viennent ponctuer.

### Primary
- **Encre de toner** (`ink`) : tout le texte, le bouton principal plein, la puce pressée, l'interrupteur actif, la barre de temps, le toast, l'anneau de focus. 14,5:1 sur le papier en clair, 14,4:1 en sombre.
- **Blanc sur encre** (`on-ink`) : texte posé sur un aplat d'encre (bouton principal, toast, lien d'évitement).

### Secondary
- **Les cinq surligneurs** (`hl-yellow`, `hl-pink`, `hl-green`, `hl-blue`, `hl-orange`) : jaune fluo, rose fluo, vert fluo, bleu fluo, orange fluo en clair ; leurs versions assombries en sombre. Chaque matière en possède un ; il est injecté localement par la variable `--hl` (jaune par défaut). Encre sur chaque surligneur : ≥ 8,9:1 en clair, ≥ 6,6:1 en sombre. Le jaune sert aussi à la sélection de texte.

### Tertiary
- **Rouge de correction** (`error`) : messages d'erreur et bordure d'un champ invalide, uniquement.

### Neutral
- **Gris de photocopie** (`paper`) : fond de page, sous le grain ; aussi fond des dialogues et du dock de notation.
- **Feuille** (`sheet`) : surface un ton plus claire (plus claire aussi en sombre) pour boutons cadrés, champs, puces, ligne courante de la liste latérale, bandeau d'alerte.
- **Encre atténuée** (`ink-2`) : texte secondaire, indications, raccourcis clavier, en-têtes de tableau. 7,2:1 en clair, 7,8:1 en sombre.
- **Filet** (`line`) : bordure de tout contrôle (bouton, champ, puce, interrupteur, pastille, dialogue). ≥ 3,4:1, assez pour se lire comme une limite.
- **Trait de séparation** (`rule`) : séparateurs de lignes de liste, de barres, de tableau ; encre à 14 %.
- **Lavis** (`wash`) : survol des éléments discrets (bouton discret, navigation, lignes cliquables) ; encre à 6–7 %.

### Named Rules
**The Highlighter-Behind Rule.** Le fluo est un fond de texte en bande biseautée, jamais une couleur de texte, jamais le fond d'un bouton, d'une puce ou d'une barre. En clair, il se multiplie avec l'encre (`mix-blend-mode: multiply`) comme sur le papier ; en sombre, il reste normal.

**The One Subject, One Colour Rule.** Le fluo marque deux choses seulement : le nom d'une matière, dans sa couleur, et le terme clé révélé de la correction, dans la couleur de la matière de la carte. Une liste de matières montre donc une couleur par ligne ; un écran de session n'en montre qu'une.

**The Ink-Only Controls Rule.** Boutons, navigation, progression, interrupteurs et pastilles restent en encre, feuille et filet. L'état actif s'exprime par l'aplat d'encre, pas par une couleur.

## Typography

**Display Font:** Atkinson Hyperlegible (avec system-ui, sans-serif)
**Body Font:** Atkinson Hyperlegible (avec system-ui, sans-serif)

**Character:** Une seule famille, choisie pour la lisibilité, servie localement par @fontsource. La hiérarchie se fait par la taille et le passage 400 → 700, jamais par une seconde police ni par les capitales.

### Hierarchy
- **Display** (700, clamp 48–72 px, 1,1, chiffres tabulaires) : le minuteur de la pause, seul.
- **Headline** (700, clamp 27–38 px, 1,26, −0,01em) : la question de la session ; passe à clamp 22–27 px une fois la réponse révélée.
- **Title** (700, clamp 26–32 px, 1,2) : titre d'état de l'accueil et du bilan ; le nom de matière en tête du détail suit la même logique (clamp 26–34 px). Les titres de dialogue sont à 22 px / 1,3.
- **Title-sm** (700, 19 px) : mot-symbole Revise, titre de barre, titres de section du bilan, titre « Pause ».
- **Body-lg** (400, 19 px) : choix de QCM, champ de réponse ; la réponse correcte est à 21 px en 700.
- **Body** (400, 17 px, 1,5) : texte courant ; explications limitées à 68ch.
- **Label** (700, 15 px) : libellés de champ, titres de section des réglages et de liste (en encre atténuée), position « 3 / 5 » en chiffres tabulaires.
- **Caption** (700, 13 px) : pastille « Cartes du jour », mention de choix (« Ton choix »), en-têtes de tableau. Jamais en capitales.

### Named Rules
**The Two Weights Rule.** 400 et 700, rien d'autre. Un écart de rang se dit par la taille ou la graisse, pas par l'italique, l'espacement des lettres ou les capitales.

**The Shortcut-After Rule.** Le raccourci clavier suit le libellé (« Pause · Échap »), en encre atténuée et 400 ; il disparaît sur écran tactile. Il est caché du nom lu (`aria-hidden`) et déclaré par `aria-keyshortcuts`.

## Layout

Une colonne centrée par tâche. L'accueil et les réglages tiennent dans 480 px, la session dans 760 px ; marge haute fluide (clamp 40–120 px pour l'accueil, 32–96 px pour la session). La gouttière latérale est `gutter` (clamp 16–48 px) partout : barres, alertes, colonnes.

Les barres hautes font 64 px de haut, séparées du contenu par un trait `rule`. Matières est une vue liste / détail (colonne latérale de 240–340 px, trait vertical) ; sous 800 px elle devient une pile qui montre l'une ou l'autre. Le tableau des cartes se replie en blocs dès que le détail fait moins de 640 px de large (requête de conteneur `detail`), à côté de la liste comme seul. Sous 600 px, les quatre boutons de note passent en grille 2 × 2 et le bouton « Voir la réponse » devient plein et pleine largeur. Le dock de notation colle au bas de l'écran seulement quand la hauteur dépasse 480 px.

Rythme d'espacement observé : 8, 12, 16, 20, 28, 40, 48, 64 px. Les lignes de liste font au moins 52 px, les réglages 72 px. Toute cible tactile fait au moins 44 px.

## Elevation & Depth

Système plat, sans aucune ombre portée. La profondeur se lit par tons : le papier gris au fond, la feuille plus claire pour ce qu'on manipule, l'aplat d'encre pour l'action principale et le toast. Les dialogues reposent sur le papier, cerclés d'un filet, au-dessus d'un voile d'encre à 40 %. Le grain de toner est fixe (`background-attachment: fixed`) et se reprend sur le dock collant pour qu'il se fonde dans la page.

### Named Rules
**The No-Shadow Rule.** Aucune `box-shadow` d'élévation. La seule ombre du code est un filet intérieur de 1 px qui épaissit la bordure d'un champ invalide.

## Shapes

Coins de 4 px (`r`) sur tout : boutons, champs, puces, interrupteur, pastille, toast, survol de navigation et de ligne. Seuls les dialogues, plus grands, prennent 6 px (`dialog`). Le curseur de l'interrupteur est un carré à coins de 2 px, pas une pastille ronde ; le seul cercle est l'indicateur de chargement. Les bordures sont des filets de 1 px pleins ; les tirets marquent une seule chose, la réponse de l'utilisateur rappelée à la correction. Le blanc d'un texte à trous est un trait de 2 px sous la ligne.

## Components

### Buttons
Sobres et nets, comme un tampon d'encre.
- **Shape:** coins légèrement adoucis (4 px), filet de 1 px, 44 px de haut minimum, libellé en 700.
- **Primary:** aplat d'encre, texte `on-ink` ; survol vers 16 % de papier. Grande variante à 60 px et 19 px pour l'action de départ de l'accueil.
- **Default:** feuille cadrée d'un filet ; survol à 7 % d'encre, appui à 12 %.
- **Quiet:** sans bordure ni fond, lavis au survol.
- **Small:** 36 px, 15 px ; remonte à 44 px au doigt.
- **Focus:** anneau d'encre de 2 px, décalé de 3 px, commun à tout l'app.
- **Disabled:** opacité 0,45, fond inchangé.
- Transitions de 150 ms sur la courbe `ease`.

### Chips
- **Style:** feuille cadrée d'un filet, 40 px, 15 px.
- **State:** pressée = aplat d'encre et texte en 700.

### Inputs / Fields
- **Style:** feuille, filet de 1 px, coins de 4 px, 48 px minimum, padding 12 × 14 px ; le textarea grandit avec son contenu (`field-sizing: content`). Placeholder en encre atténuée.
- **Focus:** l'anneau d'encre commun.
- **Error:** bordure et filet intérieur en rouge de correction, message en 15 px / 700 dessous.

### Navigation
Barre de 64 px : Revise à gauche en 19 px / 700, liens Matières · Réglages à droite en 700, lavis et coins de 4 px au survol. En session, la barre porte la position « 3 / 5 », le nom de matière surligné, puis « Corriger la note précédente » pendant 10 s (« Corriger » sur téléphone), et « Pause · Échap » à droite, puis une barre de temps de 3 px en encre sur trait.

### Lists (rows)
Lignes de 52 px séparées par des traits `rule`, nom tronqué sur une ligne ; lavis au survol. Dans la colonne latérale, la ligne courante prend la feuille et le 700.

### Badge « Cartes du jour »
Texte d'encre en 13 px / 700 dans un filet `line` de 1 px, coins de 4 px, padding 1 × 7 px. Le fluo reste au nom de la matière sur la même ligne.

### Switch
52 × 30 px, coins de 4 px, curseur carré de 20 px en encre atténuée ; actif = aplat d'encre et curseur `on-ink` glissé de 22 px en 200 ms.

### Surligneur (signature)
Le trait est un dégradé incliné à 104°, une bande de 64 % de la hauteur de ligne calée vers le bas, qui laisse libres le haut de la ligne et un liseré dessous, aux bouts biseautés de 0,2em ; il se répète proprement sur chaque ligne d'un texte coupé. À la révélation, le terme clé (`==terme==` dans la réponse, ou le blanc d'un texte à trous) reçoit son trait de gauche à droite en 300 ms après 140 ms, sur `ease` ; sans animation sous `prefers-reduced-motion`. Sans marque dans la réponse, rien n'est surligné.

### Toast
Aplat d'encre, coins de 4 px, centré en bas à 24 px, monte de 8 px en 200 ms.

## Do's and Don'ts

### Do:
- **Do** poser le fluo derrière le texte, en bande biseautée, avec la variable `--hl` de la matière.
- **Do** garder les contrôles en encre, feuille et filet de 1 px `line`, coins de 4 px.
- **Do** dire l'état actif par l'aplat d'encre (bouton principal, puce pressée, interrupteur).
- **Do** écrire chaque nouvelle couleur en paire `light-dark()` et vérifier l'encre à ≥ 4,5:1 sur elle dans les deux thèmes.
- **Do** placer le raccourci clavier après le libellé, en encre atténuée, masqué au doigt.
- **Do** garder des cibles de 44 px minimum et l'anneau de focus d'encre de 2 px.

### Don't:
- **Don't** utiliser un surligneur comme couleur de texte, ni comme fond de bouton, de puce, de pastille ou de barre de progression.
- **Don't** ajouter d'ombre portée, de carte flottante ou de dégradé décoratif.
- **Don't** introduire une deuxième police, une graisse autre que 400 et 700, ni des libellés en capitales.
- **Don't** ajouter compteurs de série, badges colorés, illustrations, mascotte ou confettis.
- **Don't** utiliser un fond noir néon ou une police à chasse fixe.
- **Don't** animer autre chose que le trait de révélation au-delà des transitions d'état de 150–200 ms.
