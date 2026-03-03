/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'www.solarsystemscope.com' },
      { protocol: 'https', hostname: 'nasa3d.arc.nasa.gov' },
    ],
  },
};

module.exports = nextConfig;
