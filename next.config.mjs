import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const isDev = process.env.NODE_ENV === "development";

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: projectRoot,
  output: undefined,
  experimental: {
    cpus: 1,
    webpackBuildWorker: false,
    workerThreads: true
  },
  images: {
    unoptimized: true
  },
  trailingSlash: true
};

export default nextConfig;
