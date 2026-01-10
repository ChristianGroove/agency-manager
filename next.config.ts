import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      'recharts',
      'framer-motion'
    ],
  },
  /* config options here */
  async redirects() {
    return [
      {
        source: '/inbox',
        destination: '/crm/inbox',
        permanent: true,
      },
      {
        source: '/clients',
        destination: '/crm/contacts',
        permanent: true,
      },
      {
        source: '/automations',
        destination: '/crm/automations',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
