"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AuthGuard } from "@/components/layout/auth-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthGuard>
      <div className="min-h-screen relative bg-background">
        {/* Background Ambience */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-background"></div>
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] opacity-70 mix-blend-multiply"></div>
          <div className="absolute bottom-[-200px] left-[-200px] w-[600px] h-[600px] bg-tertiary-fixed-dim/10 rounded-full blur-[100px] opacity-50 mix-blend-multiply"></div>
        </div>

        {/* Sidebar Navigation */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Mobile Backdrop when Sidebar is open */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/45 z-40 md:hidden transition-opacity duration-300"
          />
        )}

        {/* Topbar Header */}
        <Topbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        {/* Main Content Area */}
        <main className="pt-20 md:pt-24 pb-24 md:pb-12 px-4 md:px-8 lg:px-container-padding md:ml-64 relative z-10 max-w-[1440px] mx-auto min-h-screen flex flex-col gap-gutter">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
