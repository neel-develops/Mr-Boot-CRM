import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mr. Boot CRM — Premium Shoe Care & Repair",
  description: "Bespoke shoe repair, laundry, and leather restoration workspace dashboard for Mr. Boot.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-background text-on-background font-body-md antialiased overflow-x-hidden min-h-screen relative">
        {children}
      </body>
    </html>
  );
}
