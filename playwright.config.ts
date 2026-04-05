import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  webServer: {
    command: "npx vite --port 5199",
    port: 5199,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://localhost:5199",
  },
});
