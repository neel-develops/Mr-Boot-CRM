"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const navItems = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/billing", label: "Billing", icon: "description" },
  { href: "/orders", label: "Orders", icon: "receipt_long" },
  { href: "/inventory", label: "Inventory", icon: "inventory_2" },
  { href: "/customers", label: "Customers", icon: "group" },
  { href: "/financials", label: "Financials", icon: "payments" },
  { href: "/staff", label: "Staff", icon: "badge" },
  { href: "/ai-assistant", label: "AI Assistant", icon: "psychology" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const [isSubscribing, setIsSubscribing] = useState(false);

  const subscribeUser = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSubscribing(true);
      try {
        const register = await navigator.serviceWorker.register('/sw.js');
        const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
        
        if (!publicVapidKey) {
          alert('VAPID public key not configured.');
          setIsSubscribing(false);
          return;
        }
        
        const subscription = await register.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
        });
        
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          body: JSON.stringify(subscription),
          headers: {
            'content-type': 'application/json'
          }
        });
        alert('Device Notifications Enabled!');
      } catch (e) {
        console.error(e);
        alert('Failed to enable notifications. Ensure you granted permissions.');
      } finally {
        setIsSubscribing(false);
      }
    } else {
      alert('Push notifications are not supported in this browser/device.');
    }
  };

  return (
    <aside
      className={clsx(
        "w-64 h-screen bg-white/65 dark:bg-primary/65 backdrop-blur-xl border-r border-white/22 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.04)] flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300 md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex flex-col h-full py-8 px-4">
        {/* Brand Logo & Name */}
        <div className="mb-10 px-4 flex items-center gap-3">
          <img
            alt="Mr. Boot Logo"
            className="w-10 h-10 object-contain rounded-lg shadow-sm border border-black/5"
            src="/logo.png"
          />
          <div>
            <h1 className="text-headline-lg font-headline-lg font-bold text-primary dark:text-primary-fixed tracking-tight leading-none">
              Mr. Boot
            </h1>
            <p className="text-label-sm font-label-sm text-on-surface-variant mt-1">
              Premium Care
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1">
          <ul className="flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={clsx(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-250 ease-out group",
                      isActive
                        ? "text-primary dark:text-primary-fixed font-bold border-r-2 border-primary dark:border-primary-fixed bg-white/50 shadow-sm -translate-y-0.5"
                        : "text-on-surface-variant dark:text-outline-variant hover:text-primary hover:bg-white/10"
                    )}
                  >
                    <span
                      className="material-symbols-outlined transition-transform group-hover:scale-110"
                      style={{ fontVariationSettings: isActive ? "'FILL' 1" : undefined }}
                    >
                      {item.icon}
                    </span>
                    <span className="text-body-md font-body-md">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Create Order Button */}
        <div className="mt-auto pt-6 px-2 pb-6 border-b border-black/5">
          <Link href="/orders/new" onClick={onClose} className="w-full bg-primary-container text-on-primary-container hover:bg-primary-container/90 transition-all duration-250 ease-out py-3 rounded-xl font-label-sm text-label-sm flex items-center justify-center gap-2 shadow-sm hover:-translate-y-0.5 hover:shadow-md">
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Order
          </Link>
        </div>

        {/* Footer info/helpers */}
        <div className="pt-4 flex flex-col gap-1">
          <Link
            href="/settings"
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-on-surface-variant dark:text-outline-variant hover:text-primary hover:bg-white/10 transition-all duration-250 ease-out"
          >
            <span className="material-symbols-outlined text-[20px]">help</span>
            <span className="text-label-sm font-label-sm">Support</span>
          </Link>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.reload();
            }}
            className="flex items-center gap-3 px-4 py-2 w-full text-left rounded-lg text-error hover:bg-red-500/10 transition-all duration-250 ease-out"
          >
            <span className="material-symbols-outlined text-[20px] text-error">logout</span>
            <span className="text-label-sm font-label-sm text-error">Sign Out</span>
          </button>
          <button
            onClick={subscribeUser}
            disabled={isSubscribing}
            className="flex items-center gap-3 px-4 py-2 w-full text-left rounded-lg text-primary hover:bg-primary/10 transition-all duration-250 ease-out"
          >
            <span className="material-symbols-outlined text-[20px] text-primary">notifications_active</span>
            <span className="text-label-sm font-label-sm text-primary">{isSubscribing ? 'Enabling...' : 'Enable Notifications'}</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
