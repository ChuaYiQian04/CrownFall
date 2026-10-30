import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/pages",
  use: {
    baseURL: "http://127.0.0.1:5175",
    viewport: { width: 390, height: 844 },
  },
  webServer: {
    command: "node scripts/preview-pages.mjs",
    url: "http://127.0.0.1:5175/CrownFall/",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      VITE_BASE_PATH: "/CrownFall/",
      VITE_ROUTER_MODE: "hash",
      VITE_SUPABASE_URL: "",
      VITE_SUPABASE_PUBLISHABLE_KEY: "",
    },
  },
});
