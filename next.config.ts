
import { config } from 'dotenv';
config();

import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Tambahkan alias untuk handlebars
    config.resolve.alias['handlebars'] = 'handlebars/dist/handlebars.min.js';

    // Penting: Kembalikan konfigurasi yang sudah dimodifikasi
    return config;
  },
};

export default nextConfig;
