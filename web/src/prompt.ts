import type { CardType } from "./api";

// Consigne propre à chaque type, avec le format attendu par la session et l'éditeur
const RULES: Record<CardType, string> = {
  qa: `- "qa" (question / réponse) : une question précise, une réponse courte (une phrase ou quelques mots).`,
  cloze: `- "cloze" (texte à trous) : "question" est une phrase du cours où un seul terme clé est remplacé par ___ (trois tirets bas, une seule fois). "answer" est le terme manquant, seul.`,
  mcq: `- "mcq" (QCM) : "choices" contient 3 ou 4 propositions plausibles, une seule juste, pas toujours à la même position. "answer" reprend mot pour mot la proposition juste.`,
  explain: `- "explain" (réponse longue) : une question qui demande d'expliquer, de comparer ou de justifier. "answer" est la réponse attendue en 2 à 5 phrases.`,
};

/** Prompt à donner à Claude avec le cours en pièce jointe. */
export function buildPrompt(count: number, types: CardType[]): string {
  return `Tu prépares des cartes de révision (répétition espacée) à partir du cours joint.

Règles :
- Environ ${count} cartes. Couvre toutes les notions clés du cours, dans l'ordre du cours, plutôt que de détailler une seule partie.
- Une seule notion par carte. Une liste de 4 éléments au plus peut tenir dans une carte ; au-delà, découpe-la.
- Fais travailler le rappel actif : la question doit se comprendre seule, sans le cours sous les yeux, et ne pas contenir sa réponse.
- N'invente rien : chaque réponse doit être vérifiable dans le cours. Si le cours ne dit pas quelque chose, ne le demande pas.
- Écris en français, même si le cours est dans une autre langue. Garde tels quels les termes techniques et les sigles du cours.
- Pas de question sur la mise en page, les consignes d'examen ou la numérotation du document.
- Si le document est un sujet d'exercice, de TP ou d'examen, interroge sur les notions qu'il mobilise (outils, principes, méthodes, définitions), pas sur les détails du scénario (chiffres, noms, données propres à l'énoncé) ni sur ce qu'il « faut rendre ».

Types de cartes à utiliser, en les mélangeant :
${types.map((t) => RULES[t]).join("\n")}

Format de sortie : uniquement un bloc de code JSON, sans texte avant ni après. Un tableau d'objets, un par carte :
\`\`\`json
[
  {
    "type": "${types[0]}",
    "question": "…",
    "answer": "…",
    "choices": null,
    "explanation": "Une phrase qui aide à retenir (le pourquoi, un lien avec une autre notion), sans répéter la réponse, ou null.",
    "source_page": 3
  }
]
\`\`\`
- "choices" vaut null sauf pour "mcq".
- "source_page" est le numéro de la page du cours où se trouve la notion, ou null si le document n'a pas de pages.`;
}
