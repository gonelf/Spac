import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";

// base: "./" makes asset URLs relative so they load from the Capacitor WebView.
const ORT_DIST = "node_modules/@huggingface/transformers/dist";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    // Ship the ONNX Runtime WASM with the app (served from the web root) so the
    // local model's runtime works offline — only the weights download once.
    viteStaticCopy({
      targets: [
        { src: `${ORT_DIST}/ort-wasm-simd-threaded.jsep.wasm`, dest: "." },
        { src: `${ORT_DIST}/ort-wasm-simd-threaded.jsep.mjs`, dest: "." },
      ],
    }),
  ],
  // Transformers.js is large and ships its own ESM build; let Rollup bundle it
  // directly rather than pre-bundling with esbuild.
  optimizeDeps: { exclude: ["@huggingface/transformers"] },
  build: { target: "es2020" },
});
