import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    // Full-document 404 for URLs that never match a locale segment, since the
    // only root layout lives under app/[locale]/ (see src/app/global-not-found.tsx).
    globalNotFound: true,
  },
};

export default withNextIntl(nextConfig);
