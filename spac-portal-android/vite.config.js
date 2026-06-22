import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" makes asset URLs relative so they load from the Capacitor WebView.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
