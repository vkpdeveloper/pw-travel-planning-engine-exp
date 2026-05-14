import type { NextConfig } from "next";
import { env } from "./lib/env";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: env.GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID: env.GOOGLE_MAPS_MAP_ID,
  },
  allowedDevOrigins: [
      'macair'
  ]
};

export default nextConfig;
