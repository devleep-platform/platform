import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      "out/**",
      "node_modules/**",
      "stitch_cloud_devops_lab_engine/**",
      "next-env.d.ts"
    ]
  },
  {
    rules: {
      "@next/next/no-page-custom-font": "off"
    }
  }
];

export default eslintConfig;
