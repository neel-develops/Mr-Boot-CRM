import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#361f1a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: "Mr. Boot CRM — Premium Shoe Care & Repair",
  description: "Bespoke shoe repair, laundry, and leather restoration workspace dashboard for Mr. Boot.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Mr. Boot",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/logo.png",
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Mr. Boot" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className="bg-background text-on-background font-body-md antialiased overflow-x-hidden min-h-screen relative">
        {children}
      </body>
    </html>
  );
}
