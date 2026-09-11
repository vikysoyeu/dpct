/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${process.env.API_URL || "http://localhost:3001"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
