import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173,
    allowedHosts: true,
    proxy: {
      '^/api/.*': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        secure: false,
      },
    },
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      // Use injectManifest so our custom sw.ts has an explicit fetch handler
      // — the unambiguous requirement for Chrome to issue a WebAPK install.
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      includeAssets: ["teralogo.png", "robots.txt", "apple-touch-icon.png"],
      manifest: false, // we keep our own public/manifest.json
      injectManifest: {
        // Inject precache manifest into self.__WB_MANIFEST in sw.ts
        globPatterns: ["**/*.{js,css,html,png,svg,ico,woff,woff2}"],
        injectionPoint: "self.__WB_MANIFEST",
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
