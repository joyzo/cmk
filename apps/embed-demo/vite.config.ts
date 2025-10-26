/// <reference types="node" />

import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@cmk/embed": fileURLToPath(new URL("../embed/src/index.ts", import.meta.url)),
      "@cmk/embed/": fileURLToPath(new URL("../embed/src/", import.meta.url)),
      "@cmk/core": fileURLToPath(new URL("../core/src/index.ts", import.meta.url)),
      "@cmk/core/": fileURLToPath(new URL("../core/src/", import.meta.url))
    }
  }
});
