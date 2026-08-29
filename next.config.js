/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // firebase-admin's auth verification pulls in jwks-rsa -> jose, which
  // ships an ESM-only build that Next.js's default webpack bundling can't
  // require() correctly (ERR_REQUIRE_ESM) once deployed. Excluding it from
  // bundling lets Node.js resolve it natively at runtime instead.
  serverExternalPackages: ["firebase-admin"],
};

module.exports = nextConfig;
