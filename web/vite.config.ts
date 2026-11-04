import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import solid from "vite-plugin-solid";

// Écrit sw.js avec la liste des fichiers à garder hors ligne : tout le build, sauf les grammaires
// et thèmes Shiki inutilisés (6 Mo), gardés seulement au premier usage
const sw: Plugin = {
  name: "revise-sw",
  apply: "build",
  generateBundle(_, bundle) {
    const files = ["/", ...readdirSync("public").map((f) => "/" + f)];
    for (const f of Object.values(bundle)) {
      const id = (f.type === "chunk" && f.facadeModuleId) || "";
      if (f.fileName === "index.html" || id.includes("@shikijs/langs") || (id.includes("@shikijs/themes") && !/github-(light|dark)\./.test(id))) continue;
      files.push("/" + f.fileName);
    }
    const version = createHash("sha256").update(files.join()).digest("hex").slice(0, 12);
    const source = readFileSync("sw.js", "utf8").replace("__FILES__", JSON.stringify(files)).replace("__VERSION__", JSON.stringify(version));
    this.emitFile({ type: "asset", fileName: "sw.js", source });
  },
};

export default defineConfig({ plugins: [solid(), sw] });
