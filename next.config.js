/** @type {import('next').NextConfig} */
const webpack = require('webpack');

const nextConfig = {
  images: {
    unoptimized: true
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        dns: false,
        net: false,
        tls: false,
        fs: false,
        diagnostics_channel: false,
      };
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, '');
        })
      );
    }
    // BullMQ가 선택적으로 의존하는 Valkey Glide 클라이언트는
    // 설치되어 있지 않아 빌드 시 모듈 해석 오류가 발생한다.
    // 실제로 ioredis 기반으로 동작하므로 이 경로는 더미 모듈로 대체한다.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@valkey/valkey-glide': false,
    };
    return config;
  },
};

module.exports = nextConfig;
