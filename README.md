# Revise

Plan de conception et étapes : [docs/ETAPES.md](docs/ETAPES.md).

## Skills à installer

Les skills ne sont pas versionnés (voir `.gitignore`). Après un clone, installer :

### Impeccable (design)

```sh
npx impeccable install --yes --project --providers=claude
```

Installe dans `.claude/` : le skill `impeccable`, ses agents et ses hooks (`.claude/settings.local.json`).
Ensuite, dans Claude Code : `/impeccable init`.

### Intent (stratégie UX)

```sh
npx skills add ghaida/intent -s '*' -a claude-code -y --copy
```

Installe 18 skills dans `.claude/skills/` (`intent`, `strategize`, `journey`, `wireframe`, `evaluate`, `fortify`, `include`, `articulate`…) et crée `skills-lock.json`.
Point d'entrée : `/intent`.

### Recouvrement Impeccable / Intent

Les noms ne se chevauchent pas, mais certains domaines oui :

| Sujet | Impeccable | Intent |
|---|---|---|
| Critique / audit UX | `critique`, `audit` | `evaluate` |
| États d'erreur, vides, chargement | `harden` | `fortify` |
| Textes d'interface | `clarify` | `articulate` |
| Accessibilité | `audit` | `include` |
| Adaptation mobile / plateformes | `adapt` | `transpose` |

Règle : **Intent pour la structure et le parcours** (avant le visuel), **Impeccable pour le rendu visuel** (UI codée).
