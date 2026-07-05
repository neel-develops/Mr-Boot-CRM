"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  orderId: string | null;
  read: boolean;
  createdAt: string;
}

export const Topbar = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
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
          <div className="md:hidden flex items-center">
            <img
              alt="Mr. Boot Logo"
              className="w-10 h-10 object-contain"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCn7lW1vtQ0lZyfs5lXTaByxV89HdnteWqn32a8d3s-HaptrgDl_YBkkfJQL2pQMkLaxg-_LYJJyqPTZEvFhqt8zFxvFcr-9ijYS2t-9_bptwCa9AEFh6CLCFtKo2RLDNDaSi1AOuHJ5wWVx3oofr8KPKOVKC4jMSCXFwr29Ow55QFlKEq0wMWUqkkq6plvRdfrzUAYvF90N2yqWSLY-YkGA-OlXECjxuB7cfNrQkWrqrMBki4ezsWl4bosEXFEMlWSyFdYT3MFUs8"
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
            <button className="p-2 rounded-full hover:bg-black/5 transition-colors flex items-center justify-center" title="Voice Search (Mock)">
              <span className="material-symbols-outlined text-[22px]">mic</span>
            </button>
            <button className="p-2 rounded-full hover:bg-black/5 transition-colors flex items-center justify-center" title="Scan QR Code (Mock)">
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
          <img
            alt="Manager Avatar"
            className="w-8 h-8 md:w-9 md:h-9 rounded-full object-cover border-2 border-white shadow-sm cursor-pointer hover:scale-105 transition-transform"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAaMhlLoZVT9pyylupgHlp6NjqRGvFSsOsypIK1HEVtfvfdAIfboMw7ReIRVNCgM509RlKqdUGPn1jGhJAPGBgFSErzcTosfFaFd7I-WbZSMdnJ3XKc3ax0ev2IGDZMfBiVGl_4KElx--d5-RCEQgUE_3JxN4IyBs-_gAhxQZe8g4dgTU5s-Pa3yVgDWRSsUavWb5dOD56R9r5m1WKrdpg3jkgB_rpeIYsKJNmMiQRUpvszpyrEOVTOdog8nyb7-5CWhSvcYiK22mk"
          />
        </div>
      </div>
    </header>
  );
};
