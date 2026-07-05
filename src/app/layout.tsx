import type { Metadata, Viewport } from "next";
import { prisma } from "@/lib/prisma";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Mr. Boot CRM — Premium Shoe Care & Repair",
  description: "Bespoke shoe repair, laundry, and leather restoration workspace dashboard for Mr. Boot.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="">
      <body className="bg-background text-on-background font-body-md antialiased overflow-x-hidden min-h-screen relative">
        {children}
      </body>
    </html>
  );
}
