import React from "react";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import { GlassCard } from "@/components/ui/glass-card";
import Link from "next/link";

export default async function LogisticsPage() {
  // 1. Query orders for logistics tracking (READY or DELIVERED)
  const logisticsOrders = await prisma.order.findMany({
    where: {
      status: {
        in: [OrderStatus.READY, OrderStatus.DELIVERED],
      },
    },
    include: {
      customer: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  const activeDeliveries = logisticsOrders.filter((o) => o.status === OrderStatus.READY).length;
  const completedToday = logisticsOrders.filter((o) => o.status === OrderStatus.DELIVERED).length;

  return (
    <div className="w-full max-w-[1200px] px-4 md:px-gutter mx-auto py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h2 className="text-headline-lg font-headline-lg font-bold text-primary dark:text-primary-fixed tracking-tight">
            Logistics Control
          </h2>
          <p className="text-body-md font-body-md text-on-surface-variant mt-1">
            Dispatch orders ready for delivery via Porter, Rapido, and Uber Direct.
          </p>
        </div>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter mb-8">
        {/* Welcome Stats Card */}
        <div className="lg:col-span-8 bg-white/65 dark:bg-primary/65 backdrop-blur-xl border border-white/22 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-2xl p-6 md:p-8 flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-2xl font-bold text-primary dark:text-primary-fixed mb-1">Logistics Dashboard</h3>
              <p className="text-on-surface-variant text-sm">
                Manage dispatch and courier routing for finished items.
              </p>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 z-10 relative">
            <div className="bg-white/40 rounded-xl p-4 border border-white/20">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Pending Dispatch</p>
              <p className="text-3xl font-bold text-primary">{activeDeliveries}</p>
            </div>
            <div className="bg-white/40 rounded-xl p-4 border border-white/20">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Delivered Today</p>
              <p className="text-3xl font-bold text-primary">{completedToday}</p>
            </div>
            <div className="bg-white/40 rounded-xl p-4 border border-white/20">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Transit Exceptions</p>
              <p className="text-3xl font-bold text-error">0</p>
            </div>
            <div className="bg-white/40 rounded-xl p-4 border border-white/20">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Partner Networks</p>
              <p className="text-3xl font-bold text-primary">3</p>
            </div>
          </div>
        </div>

        {/* Partner Network Health */}
        <div className="lg:col-span-4 bg-white/65 dark:bg-primary/65 backdrop-blur-xl border border-white/22 dark:border-white/10 rounded-2xl p-6 flex flex-col gap-4">
          <h3 className="text-lg font-bold text-primary border-b border-black/5 pb-2">Network Health</h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/30 border border-black/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
                  P
                </div>
                <div>
                  <p className="text-sm font-semibold">Porter</p>
                  <p className="text-xs text-on-surface-variant">Instant pickup</p>
                </div>
              </div>
              <span className="text-xs text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded-full font-semibold">98% ETA</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-white/30 border border-black/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600 font-bold text-sm">
                  R
                </div>
                <div>
                  <p className="text-sm font-semibold">Rapido</p>
                  <p className="text-xs text-on-surface-variant">Bike runner</p>
                </div>
              </div>
              <span className="text-xs text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded-full font-semibold">95% ETA</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-white/30 border border-black/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-900 font-bold text-sm">
                  U
                </div>
                <div>
                  <p className="text-sm font-semibold">Uber Direct</p>
                  <p className="text-xs text-on-surface-variant">Local courier</p>
                </div>
              </div>
              <span className="text-xs text-[#FF9800] bg-[#FFF3E0] px-2 py-0.5 rounded-full font-semibold">82% ETA</span>
            </div>
          </div>
        </div>
      </div>

      {/* Deliveries Logs Table */}
      <GlassCard className="overflow-hidden">
        <div className="p-6 border-b border-black/5 bg-surface-bright/30">
          <h3 className="font-headline-lg text-[20px] text-primary">Active & Completed Deliveries</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50 text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                <th className="p-4 font-medium pl-6">Order ID</th>
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium">Item Details</th>
                <th className="p-4 font-medium">Logistics Status</th>
                <th className="p-4 font-medium pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 text-sm font-body-md">
              {logisticsOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-on-surface-variant">
                    No orders ready for delivery.
                  </td>
                </tr>
              ) : (
                logisticsOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-white/30 transition-colors">
                    <td className="p-4 pl-6 font-semibold text-primary">
                      #{order.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="p-4">
                      <p className="font-medium">{order.customer.firstName} {order.customer.lastName}</p>
                      <p className="text-xs text-on-surface-variant">{order.customer.phone}</p>
                    </td>
                    <td className="p-4 text-on-surface-variant">
                      {order.itemType}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          order.status === OrderStatus.DELIVERED
                            ? "bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]"
                            : "bg-[#FFF3E0] text-[#E65100] border-[#FFE0B2]"
                        }`}
                      >
                        {order.status === OrderStatus.READY ? "Ready for Dispatch" : "Delivered"}
                      </span>
                    </td>
                    <td className="p-4 text-right pr-6">
                      <Link
                        href={`/orders/${order.id}`}
                        className="px-4 py-1.5 bg-primary text-on-primary text-xs font-semibold rounded hover:opacity-90 transition-all inline-block"
                      >
                        Manage Dispatch
                      </Link>
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
