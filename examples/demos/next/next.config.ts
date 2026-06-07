import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    transpilePackages: ["@sonnetics/js"],
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                "fs/promises": false,
                path: false,
                os: false,
                crypto: false,
                module: false,
            };
        }
        return config;
    },
};

export default nextConfig;
