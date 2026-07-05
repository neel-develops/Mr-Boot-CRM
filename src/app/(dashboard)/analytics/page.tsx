import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/ui/glass-card";
import { AnalyticsClient } from "@/components/analytics/analytics-client";

export default async function AnalyticsPage() {
  // 1. Fetch all customers with their orders and invoices
  const customers = await prisma.customer.findMany({
    include: {
      orders: {
        include: {
          invoices: true,
        },
      },
    },
  });

  const totalCustomersCount = customers.length;

  // Calculate Repeat Rate (customers with >= 2 orders)
  const repeatCustomersCount = customers.filter((c) => c.orders.length >= 2).length;
  const repeatRate = totalCustomersCount > 0 ? Math.round((repeatCustomersCount / totalCustomersCount) * 100) : 0;

  // Calculate Total Spending and LTV
  let totalSpendSum = 0;
  customers.forEach((c) => {
    c.orders.forEach((o) => {
      o.invoices.forEach((i) => {
        totalSpendSum += Number(i.amount);
      });
    });
  });

  const avgLtv = totalCustomersCount > 0 ? Math.round(totalSpendSum / totalCustomersCount) : 0;

  // Customer Segmentation counts
  let loyalCount = 0;
  let activeCount = 0;
  let newCount = 0;
  let atRiskCount = 0;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  customers.forEach((c) => {
    const orderCount = c.orders.length;
    if (orderCount >= 3) {
      loyalCount += 1;
    } else if (orderCount >= 1) {
      activeCount += 1;
    } else if (new Date(c.createdAt) >= sevenDaysAgo) {
      newCount += 1;
    } else {
      atRiskCount += 1;
    }
  });

  const getPercentage = (count: number) => {
    return totalCustomersCount > 0 ? Math.round((count / totalCustomersCount) * 100) : 0;
  };

  const segments = [
    { label: "Loyal", count: loyalCount, percentage: getPercentage(loyalCount), color: "#4E342E" },
    { label: "Active", count: activeCount, percentage: getPercentage(activeCount), color: "#C89B3C" },
    { label: "New", count: newCount, percentage: getPercentage(newCount), color: "#827471" },
    { label: "At-Risk", count: atRiskCount, percentage: getPercentage(atRiskCount), color: "#ba1a1a" },
  ];

  // Calculate top clients
  const clientSpendList = customers.map((c) => {
    let spend = 0;
    c.orders.forEach((o) => {
      o.invoices.forEach((i) => {
        spend += Number(i.amount);
      });
    });
    return {
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      phone: c.phone,
      ordersCount: c.orders.length,
      totalSpend: spend,
    };
  });

  const topClients = clientSpendList
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, 5);

  // Generate monthly growth data (last 6 months)
  const monthlyMap = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const label = d.toLocaleDateString("en-US", { month: "short" });
    monthlyMap.set(label, 0);
  }

  customers.forEach((c) => {
    const label = new Date(c.createdAt).toLocaleDateString("en-US", { month: "short" });
    if (monthlyMap.has(label)) {
      monthlyMap.set(label, (monthlyMap.get(label) || 0) + 1);
    }
  });

  const monthlyGrowthData = Array.from(monthlyMap.entries()).map(([month, count]) => ({
    month,
    count,
  }));

  return (
    <div className="w-full max-w-[1200px] px-4 md:px-gutter mx-auto py-4">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-primary dark:text-primary-fixed tracking-tight">Customer Insights</h2>
          <p className="text-body-md font-body-md text-on-surface-variant mt-1">Analytics and segmentation for your client base.</p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-card-gap mb-8">
        <GlassCard hoverable className="p-6">
          <div className="flex justify-between items-center text-on-surface-variant mb-2">
            <span className="font-label-sm text-label-sm uppercase tracking-wider">Total Customers</span>
            <span className="material-symbols-outlined text-primary">groups</span>
          </div>
          <div className="font-numeral-xl text-numeral-xl text-primary font-bold">{totalCustomersCount}</div>
          <p className="text-xs text-on-surface-variant mt-2">Active client base</p>
        </GlassCard>

        <GlassCard hoverable className="p-6">
          <div className="flex justify-between items-center text-on-surface-variant mb-2">
            <span className="font-label-sm text-label-sm uppercase tracking-wider">Repeat Rate</span>
            <span className="material-symbols-outlined text-primary">repeat</span>
          </div>
          <div className="font-numeral-xl text-numeral-xl text-primary font-bold">{repeatRate}%</div>
          <p className="text-xs text-on-surface-variant mt-2">Customers with 2+ orders</p>
        </GlassCard>

        <GlassCard hoverable className="p-6">
          <div className="flex justify-between items-center text-on-surface-variant mb-2">
            <span className="font-label-sm text-label-sm uppercase tracking-wider">Avg LTV</span>
            <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
          </div>
          <div className="font-numeral-xl text-numeral-xl text-primary font-bold">₹{avgLtv.toLocaleString("en-IN")}</div>
          <p className="text-xs text-on-surface-variant mt-2">Average lifetime revenue per customer</p>
        </GlassCard>

        <GlassCard hoverable className="p-6">
          <div className="flex justify-between items-center text-on-surface-variant mb-2">
            <span className="font-label-sm text-label-sm uppercase tracking-wider">Gross Sales</span>
            <span className="material-symbols-outlined text-primary">payments</span>
          </div>
          <div className="font-numeral-xl text-numeral-xl text-primary font-bold">
            ₹{totalSpendSum.toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-on-surface-variant mt-2">Cumulative services billed</p>
        </GlassCard>
      </div>

      {/* Recharts Analytics Panel */}
      <div className="mb-8">
        <AnalyticsClient segments={segments} monthlyGrowthData={monthlyGrowthData} />
      </div>

      {/* Top Clients Table */}
      <GlassCard className="overflow-hidden">
        <div className="p-6 border-b border-black/5 bg-surface-bright/30">
          <h3 className="font-headline-lg text-[20px] text-primary">Top Performing Clients</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50 text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                <th className="p-4 font-medium pl-6">Client</th>
                <th className="p-4 font-medium">Phone</th>
                <th className="p-4 font-medium">Orders Count</th>
                <th className="p-4 font-medium text-right pr-6">Total Spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 text-sm font-body-md">
              {topClients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-on-surface-variant">
                    No client spend records.
                  </td>
                </tr>
              ) : (
                topClients.map((client) => (
                  <tr key={client.id} className="hover:bg-white/30 transition-colors">
                    <td className="p-4 pl-6 font-medium text-primary">
                      <Link href={`/customers/${client.id}`} className="hover:underline">
                        {client.name}
                      </Link>
                    </td>
                    <td className="p-4 text-on-surface-variant">{client.phone}</td>
                    <td className="p-4">{client.ordersCount} pairs</td>
                    <td className="p-4 text-right pr-6 font-semibold text-primary">
                      ₹{client.totalSpend.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
export const dynamic = 'force-dynamic';
