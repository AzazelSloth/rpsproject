import { defineConfig } from "eslint/config";
import next from "@next/eslint-plugin-next";

const eslintConfig = defineConfig([
  {
    plugins: {
      "@next/next": next,
    },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs["core-web-vitals"].rules,
    },
  },
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      ".git/**",
      "node_modules/**",
    ],
  },
]);

export default eslintConfig;
