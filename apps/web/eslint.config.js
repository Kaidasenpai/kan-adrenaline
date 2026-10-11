import baseConfig, { restrictEnvAccess } from "@kan/eslint-config/base";
import nextjsConfig from "@kan/eslint-config/nextjs";
import reactConfig from "@kan/eslint-config/react";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [".next/**", ".open-next/**", ".wrangler/**", "public/__ENV.js"],
  },
  ...baseConfig,
  ...reactConfig,
  ...nextjsConfig,
  ...restrictEnvAccess,
];
