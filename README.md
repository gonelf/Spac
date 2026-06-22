# Spac

**SPAC Portal** — a member-portal demo packaged as a native **Android app** using
[Capacitor](https://capacitorjs.com/) + React + Vite.

The app source lives in [`spac-portal-android/`](./spac-portal-android/). It is a
web app (React) wrapped in a Capacitor shell so it can be compiled into an
installable `.apk`. Most of it runs offline; only the Company Agreement assistant
needs network (Anthropic API). See the
[project README](./spac-portal-android/README.md) for full build instructions.

App id: `pt.spac.portal` · App name: `SPAC Portal`

## Getting the APK

You can build the `.apk` two ways:

### 1. Automatically in CI (no local Android SDK needed)

A GitHub Actions workflow ([`.github/workflows/android.yml`](./.github/workflows/android.yml))
builds a debug APK on every push that touches the app and uploads it as a
downloadable artifact:

1. Go to the repo's **Actions** tab → **Build Android APK** → latest run.
2. Download the **`spac-portal-debug-apk`** artifact (it contains `app-debug.apk`).
3. Copy it to an Android device and tap to install (allow "install from unknown
   sources"), or `adb install app-debug.apk`.

You can also trigger it manually via **Run workflow** (workflow_dispatch).

### 2. Locally

Requires Node 18+, JDK 17, and the Android SDK (Android Studio). From
`spac-portal-android/`:

```bash
npm install
npm run build
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
# -> android/app/build/outputs/apk/debug/app-debug.apk
```

See [`spac-portal-android/README.md`](./spac-portal-android/README.md) for the
Android Studio route, signing a release APK, app icons, and the chatbot/API-key
notes.
