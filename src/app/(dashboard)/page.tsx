import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import { GlassCard } from "@/components/ui/glass-card";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import WorkspaceWidget from "@/components/dashboard/workspace-widget";
import { DashboardDateTracker } from "@/components/dashboard/dashboard-date-tracker";

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

        {/* Workspace Widget */}
        <div className="flex flex-col items-center justify-center">
          <WorkspaceWidget />
        </div>
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

        {/* Day Tracker: Intakes and Deliveries */}
        <DashboardDateTracker />
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
