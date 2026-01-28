/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  // Ensure static export compatibility
  distDir: 'out'
};

module.exports = nextConfig;