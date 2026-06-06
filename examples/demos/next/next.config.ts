import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
    transpilePackages: ["@sonnetics/js"],
    webpack: (config, { isServer }) => {
        config.resolve ??= {};
        config.resolve.alias = {
            ...config.resolve.alias,
            fflate: path.join(__dirname, "node_modules/fflate"),
        };
        // Client-only: stub Node builtins that @sonnetics/js imports
        // dynamically behind isNode() guards (never called in browser).
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                "fs/promises": false,
                path: false,
                os: false,
                crypto: false,
                module: false,
            };
            config.experiments = {
                ...config.experiments,
                syncWebAssembly: true,
            };
        }
        return config;
    },
};

export default nextConfig;
