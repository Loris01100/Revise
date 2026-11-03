// Cœur Rust compilé par wasm-pack (cible web) ; wrangler importe le .wasm comme WebAssembly.Module
import wasm from "../../core/pkg/revise_core_bg.wasm";
import { initSync } from "../../core/pkg/revise_core.js";

initSync({ module: wasm });

export { compose, schedule } from "../../core/pkg/revise_core.js";
