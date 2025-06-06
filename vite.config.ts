import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [dts({ rollupTypes: true })],
  build: {
    rollupOptions: {
      external: ["@cashu/cashu-ts"],
    },
    sourcemap: true,
    lib: {
      entry: "src/index.ts",
      name: "almnd",
      fileName: "almnd",
    },
  },
});
