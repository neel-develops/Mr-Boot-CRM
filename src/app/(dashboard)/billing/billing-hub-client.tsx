"use client";

import React, { useState } from "react";
import Link from "next/link";

interface BillingHubClientProps {
  initialInvoices: any[];
}

export function BillingHubClient({ initialInvoices }: BillingHubClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "UNPAID" | "PAID" | "OVERDUE">("ALL");

  // Calculate badge counts
  const unpaidCount = initialInvoices.filter((inv) => Number(inv.balanceDue) > 0).length;

  // Filter logic
  const filteredInvoices = initialInvoices.filter((inv) => {
    // Tab filter
    if (activeTab === "UNPAID" && Number(inv.balanceDue) <= 0) return false;
    if (activeTab === "PAID" && Number(inv.balanceDue) > 0) return false;
    if (activeTab === "OVERDUE") {
      // Overdue if balanceDue > 0 and dueDate passed
      const isPast = new Date(inv.order.dueDate).getTime() < Date.now();
      if (Number(inv.balanceDue) <= 0 || !isPast) return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = `${inv.order.customer.firstName} ${inv.order.customer.lastName}`.toLowerCase();
      const phone = inv.order.customer.phone.toLowerCase();
      const invNum = inv.invoiceNumber.toLowerCase();
      const itemType = inv.order.itemType.toLowerCase();
      return name.includes(q) || phone.includes(q) || invNum.includes(q) || itemType.includes(q);
    }

    return true;
  });

  const fallbackShoeImg = "https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=150&auto=format&fit=crop&q=60";

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, invoice #, or phone..."
            className="w-full bg-white/50 border border-black/5 rounded-full py-2.5 pl-10 pr-4 font-body-md text-sm focus:outline-none focus:ring-1 focus:ring-[#361f1a]/50"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === "ALL"
                ? "bg-[#361f1a] text-white shadow-sm"
                : "bg-white/50 border border-black/5 text-on-surface-variant hover:bg-black/5"
            }`}
          >
            All Bills
          </button>
          <button
            onClick={() => setActiveTab("UNPAID")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "UNPAID"
                ? "bg-[#361f1a] text-white shadow-sm"
                : "bg-white/50 border border-black/5 text-on-surface-variant hover:bg-black/5"
            }`}
          >
            Unpaid
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {unpaidCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("PAID")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === "PAID"
                ? "bg-[#361f1a] text-white shadow-sm"
                : "bg-white/50 border border-black/5 text-on-surface-variant hover:bg-black/5"
            }`}
          >
            Paid
          </button>
          <button
            onClick={() => setActiveTab("OVERDUE")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === "OVERDUE"
                ? "bg-[#361f1a] text-white shadow-sm"
                : "bg-white/50 border border-black/5 text-on-surface-variant hover:bg-black/5"
            }`}
          >
            Overdue
          </button>
        </div>
      </div>

      {/* Bills / Invoices List */}
      <div className="space-y-4">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12 bg-white/40 border border-black/5 rounded-2xl">
            <span className="material-symbols-outlined text-4xl text-zinc-400 mb-2">description</span>
            <p className="text-sm font-medium text-zinc-500">No invoices match your search/filter criteria.</p>
          </div>
        ) : (
          filteredInvoices.map((inv) => {
            const isPaid = Number(inv.balanceDue) === 0;
            const isPast = new Date(inv.order.dueDate).getTime() < Date.now();
            const isOverdue = !isPaid && isPast;

            // Calculate overdue days
            const diffTime = Math.abs(Date.now() - new Date(inv.order.dueDate).getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Matched details
            const token = inv.order.publicOrderLinks[0]?.token || "";
            const trackingUrl = `https://mr-boot-crm.vercel.app/track/${token}`;

            // WA link
            const phone = inv.order.customer.phone.replace(/[^0-9]/g, "");
            const waShareUrl = `https://wa.me/${phone}?text=${encodeURIComponent(
              `Hi ${inv.order.customer.firstName}, Neel Sonawane here from Mr Boot. Your bill is ready: ${trackingUrl}`
            )}`;

            return (
              <div
                key={inv.id}
                className="bg-white/60 dark:bg-primary/20 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
              >
                {/* Left: Customer Info */}
                <div className="flex items-center gap-4 min-w-[200px]">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-lg">
                    {inv.order.customer.firstName[0]}
                    {inv.order.customer.lastName[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-950 text-base leading-tight">
                      {inv.order.customer.firstName} {inv.order.customer.lastName}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">{inv.order.customer.phone}</p>
                  </div>
                </div>

                {/* Center Left: Item & Invoice details */}
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-black/5 flex-shrink-0 bg-white">
                    <img
                      src={inv.order.items[0]?.photoUrl || fallbackShoeImg}
                      alt="Intake"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
                        Invoice #{inv.invoiceNumber}
                      </span>
                      {isOverdue && (
                        <span className="text-xs text-red-600 font-bold">
                          Overdue by {diffDays} days
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-zinc-800 text-sm mt-0.5 leading-tight">
                      {inv.order.itemType}
                    </h4>

                    {/* Progress steps */}
                    <div className="flex items-center gap-2 mt-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      <span className="text-emerald-600">Generated</span>
                      <span className="w-6 h-0.5 bg-emerald-600"></span>
                      <span className="text-emerald-600">Sent</span>
                      <span className="w-6 h-0.5 bg-zinc-200"></span>
                      <span className={isPaid ? "text-emerald-600" : "text-zinc-400"}>
                        {isPaid ? "Paid" : "Unpaid"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Pricing & Actions */}
                <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
                  <div className="text-left md:text-right">
                    <p className="text-2xl font-bold text-zinc-950">
                      ₹{Number(inv.amount).toLocaleString("en-IN")}.00
                    </p>
                    <span
                      className={`inline-block text-[10px] font-bold tracking-widest px-2 py-0.5 rounded uppercase mt-1 ${
                        isPaid
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {isPaid ? "PAID" : "UNPAID"}
                    </span>
                    <span className="block text-[10px] font-bold text-zinc-400 uppercase mt-1 tracking-wider">
                      {inv.paymentMode}
                    </span>
                  </div>

                  {/* Icon Actions / Remind Button */}
                  <div className="flex items-center gap-2">
                    {!isPaid && (
                      <a
                        href={waShareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-bold hover:bg-zinc-800 transition-all shadow-sm"
                      >
                        Remind Now
                      </a>
                    )}
                    <a
                      href={waShareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-lg bg-black/5 hover:bg-black/10 flex items-center justify-center transition-all text-zinc-600"
                      title="Share via WhatsApp"
                    >
                      <span className="material-symbols-outlined text-[18px]">share</span>
                    </a>
                    <Link
                      href={`/invoices/${inv.order.id}`}
                      className="w-8 h-8 rounded-lg bg-black/5 hover:bg-black/10 flex items-center justify-center transition-all text-zinc-600"
                      title="Print / View Invoice"
                    >
                      <span className="material-symbols-outlined text-[18px]">print</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-black/5 gap-4">
        <span className="text-xs text-zinc-500">
          Showing 1-{filteredInvoices.length} of {filteredInvoices.length} invoices
        </span>
        <div className="flex items-center gap-1">
          <button className="w-8 h-8 rounded border border-black/5 hover:bg-black/5 flex items-center justify-center text-xs text-zinc-500">
            &lt;
          </button>
          <button className="w-8 h-8 rounded bg-[#361f1a] text-white flex items-center justify-center text-xs font-bold shadow-sm">
            1
          </button>
          <button className="w-8 h-8 rounded border border-black/5 hover:bg-black/5 flex items-center justify-center text-xs text-zinc-500">
            &gt;
          </button>
        </div>
      </div>
    </div>
  );
}
