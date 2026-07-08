/** @type {import('next').NextConfig} */
const securityHeaders = [
  // Prevent clickjacking (A05)
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Prevent MIME-type sniffing (A05)
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Control referrer info sent to other sites (A09)
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Force HTTPS on browsers that have visited before (A02)
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Restrict browser features (A05)
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(), payment=()' },
  // XSS Protection header (legacy browsers)
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // Content Security Policy (A03 — XSS)
  // Allows: self, Supabase storage for images, Google Fonts, and inline styles for Tailwind
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-eval in dev; tighten in prod if possible
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://flagcdn.com",
      "connect-src 'self' https://*.supabase.co https://api.sarvam.ai https://api.groq.com wss://*.supabase.co",
      "media-src 'self' blob:",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig = {
  async headers() {
    return [
      {
        // Apply to ALL routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;
