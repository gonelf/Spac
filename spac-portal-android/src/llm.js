import { pipeline, env, TextStreamer } from "@huggingface/transformers";

/*
  On-device LLM for the Company Agreement assistant.

  Runs a small instruction-tuned model fully on the phone via Transformers.js
  (ONNX Runtime, WASM/CPU backend) — no Anthropic API, no API key, no server.

  - The ONNX Runtime WASM binary is bundled in the app (copied to the web root by
    vite-plugin-static-copy), so the runtime itself works offline.
  - The model weights (~0.5 GB) are downloaded once from the Hugging Face hub on
    first use and cached by the browser, so subsequent runs are fully offline.
*/

// Use the WASM binary we ship with the app instead of fetching it from a CDN.
// Resolve it relative to where the app is served (web root in the Capacitor
// WebView, or a project subpath like "/Spac/" on GitHub Pages) so it loads in both.
env.backends.onnx.wasm.wasmPaths =
  typeof document !== "undefined" ? new URL("./", document.baseURI).href : "/";
// No cross-origin isolation inside the WebView, so run single-threaded on the
// main thread (no SharedArrayBuffer / worker proxy required).
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.proxy = false;
// Weights come from the hub and are cached for offline reuse.
env.allowLocalModels = false;
env.useBrowserCache = true;

// Small instruction model with an ONNX build that runs on the WASM/CPU backend.
const MODEL_ID = "onnx-community/Qwen2.5-0.5B-Instruct";
const DTYPE = "q8"; // int8 weights — broadly supported on CPU, ~0.5 GB download

let generatorPromise = null;

// Loads (and caches) the text-generation pipeline. onProgress receives the
// Transformers.js progress events while files download on first use.
export function loadModel(onProgress) {
  if (!generatorPromise) {
    generatorPromise = pipeline("text-generation", MODEL_ID, {
      dtype: DTYPE,
      device: "wasm",
      progress_callback: onProgress,
    });
  }
  return generatorPromise;
}

// Generates an answer for a chat-format message array, streaming tokens out
// through onToken as they are produced.
export async function generate(messages, { onToken } = {}) {
  const generator = await loadModel();

  const streamer = new TextStreamer(generator.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (text) => {
      if (text && onToken) onToken(text);
    },
  });

  const output = await generator(messages, {
    max_new_tokens: 512,
    do_sample: false,
    temperature: 0,
    repetition_penalty: 1.1,
    streamer,
  });

  // pipeline returns [{ generated_text: [...messages, { role:'assistant', content }] }]
  const gen = output?.[0]?.generated_text;
  if (Array.isArray(gen)) {
    return (gen[gen.length - 1]?.content || "").trim();
  }
  return String(gen || "").trim();
}
