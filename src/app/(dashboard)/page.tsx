import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import { GlassCard } from "@/components/ui/glass-card";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function ExecutiveDashboardPage() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 1. Fetch data in parallel to avoid database roundtrip waterfalls
  const [
    todayRevenueAggregate,
    todayOrders,
    readyPickupCount,
    recentLogs,
    serviceGroups,
    invoicesLast30Days,
  ] = await Promise.all([
    prisma.invoice.aggregate({
      _sum: { amount: true },
      where: {
        createdAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    }),
    prisma.order.count({
      where: {
        createdAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    }),
    prisma.order.count({
      where: { status: OrderStatus.READY },
    }),
    prisma.activityLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 5,
      include: {
        order: true,
      },
    }),
    prisma.order.groupBy({
      by: ["serviceType"],
      _count: { id: true },
      orderBy: {
        _count: { id: "desc" },
      },
      take: 4,
    }),
    prisma.invoice.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        amount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const todayRevenue = Number(todayRevenueAggregate._sum.amount || 0);

  // Group invoices by date for Recharts
  const dateMap = new Map<string, number>();
  // Pre-populate last 30 days
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dateMap.set(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), 0);
  }

  invoicesLast30Days.forEach((inv) => {
    const dateStr = inv.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + Number(inv.amount));
  });

  const chartData = Array.from(dateMap.entries()).map(([date, amount]) => ({
    date,
    amount,
  }));

  return (
    <div className="flex flex-col gap-gutter w-full">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-4">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-primary dark:text-primary-fixed tracking-tight">Overview</h2>
          <p className="text-body-md font-body-md text-on-surface-variant mt-1">Here's what's happening at Mr. Boot today.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/orders/new"
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-lg text-label-sm font-label-sm hover:opacity-95 shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Order Intake
          </Link>
        </div>
      </div>

      {/* Floating Glass Widgets (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-card-gap">
        {/* Widget 1: Revenue */}
        <GlassCard hoverable>
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Today's Revenue</h3>
            <div className="p-2 bg-primary/5 rounded-lg text-primary">
              <span className="material-symbols-outlined text-[20px]">payments</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-numeral-xl font-numeral-xl text-primary dark:text-primary-fixed">
              ₹{todayRevenue.toLocaleString("en-IN")}
            </span>
            <span className="text-label-sm font-label-sm text-[#008A27] flex items-center bg-[#008A27]/10 px-1.5 py-0.5 rounded">
              Live
            </span>
          </div>
        </GlassCard>

        {/* Widget 2: Orders */}
        <GlassCard hoverable>
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Today's Orders</h3>
            <div className="p-2 bg-primary/5 rounded-lg text-primary">
              <span className="material-symbols-outlined text-[20px]">receipt_long</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-numeral-xl font-numeral-xl text-primary dark:text-primary-fixed">{todayOrders}</span>
            <span className="text-label-sm font-label-sm text-on-surface-variant bg-surface-variant px-1.5 py-0.5 rounded">
              intakes
            </span>
          </div>
        </GlassCard>

        {/* Widget 3: Ready Orders */}
        <GlassCard hoverable>
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Ready for Pickup</h3>
            <div className="p-2 bg-[#008A27]/10 rounded-lg text-[#008A27] relative">
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#008A27] rounded-full animate-ping opacity-75"></span>
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#008A27] rounded-full"></span>
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-numeral-xl font-numeral-xl text-primary dark:text-primary-fixed">{readyPickupCount}</span>
            <span className="text-label-sm font-label-sm text-on-surface-variant">shoes ready</span>
          </div>
        </GlassCard>
      </div>

      {/* Bento Grid: Charts & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-card-gap">
        {/* Revenue Growth Chart */}
        <div className="lg:col-span-2 bg-white/65 dark:bg-primary/65 backdrop-blur-[20px] border border-white/22 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-xl p-6 relative flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-body-md font-body-md font-semibold text-primary dark:text-primary-fixed">Revenue Trend</h3>
              <p className="text-label-sm font-label-sm text-on-surface-variant">Last 30 days performance</p>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 rounded bg-white border border-black/5 text-label-sm font-label-sm text-on-surface shadow-sm">30D</span>
            </div>
          </div>
          {/* Recharts Area Chart */}
          <DashboardClient chartData={chartData} />
        </div>

        {/* Recent Activity Logs */}
        <GlassCard className="flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-body-md font-body-md font-semibold text-primary dark:text-primary-fixed">Recent Activity</h3>
            <Link href="/orders" className="text-label-sm font-label-sm text-primary hover:underline">
              View Orders
            </Link>
          </div>
          <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar relative">
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-black/5"></div>
            <div className="flex flex-col gap-6 relative z-10">
              {recentLogs.length === 0 ? (
                <p className="text-center text-on-surface-variant text-sm py-12">No activity logged.</p>
              ) : (
                recentLogs.map((log) => (
                  <div key={log.id} className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-white border-2 border-[#c89b3c] flex items-center justify-center shadow-sm shrink-0 mt-0.5 relative z-10">
                      <span className="w-2 h-2 rounded-full bg-[#c89b3c]"></span>
                    </div>
                    <div>
                      <p className="text-label-sm font-label-sm text-primary dark:text-primary-fixed font-semibold">
                        {log.event}
                      </p>
                      <p className="text-[13px] text-on-surface-variant mt-0.5">
                        Order #{log.order.id.slice(-6).toUpperCase()} • {log.order.itemType}
                      </p>
                      <span className="text-[11px] text-on-surface-variant/60 block mt-1">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Lower Section: Services & deep insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-card-gap">
        {/* Top Services Bar Chart */}
        <GlassCard>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-body-md font-body-md font-semibold text-primary dark:text-primary-fixed">Top Performing Services</h3>
          </div>
          <div className="flex flex-col gap-5">
            {serviceGroups.length === 0 ? (
              <p className="text-center text-on-surface-variant text-sm py-8">No order service records yet.</p>
            ) : (
              serviceGroups.map((group, idx) => {
                const count = group._count.id;
                // Calculate relative bar percentage
                const maxCount = serviceGroups[0]._count.id || 1;
                const percentage = Math.max(15, Math.round((count / maxCount) * 100));

                return (
                  <div key={idx}>
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-label-sm font-label-sm text-primary dark:text-primary-fixed">{group.serviceType}</span>
                      <span className="text-label-sm font-label-sm text-primary dark:text-primary-fixed font-semibold">{count} orders</span>
                    </div>
                    <div className="w-full bg-black/5 rounded-full h-2 overflow-hidden">
                      <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </GlassCard>

        {/* Business Strategy Suggestion */}
        <div className="bg-gradient-to-br from-white/80 to-white/40 dark:from-primary/40 dark:to-primary/20 backdrop-blur-[20px] border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-tertiary-fixed-dim/10 rounded-full blur-[40px] pointer-events-none"></div>
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-tertiary-fixed-dim/20 flex items-center justify-center border border-tertiary-fixed-dim/30">
              <span className="material-symbols-outlined text-tertiary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>
                lightbulb
              </span>
            </div>
            <div>
              <h3 className="text-body-md font-body-md font-semibold text-primary dark:text-primary-fixed">Business Strategy Suggestions</h3>
              <p className="text-label-sm font-label-sm text-on-surface-variant">Intelligent Operations</p>
            </div>
          </div>
          <div className="bg-white/50 dark:bg-primary/25 border border-white/50 rounded-xl p-4 flex-grow relative z-10 flex flex-col justify-between">
            <p className="text-body-md font-body-md text-primary dark:text-primary-fixed leading-relaxed">
              Maintain high stock levels for sole pasting glues and waterproofing sprays as monsoon and damp seasons approach. Assign extra staff to repair stations to handle high order intakes.
            </p>
            <div className="mt-4 border-t border-black/5 pt-4">
              <h4 className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-2">Suggested Inventory Action</h4>
              <div className="flex justify-between items-center gap-4 bg-white/60 dark:bg-primary/30 p-3 rounded-lg border border-black/5">
                <span className="text-sm font-medium">Barge Sole Glue & Laces</span>
                <Link href="/inventory" className="bg-primary text-on-primary px-4 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-all">
                  Restock
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
