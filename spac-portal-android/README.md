# SPAC Portal — Android demo (.apk)

This wraps the SPAC member-portal demo (React) into a native Android app using
**Capacitor**, so you can produce an installable `.apk`.

The whole app runs **on-device** — including the Company Agreement assistant, which
uses a small AI model (Qwen2.5-0.5B-Instruct) running locally via
[Transformers.js](https://github.com/huggingface/transformers.js) (ONNX Runtime,
WASM/CPU). No Anthropic API, no API key, no backend. The model weights (~0.5 GB)
download once from the Hugging Face hub on first use and are then cached for fully
offline operation. See "On-device AI assistant" below.

## Try it without building (hosted web app / PWA)

No native build required — the same app is published to GitHub Pages:

**https://gonelf.github.io/Spac/**

Open it in any browser. On iOS Safari or Android Chrome use **Share → Add to
Home Screen** to install it as a PWA. (First use of the assistant downloads the
~0.5 GB model once; in mobile Safari that cache can be evicted between sessions.)

---

## What's in here

```
spac-portal-android/
├── index.html            # web entry
├── src/
│   ├── main.jsx          # mounts <App/>
│   ├── App.jsx           # the full portal component (login, menus, chatbot…)
│   ├── llm.js            # on-device LLM (Transformers.js / ONNX / WASM)
│   └── retrieval.js      # TF-IDF retrieval over the embedded agreement
├── vite.config.js        # Vite build (base:"./"; bundles the ONNX WASM runtime)
├── capacitor.config.json # app id/name
└── package.json
```

App id: `pt.spac.portal`  ·  App name: `SPAC Portal`

---

## Prerequisites (install once)

1. **Node.js 18+** — https://nodejs.org
2. **JDK 17** (Temurin/OpenJDK 17).
3. **Android Studio** (includes the Android SDK + platform tools) —
   https://developer.android.com/studio
   On first launch, let it install the SDK and an emulator if you want to test.

---

## Build the APK (Android Studio route — easiest)

```bash
# 1. install web dependencies
npm install

# 2. build the web app into ./dist
npm run build

# 3. add the native Android project (creates ./android)
npx cap add android

# 4. copy the web build into the Android project
npx cap sync android

# 5. open the project in Android Studio
npx cap open android
```

In Android Studio:
- Let Gradle finish syncing.
- Menu: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
- Click the **locate** link in the notification, or find it at:
  `android/app/build/outputs/apk/debug/app-debug.apk`

Install on a phone: enable *Developer options → USB debugging*, plug in, and either
press **Run ▶** in Android Studio, or copy `app-debug.apk` to the device and tap it
(allow "install from unknown sources").

## Build the APK (command line, no IDE)

After steps 1–4 above:

```bash
cd android
./gradlew assembleDebug        # Windows: gradlew.bat assembleDebug
```

APK ends up at `android/app/build/outputs/apk/debug/app-debug.apk`.
(You need `JAVA_HOME` → JDK 17 and the Android SDK installed; the Android Studio
install sets these up for you.)

## After you change `src/App.jsx`

```bash
npm run build && npx cap sync android
```
then rebuild the APK.

---

## On-device AI assistant

The Company Agreement assistant runs a small language model **entirely on the phone** —
there is no Anthropic API call and no API key.

How it works (`src/llm.js` + `src/retrieval.js`):

1. **Retrieval.** For each question, a tiny TF-IDF scorer (`retrieval.js`) picks the
   few most relevant sections of the embedded agreement, so the prompt stays small
   enough to run on-device.
2. **Generation.** Those sections + the question are passed to
   **Qwen2.5-0.5B-Instruct** running via [Transformers.js](https://github.com/huggingface/transformers.js)
   on the ONNX Runtime **WASM/CPU** backend (single-threaded, no WebGPU required), and
   the answer is streamed back into the chat.

**Model download & offline use.** The ONNX Runtime WASM is bundled in the APK (copied
into the web root by `vite-plugin-static-copy`), so the runtime works offline. The model
**weights (~0.5 GB)** are fetched once from the Hugging Face hub on first use and cached
by the WebView (`env.useBrowserCache`), after which the assistant works **fully offline**.
A progress bar in the assistant header shows the one-time download.

**Tuning.** Change `MODEL_ID` / `DTYPE` in `src/llm.js` to swap models (e.g. a larger
`Qwen2.5-1.5B-Instruct`, or a smaller `SmolLM2-360M-Instruct` for slower devices), and
`max_new_tokens` for longer/shorter answers. The other four menus (member record,
contract & pay, health, contact a rep) need no network and work offline regardless.

> Note: on-device inference of a 0.5 B model on a phone CPU is slower than a cloud API
> (expect tens of seconds for a full answer) and lower quality than a frontier model —
> the trade-off for zero-cost, private, offline operation.

---

## Release (signed) APK — optional

A debug APK is enough to demo/sideload. For a signed release build, generate a keystore
and run **Build → Generate Signed Bundle / APK** in Android Studio (or configure
`signingConfigs` in `android/app/build.gradle`). See
https://developer.android.com/studio/publish/app-signing

## App icon & splash — optional

The default Capacitor icon is used. To set your own (e.g. the SPAC emblem), put a
1024×1024 PNG and run the `@capacitor/assets` tool:
```bash
npm i -D @capacitor/assets
npx capacitor-assets generate --android
```
