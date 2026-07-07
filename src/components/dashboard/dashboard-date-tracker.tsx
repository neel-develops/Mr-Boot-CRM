"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/glass-card";

interface OrderItemInfo {
  id: string;
  status: string;
  price: string;
  dueDate: string;
  createdAt: string;
  customerName: string;
  itemSummary: string;
}

interface DateOrdersResponse {
  collected: OrderItemInfo[];
  deliveries: OrderItemInfo[];
}

export function DashboardDateTracker() {
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to today
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DateOrdersResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    fetch(`/api/orders/by-date?date=${selectedDate}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load orders for this date");
        return res.json();
      })
      .then((resData) => {
        if (active) {
          setData(resData);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "Failed to load orders");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedDate]);

  // Format display date: e.g. "6 July, 2026"
  const getDisplayDate = () => {
    try {
      const parts = selectedDate.split("-");
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    } catch {
      return selectedDate;
    }
  };

  return (
    <div className="bg-white/65 dark:bg-primary/65 backdrop-blur-[20px] border border-white/22 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-xl p-6 relative flex flex-col justify-between w-full min-h-[420px] overflow-hidden">
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-[60px] pointer-events-none"></div>

      {/* Header and Date Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 z-10 border-b border-black/5 pb-4">
        <div>
          <h3 className="text-body-md font-body-md font-semibold text-primary dark:text-primary-fixed">Day Tracker</h3>
          <p className="text-label-sm font-label-sm text-on-surface-variant">{getDisplayDate()}</p>
        </div>
        <div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white/50 border border-black/10 rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Lists Container */}
      <div className="flex-grow z-10 grid grid-cols-1 md:grid-cols-2 gap-4 h-[300px] overflow-y-auto pr-1">
        {/* Intakes Column */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-dashed border-zinc-150 pb-1">
            <span className="material-symbols-outlined text-[14px]">login</span>
            Intake / Taken ({(data?.collected || []).length})
          </h4>

          {loading ? (
            <p className="text-xs text-zinc-400 py-4">Loading...</p>
          ) : error ? (
            <p className="text-xs text-red-500 py-4">{error}</p>
          ) : (data?.collected || []).length === 0 ? (
            <p className="text-xs text-zinc-400 py-4 italic">No shoes received on this date.</p>
          ) : (
            <div className="space-y-2">
              {(data?.collected || []).map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="block p-3 rounded-xl bg-white/40 border border-black/5 hover:bg-white/70 transition-all shadow-sm"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="text-xs font-bold text-[#361f1a]">{order.customerName}</p>
                      <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{order.itemSummary}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-[#361f1a]">₹{Number(order.price).toLocaleString("en-IN")}</p>
                      <span className="inline-block text-[9px] font-bold px-1.5 py-0.2 mt-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/10 uppercase">
                        {order.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Deliveries Column */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-dashed border-zinc-150 pb-1">
            <span className="material-symbols-outlined text-[14px]">logout</span>
            Deliveries / Due ({(data?.deliveries || []).length})
          </h4>

          {loading ? (
            <p className="text-xs text-zinc-400 py-4">Loading...</p>
          ) : error ? (
            <p className="text-xs text-red-500 py-4">{error}</p>
          ) : (data?.deliveries || []).length === 0 ? (
            <p className="text-xs text-zinc-400 py-4 italic">No deliveries scheduled for this date.</p>
          ) : (
            <div className="space-y-2">
              {(data?.deliveries || []).map((order) => {
                const isReady = order.status === "READY";
                const isDelivered = order.status === "DELIVERED";
                return (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="block p-3 rounded-xl bg-white/40 border border-black/5 hover:bg-white/70 transition-all shadow-sm"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="text-xs font-bold text-[#361f1a]">{order.customerName}</p>
                        <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{order.itemSummary}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-[#361f1a]">₹{Number(order.price).toLocaleString("en-IN")}</p>
                        <span
                          className={`inline-block text-[9px] font-bold px-1.5 py-0.2 mt-0.5 rounded border uppercase ${
                            isDelivered
                              ? "bg-zinc-200 text-zinc-600 border-zinc-300"
                              : isReady
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/10 animate-pulse"
                              : "bg-red-500/10 text-red-600 border-red-500/10"
                          }`}
                        >
                          {order.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
