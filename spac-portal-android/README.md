# SPAC Portal — Android demo (.apk)

This wraps the SPAC member-portal demo (React) into a native Android app using
**Capacitor**, so you can produce an installable `.apk`.

The whole app runs offline **except the Company Agreement assistant**, which calls
the Anthropic API and therefore needs either your own API key (entered in the app)
or a backend proxy. See "Chatbot / API key" below.

---

## What's in here

```
spac-portal-android/
├── index.html            # web entry
├── src/
│   ├── main.jsx          # mounts <App/>
│   └── App.jsx           # the full portal component (login, menus, chatbot…)
├── vite.config.js        # Vite build (base:"./" for the WebView)
├── capacitor.config.json # app id/name + CapacitorHttp (bypasses CORS on device)
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

## Chatbot / API key

Inside Claude's preview the assistant works with no key because Anthropic proxies
the request. On a device there is no proxy, so:

- **Quick (demo): bring your own key.** Open the assistant, tap **API key**, paste an
  Anthropic API key (from https://console.anthropic.com). `CapacitorHttp` is enabled
  in `capacitor.config.json`, so the request goes through native networking and the
  call succeeds. ⚠️ A key shipped/typed on the client is visible to whoever uses the
  app — fine for a personal demo, **not** for public distribution.

- **Proper (production): a backend proxy.** Stand up a tiny server (serverless function
  is fine) that holds `ANTHROPIC_API_KEY` as a secret and forwards requests to
  `https://api.anthropic.com/v1/messages`. Then in `src/App.jsx` change the one
  `fetch("https://api.anthropic.com/v1/messages", …)` to point at your endpoint and
  remove the key field. The other four menus (member record, contract & pay, health,
  contact a rep) need no network and work offline.

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
