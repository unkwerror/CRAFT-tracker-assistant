/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.yandex.net' },
    ],
  },
};

module.exports = nextConfig;
