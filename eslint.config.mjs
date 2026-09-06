// В Next 16 eslint-config-next поставляется уже в плоском формате,
// прослойка FlatCompat не нужна и ломается на циклических ссылках.
import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "test-results/**",
      "playwright-report/**",
      "next-env.d.ts",
    ],
  },
];

export default config;
