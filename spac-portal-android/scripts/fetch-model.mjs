/*
  Downloads the on-device LLM weights into public/models/<repo>/ so they are
  bundled with the app — into the Android APK (via `cap sync`) and into the
  self-hosted web build (Vite copies public/ into dist/). Transformers.js then
  loads the model locally (env.localModelPath) with no runtime download.

  Run automatically before every build via the "prebuild" npm script. It is
  idempotent (skips files already present) and non-fatal: if a download fails,
  it warns and lets the build continue — the app falls back to the Hugging Face
  hub at runtime (env.allowRemoteModels).

  Keep REPO / DTYPE_FILE in sync with MODEL_ID / DTYPES in src/llm.js.
*/
import { mkdir, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

const REPO = "onnx-community/SmolLM2-360M-Instruct";
const DTYPE_FILE = "onnx/model_q4.onnx"; // matches DTYPES[0] = "q4" in src/llm.js

// Files Transformers.js needs to load a text-generation pipeline. Anything in
// OPTIONAL is skipped if the repo doesn't have it (tokenizers vary by model).
const FILES = [
  "config.json",
  "generation_config.json",
  "tokenizer.json",
  "tokenizer_config.json",
  "special_tokens_map.json",
  "vocab.json",
  "merges.txt",
  "added_tokens.json",
  DTYPE_FILE,
];
const OPTIONAL = new Set([
  "generation_config.json",
  "special_tokens_map.json",
  "vocab.json",
  "merges.txt",
  "added_tokens.json",
]);

const OUT_ROOT = join(process.cwd(), "public", "models", REPO);
const BASE = `https://huggingface.co/${REPO}/resolve/main`;

async function download(file) {
  const dest = join(OUT_ROOT, file);
  if (existsSync(dest) && (await stat(dest)).size > 0) {
    console.log(`  ✓ cached  ${file}`);
    return;
  }
  const res = await fetch(`${BASE}/${file}?download=true`);
  if (!res.ok) {
    if (OPTIONAL.has(file) && res.status === 404) {
      console.log(`  · skip    ${file} (not in repo)`);
      return;
    }
    throw new Error(`HTTP ${res.status} fetching ${file}`);
  }
  await mkdir(dirname(dest), { recursive: true });
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  console.log(`  ↓ fetched ${file} (${(buf.length / 1e6).toFixed(1)} MB)`);
}

try {
  console.log(`Bundling ${REPO} into public/models/ …`);
  for (const file of FILES) await download(file);
  console.log("Model bundled locally — it will ship with the app.");
} catch (err) {
  console.warn(`\n⚠  Could not pre-bundle the model (${err.message}).`);
  console.warn(
    "   Build will continue; the app falls back to downloading the model from\n" +
      "   the Hugging Face hub at runtime. Re-run `npm run fetch-model` with\n" +
      "   network access to bundle it locally.\n"
  );
  // Exit 0 so the build is not blocked by a download failure.
}
