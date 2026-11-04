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
  return `Tu prépares des cartes de révision (répétition espacée) à partir du cours joint (document, ou photos de tableau, de notes manuscrites ou de pages).

Règles :
- Environ ${count} cartes. Couvre toutes les notions clés du cours, dans l'ordre du cours, plutôt que de détailler une seule partie.
- Une seule notion par carte. Une liste de 4 éléments au plus peut tenir dans une carte ; au-delà, découpe-la.
- Fais travailler le rappel actif : la question doit se comprendre seule, sans le cours sous les yeux, et ne pas contenir sa réponse.
- N'invente rien : chaque réponse doit être vérifiable dans le cours. Si le cours ne dit pas quelque chose, ne le demande pas.
- Écris en français, même si le cours est dans une autre langue. Garde tels quels les termes techniques et les sigles du cours.
- Pas de question sur la mise en page, les consignes d'examen ou la numérotation du document.
- Si le document est un sujet d'exercice, de TP ou d'examen, interroge sur les notions qu'il mobilise (outils, principes, méthodes, définitions), pas sur les détails du scénario (chiffres, noms, données propres à l'énoncé) ni sur ce qu'il « faut rendre ».
- Si le cours est une photo : un mot ou un passage illisible ne se devine pas, laisse la notion de côté. Ignore ce qui n'est pas du cours (ratures, gribouillis, décor).

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
- Dans "answer" des cartes "qa" et "explain", entoure de == le terme clé à retenir, un seul par réponse : "La demande baisse quand le prix monte : c'est l'==élasticité-prix==." Jamais de == dans "question", "choices", "explanation", ni dans "answer" des "mcq" et "cloze".
- Si le cours contient du code (commandes, fichiers de configuration, extraits de programme), écris-le dans "question", "answer" ou "explanation" : en ligne entre \`accents graves\`, ou en bloc \`\`\`langage sur ses propres lignes. Pas de bloc de code dans "choices". Une "cloze" peut porter sur du code : le ___ remplace alors un mot-clé, un nom ou une option dans le code, et "answer" est ce mot seul. Garde un extrait court : les lignes utiles à la notion.
- Si une notion du cours est un schéma (architecture, UML, séquence, pipeline, états), tu peux le redessiner dans un bloc \`\`\`mermaid valide (flowchart, sequenceDiagram, classDiagram, stateDiagram-v2…), avec les libellés du cours. N'invente pas de schéma que le cours ne contient pas.
- Si le cours enseigne à produire du code ou des schémas (programmation, commandes, configuration, modélisation UML, réseaux…), 2 à 4 cartes "explain" demandent de le produire : « Écris la commande qui… », « Dessine le diagramme de séquence de… ». "answer" contient alors une phrase avec le terme clé entre ==, puis le bloc de code ou le bloc \`\`\`mermaid attendu, tiré du cours. Pour les autres cours, ne fais pas ce genre de carte.
- Dans le JSON, échappe les retours à la ligne en \\n et les guillemets en \\".
- "choices" vaut null sauf pour "mcq".
- "source_page" est le numéro de la page du cours où se trouve la notion, ou null si le document n'a pas de pages (une photo n'en a pas, sauf numéro visible).`;
}
