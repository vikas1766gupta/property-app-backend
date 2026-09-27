import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const sourceDirectory = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@config": path.join(sourceDirectory, "config"),
      "@common": path.join(sourceDirectory, "common"),
      "@modules": path.join(sourceDirectory, "modules"),
    },
  },
  test: { environment: "node" },
});