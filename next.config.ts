import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
