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

// Small instruction model with an ONNX build that runs on the WASM/CPU backend.
// SmolLM2-360M is deliberately tiny so it loads on memory-constrained phone
// browsers (iOS WebKit — Safari/Brave) where a 0.5 B model's weights can exhaust
// the tab and abort with a generic "Load failed".
const MODEL_ID = "onnx-community/SmolLM2-360M-Instruct";
// int4 weights (~0.2 GB) load in roughly half the memory of int8 (~0.4 GB), which
// matters on phones (iOS WebKit kills a tab that allocates too much). We prefer
// q4 and fall back to q8 if a device/repo can't use it — q8 is the safety net.
const DTYPES = ["q4", "q8"];

// A failure that means "this weight file isn't in the repo" (so trying a
// different dtype is worthwhile) vs. a network/memory failure (where retrying
// the same way won't help, but dropping the browser cache might).
function isMissingFileError(e) {
  const m = String(e?.message || e).toLowerCase();
  return (
    m.includes("could not locate") ||
    m.includes("no such file") ||
    m.includes("not found") ||
    m.includes("404")
  );
}

let generatorPromise = null;

// Tries each dtype, and for each, tries with the browser cache and then without
// it (some mobile browsers, e.g. iOS Brave, refuse to cache a ~0.3 GB entry,
// which aborts the load). Returns the first pipeline that builds.
async function build(onProgress) {
  let lastErr;
  for (const dtype of DTYPES) {
    for (const useCache of [true, false]) {
      env.useBrowserCache = useCache;
      try {
        return await pipeline("text-generation", MODEL_ID, {
          dtype,
          device: "wasm",
          progress_callback: onProgress,
        });
      } catch (e) {
        lastErr = e;
        // Missing weight file → don't bother disabling the cache, try next dtype.
        if (isMissingFileError(e)) break;
      }
    }
  }
  throw new Error(
    (lastErr?.message || lastErr || "unknown error") +
      " — the on-device model couldn't load. On phones this is usually limited " +
      "memory: close other tabs/apps and reopen, or try a desktop browser."
  );
}

// Loads (and caches) the text-generation pipeline. onProgress receives the
// Transformers.js progress events while files download on first use.
export function loadModel(onProgress) {
  if (!generatorPromise) {
    generatorPromise = build(onProgress).catch((e) => {
      // Let a later attempt retry from scratch instead of caching the failure.
      generatorPromise = null;
      throw e;
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
