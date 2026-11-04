import type { NextConfig } from "next"
import withSerwistInit from "@serwist/next"

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: false,
  cacheOnNavigation: false,
  additionalPrecacheEntries: [{ url: "/offline", revision: "mobile-ux-2" }],
})

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Serwist injects a webpack config; empty turbopack keeps `next dev` happy.
  // CSS is handled by postcss.config.mjs (@tailwindcss/postcss) for both bundlers.
  turbopack: {},
}

export default withSerwist(nextConfig)
