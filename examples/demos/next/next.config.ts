import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
    transpilePackages: ["@sonnetics/js"],
    webpack: (config) => {
        config.resolve ??= {};
        config.resolve.alias = {
            ...config.resolve.alias,
            fflate: path.join(__dirname, "node_modules/fflate"),
        };
        config.resolve.fallback = {
            ...config.resolve.fallback,
            "node:fs/promises": false,
            "fs/promises": false,
        };
        config.experiments = { ...config.experiments, syncWebAssembly: true };
        return config;
    },
};

export default nextConfig;
