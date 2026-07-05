import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mr. Boot CRM — Premium Shoe Care & Repair",
  description: "Bespoke shoe repair, laundry, and leather restoration workspace dashboard for Mr. Boot.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await prisma.settings.findUnique({
    where: { id: "singleton" },
  });
  const isDarkMode = settings?.darkMode || false;

  return (
    <html lang="en" className={isDarkMode ? "dark" : ""}>
      <body className="bg-background text-on-background font-body-md antialiased overflow-x-hidden min-h-screen relative">
        {children}
      </body>
    </html>
  );
}
