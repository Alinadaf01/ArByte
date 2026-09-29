import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Django (apps/backend, `pnpm be:dev`) serves /api/admin/ and /media/;
  // same-origin in dev so the admin's default base URL (/api/admin) works.
  server: {
    port: 3001,
    proxy: {
      "/api": "http://localhost:8000",
      "/media": "http://localhost:8000",
    },
  },
});
