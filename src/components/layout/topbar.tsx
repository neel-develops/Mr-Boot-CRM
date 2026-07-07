"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { VoiceSearchModal } from "@/components/modals/voice-search-modal";
import { QRScannerModal } from "@/components/modals/qr-scanner-modal";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  orderId: string | null;
  read: boolean;
  createdAt: string;
}

interface TopbarProps {
  onToggleSidebar?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleSidebar }) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Fetch notifications from real database API
  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch current logged-in user
  useEffect(() => {
    import("@/lib/supabase").then(({ supabase }) => {
      supabase.auth.getUser().then(({ data }) => {
        setCurrentUserEmail(data?.user?.email || null);
      });
    });
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id: string, orderId: string | null) => {
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, read: true }),
      });
      fetchNotifications();
      setDropdownOpen(false);
      if (orderId) {
        router.push(`/orders/${orderId}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "all", read: true }),
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/orders?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="bg-white/65 dark:bg-primary/65 backdrop-blur-xl fixed top-0 right-0 w-full md:w-[calc(100%-16rem)] z-40 border-b border-white/22 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
      <div className="flex justify-between items-center h-16 px-6 md:px-8 max-w-full">
        {/* Mobile Brand Logo & Search */}
        <div className="flex items-center gap-4 flex-1">
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-full hover:bg-black/5 flex items-center justify-center text-[#361f1a] dark:text-white"
              aria-label="Toggle Navigation Sidebar"
              type="button"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
            <img
              alt="Mr. Boot Logo"
              className="w-8 h-8 object-contain rounded-lg"
              src="/logo.png"
            />
          </div>
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md relative group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70 text-[20px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/50 border border-black/5 rounded-full pl-10 pr-4 py-2 text-body-md font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-tertiary-fixed-dim/50 focus:border-tertiary-fixed-dim/50 transition-all shadow-sm placeholder:text-on-surface-variant/50 backdrop-blur-sm"
              placeholder="Search orders, customers..."
            />
          </form>
        </div>

        {/* Navigation Shortcut Links */}
        <div className="hidden lg:flex items-center gap-6 mx-8">
          <Link href="/analytics" className="text-on-surface-variant dark:text-outline-variant hover:text-primary py-5 px-1 text-label-sm font-label-sm transition-all hover:bg-white/10 rounded-md">
            Analytics
          </Link>
          <Link href="/logistics" className="text-on-surface-variant dark:text-outline-variant hover:text-primary py-5 px-1 text-label-sm font-label-sm transition-all hover:bg-white/10 rounded-md">
            Logistics
          </Link>
        </div>

        {/* Trailing Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex items-center gap-1 text-on-surface-variant">
            <button
              onClick={() => setVoiceOpen(true)}
              className="p-2 rounded-full hover:bg-black/5 transition-colors flex items-center justify-center"
              title="Voice Search"
            >
              <span className="material-symbols-outlined text-[22px]">mic</span>
            </button>
            <button
              onClick={() => setScannerOpen(true)}
              className="p-2 rounded-full hover:bg-black/5 transition-colors flex items-center justify-center"
              title="Scan QR Code"
            >
              <span className="material-symbols-outlined text-[22px]">qr_code_scanner</span>
            </button>



            {/* Notification Bell Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="p-2 rounded-full hover:bg-black/5 transition-colors flex items-center justify-center relative"
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border border-white"></span>
                )}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white/95 dark:bg-primary/95 border border-white/20 backdrop-blur-xl rounded-xl shadow-lg py-4 z-50 text-on-surface">
                  <div className="flex justify-between items-center px-4 pb-2 border-b border-black/5">
                    <span className="font-semibold text-body-md text-primary dark:text-primary-fixed">Notifications ({unreadCount} new)</span>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllAsRead} className="text-[12px] text-tertiary-fixed-dim hover:underline font-medium">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar mt-2">
                    {notifications.length === 0 ? (
                      <p className="text-center text-on-surface-variant text-sm py-8">No notifications</p>
                    ) : (
                      notifications.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleMarkAsRead(item.id, item.orderId)}
                          className={clsx(
                            "px-4 py-2.5 hover:bg-black/5 cursor-pointer border-b border-black/5 last:border-0 transition-colors flex flex-col gap-0.5",
                            !item.read && "bg-primary-fixed/10"
                          )}
                        >
                          <span className="font-semibold text-sm text-primary dark:text-primary-fixed flex items-center gap-1.5">
                            {!item.read && <span className="w-1.5 h-1.5 rounded-full bg-error" />}
                            {item.title}
                          </span>
                          <span className="text-[13px] text-on-surface-variant line-clamp-2">{item.message}</span>
                          <span className="text-[11px] text-on-surface-variant/60 mt-1">
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Link href="/settings" className="hidden md:flex bg-white border border-black/5 text-primary shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all px-4 py-1.5 rounded-full text-label-sm font-label-sm font-medium items-center gap-2">
            Quick Settings
            <span className="material-symbols-outlined text-[16px]">bolt</span>
          </Link>
          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 focus:outline-none"
            >
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-[#361f1a]/10 hover:bg-[#361f1a]/20 border border-black/10 flex items-center justify-center text-[#361f1a] hover:scale-105 transition-transform shadow-sm">
                <span className="material-symbols-outlined text-[20px]">account_circle</span>
              </div>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-black/5 dark:border-zinc-800 rounded-xl shadow-lg py-2 z-50 text-on-surface">
              <div className="px-4 py-2 border-b border-black/5 dark:border-zinc-800 flex flex-col">
                  <span className="font-semibold text-sm text-primary dark:text-primary-fixed">
                    {currentUserEmail ? currentUserEmail.split('@')[0] : 'Active Staff'}
                  </span>
                  <span className="text-[11px] text-on-surface-variant">{currentUserEmail || 'Workspace Session'}</span>
                </div>
                <button
                  onClick={async () => {
                    const { supabase } = await import("@/lib/supabase");
                    await supabase.auth.signOut();
                    window.location.reload();
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-black/5 dark:hover:bg-white/5 text-error text-sm font-semibold flex items-center gap-2 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <VoiceSearchModal isOpen={voiceOpen} onClose={() => setVoiceOpen(false)} />
      <QRScannerModal isOpen={scannerOpen} onClose={() => setScannerOpen(false)} />
    </header>
  );
};
