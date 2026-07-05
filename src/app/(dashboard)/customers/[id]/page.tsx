import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/ui/glass-card";
import { DeleteCustomerButton } from "@/components/customers/delete-customer-button";

interface CustomerDetailPageProps {
  params: {
    id: string;
  };
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const customerId = params.id;

  // 1. Fetch customer details
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      orders: {
        include: {
          invoices: true,
          items: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!customer) {
    notFound();
  }

  // Calculate statistics
  let totalSpend = 0;
  let pairsCount = 0;
  customer.orders.forEach((order) => {
    pairsCount += 1;
    order.invoices.forEach((inv) => {
      totalSpend += Number(inv.amount);
    });
  });

  const isLoyal = pairsCount >= 3;

  return (
    <div className="w-full max-w-[1200px] px-4 md:px-gutter mx-auto py-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm mb-6">
        <Link className="hover:text-primary transition-colors" href="/customers">
          Customers
        </Link>
        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        <span className="text-on-surface font-medium">
          {customer.firstName} {customer.lastName}
        </span>
      </div>

      {/* Profile Header Card */}
      <GlassCard className="p-8 mb-card-gap flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden transition-all duration-300">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary-container/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center gap-6 z-10">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-primary/10 border-4 border-white shadow-sm flex items-center justify-center text-primary font-bold text-3xl">
              {customer.firstName[0]}
              {customer.lastName[0]}
            </div>
            {isLoyal && (
              <div className="absolute -bottom-1 -right-1 bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-[11px] px-2 py-0.5 rounded-full border-2 border-white font-bold flex items-center gap-1 shadow-sm">
                <span className="material-symbols-outlined text-[12px] fill">stars</span>
                Loyal
              </div>
            )}
          </div>
          <div>
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-1">
              {customer.firstName} {customer.lastName}
            </h2>
            <p className="text-on-surface-variant font-body-md mb-3">
              Customer since {new Date(customer.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              {customer.email && (
                <a
                  className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors font-label-sm text-label-sm bg-white/50 px-3 py-1.5 rounded-full border border-white/20"
                  href={`mailto:${customer.email}`}
                >
                  <span className="material-symbols-outlined text-[18px]">mail</span>
                  {customer.email}
                </a>
              )}
              <a
                className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors font-label-sm text-label-sm bg-white/50 px-3 py-1.5 rounded-full border border-white/20"
                href={`tel:${customer.phone}`}
              >
                <span className="material-symbols-outlined text-[18px]">call</span>
                {customer.phone}
              </a>
            </div>
          </div>
        </div>

        <div className="z-10 w-full md:w-auto flex flex-col sm:flex-row gap-3">
          <DeleteCustomerButton customerId={customer.id} />
          <Link
            href="/orders/new"
            className="flex-1 md:flex-none bg-primary text-on-primary px-6 py-2.5 rounded-lg font-label-sm text-label-sm font-semibold hover:-translate-y-0.5 hover:shadow-lg transition-all duration-250 flex items-center justify-center gap-2 text-center"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Order
          </Link>
        </div>
      </GlassCard>

      {/* Bento Stats & Preferences */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-card-gap mb-card-gap">
        {/* Stats Column */}
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-card-gap">
          {/* Total Spend */}
          <GlassCard className="p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <span className="text-on-surface-variant font-label-sm text-label-sm font-medium uppercase tracking-wider">
                Total Spend
              </span>
              <div className="p-2 bg-primary-container/10 rounded-lg text-primary-container">
                <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
              </div>
            </div>
            <div className="font-numeral-xl text-numeral-xl text-primary font-bold">
              ₹{totalSpend.toLocaleString("en-IN")}
            </div>
            <div className="text-on-surface-variant/70 font-label-sm text-[12px] mt-2">
              Lifetime Transactions Value
            </div>
          </GlassCard>

          {/* Services Count */}
          <GlassCard className="p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <span className="text-on-surface-variant font-label-sm text-label-sm font-medium uppercase tracking-wider">
                Pairs Restored
              </span>
              <div className="p-2 bg-secondary-container/30 rounded-lg text-on-secondary-container">
                <span className="material-symbols-outlined text-[20px]">inventory_2</span>
              </div>
            </div>
            <div className="font-numeral-xl text-numeral-xl text-primary font-bold">{pairsCount}</div>
            <div className="text-on-surface-variant/70 font-label-sm text-[12px] mt-2">Pairs serviced at Mr. Boot</div>
          </GlassCard>
        </div>

        {/* Preferences Column */}
        <GlassCard className="md:col-span-4 p-6">
          <h3 className="font-label-sm text-label-sm font-bold text-on-surface uppercase tracking-wider mb-6">
            Preferences & Notes
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-outline mt-0.5 text-[20px]">notes</span>
              <div>
                <div className="font-label-sm text-label-sm text-on-surface font-medium">Customer Notes</div>
                <div className="text-on-surface-variant text-sm mt-0.5">
                  {customer.notes || "No special notes recorded."}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-outline mt-0.5 text-[20px]">straighten</span>
              <div>
                <div className="font-label-sm text-label-sm text-on-surface font-medium">Shoe Size</div>
                <div className="text-on-surface-variant text-sm mt-0.5">Not Specified</div>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Service History Table */}
      <div>
        <h3 className="font-headline-lg text-[20px] font-semibold text-primary mb-4">Service History</h3>
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/30 bg-surface/50 text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                  <th className="py-4 px-6 font-medium">Order ID</th>
                  <th className="py-4 px-6 font-medium">Item Details</th>
                  <th className="py-4 px-6 font-medium">Service</th>
                  <th className="py-4 px-6 font-medium">Date</th>
                  <th className="py-4 px-6 font-medium">Status</th>
                  <th className="py-4 px-6 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="font-body-md text-sm text-on-surface divide-y divide-black/5">
                {customer.orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                      No order history found.
                    </td>
                  </tr>
                ) : (
                  customer.orders.map((order) => {
                    const invoice = order.invoices[0];
                    return (
                      <tr key={order.id} className="hover:bg-white/40 transition-colors">
                        <td className="py-4 px-6">
                          <Link href={`/orders/${order.id}`} className="text-primary font-semibold hover:underline">
                            #{order.id.slice(-6).toUpperCase()}
                          </Link>
                        </td>
                        <td className="py-4 px-6 font-medium">{order.itemType}</td>
                        <td className="py-4 px-6">{order.serviceType}</td>
                        <td className="py-4 px-6 text-on-surface-variant">
                          {new Date(order.createdAt).toLocaleDateString("en-IN")}
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label-sm text-[11px] border ${
                              order.status === "DELIVERED"
                                ? "bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]"
                                : "bg-[#ffdea4]/20 text-[#cb9e3f] border-[#cb9e3f]/20"
                            }`}
                          >
                            {order.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right font-semibold">
                          ₹{invoice ? Number(invoice.amount).toLocaleString("en-IN") : Number(order.price).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
