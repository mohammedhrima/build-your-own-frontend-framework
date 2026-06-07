import { defineConfig } from "vite";

// On GitHub Pages the site is served under /<repo>/, so the production build
// needs that base. Local dev stays at the root.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/build-your-own-frontend-framework/" : "/",
}));
