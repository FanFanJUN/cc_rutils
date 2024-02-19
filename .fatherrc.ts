import { defineConfig } from "father";

export default defineConfig({
  esm: {},
  cjs: {},
  umd: {
    name: "cc_rutils",
    sourcemap: true,
  },
});
