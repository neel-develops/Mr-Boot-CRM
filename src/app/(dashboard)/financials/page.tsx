import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/ui/glass-card";


export default async function FinancialsPage() {
  // 1. Fetch Invoices from DB
  const invoices = await prisma.invoice.findMany({
    include: {
      order: {
        include: {
          customer: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 2. Aggregate statistics
  const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const totalOutstanding = invoices.reduce((sum, inv) => sum + Number(inv.balanceDue), 0);
  const avgOrderValue = invoices.length > 0 ? totalRevenue / invoices.length : 0;
  const totalAdvance = invoices.reduce((sum, inv) => sum + Number(inv.advancePaid), 0);

  return (
    <div className="w-full max-w-[1200px] px-4 md:px-gutter mx-auto py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-primary dark:text-primary-fixed tracking-tight">Financial Overview</h2>
          <p className="text-body-md font-body-md text-on-surface-variant mt-1">Track company revenue, advanced payments, and transaction history.</p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-card-gap mb-8">
        <GlassCard hoverable className="p-6">
          <div className="flex justify-between items-start mb-4">
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Total Revenue</p>
            <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[20px]">account_balance_wallet</span>
            </div>
          </div>
          <h3 className="font-numeral-xl text-numeral-xl text-primary font-bold">₹{totalRevenue.toLocaleString("en-IN")}</h3>
          <p className="text-xs text-on-surface-variant mt-2">Lifetime Gross Sales</p>
        </GlassCard>

        <GlassCard hoverable className="p-6">
          <div className="flex justify-between items-start mb-4">
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Outstanding Balance</p>
            <div className="w-8 h-8 rounded-full bg-error-container/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-error text-[20px]">pending_actions</span>
            </div>
          </div>
          <h3 className="font-numeral-xl text-numeral-xl text-primary font-bold">₹{totalOutstanding.toLocaleString("en-IN")}</h3>
          <p className="text-xs text-on-surface-variant mt-2">Uncollected Payments</p>
        </GlassCard>

        <GlassCard hoverable className="p-6">
          <div className="flex justify-between items-start mb-4">
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Avg Order Value</p>
            <div className="w-8 h-8 rounded-full bg-tertiary-container/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-tertiary-container text-[20px]">receipt_long</span>
            </div>
          </div>
          <h3 className="font-numeral-xl text-numeral-xl text-primary font-bold">₹{Math.round(avgOrderValue).toLocaleString("en-IN")}</h3>
          <p className="text-xs text-on-surface-variant mt-2">Average Ticket Price</p>
        </GlassCard>

        <GlassCard hoverable className="p-6">
          <div className="flex justify-between items-start mb-4">
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Total Advances Paid</p>
            <div className="w-8 h-8 rounded-full bg-secondary-container/50 flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary text-[20px]">credit_card</span>
            </div>
          </div>
          <h3 className="font-numeral-xl text-numeral-xl text-primary font-bold">₹{totalAdvance.toLocaleString("en-IN")}</h3>
          <p className="text-xs text-on-surface-variant mt-2">Deposited intake advances</p>
        </GlassCard>
      </div>

      {/* Transaction Table */}
      <GlassCard className="overflow-hidden">
        <div className="p-6 border-b border-black/5 bg-surface-bright/30">
          <h3 className="font-headline-lg text-[20px] text-primary">Transaction Ledger</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50 text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                <th className="p-4 font-medium pl-6">Invoice Number</th>
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium">Payment Mode</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Advance Paid</th>
                <th className="p-4 font-medium">Balance Due</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium pr-6">Bill</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 text-sm font-body-md">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-on-surface-variant">
                    No transactions recorded.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-white/30 transition-colors">
                    <td className="p-4 pl-6 font-medium text-primary">
                      {inv.invoiceNumber}
                    </td>
                    <td className="p-4">
                      {inv.order.customer.firstName} {inv.order.customer.lastName}
                    </td>
                    <td className="p-4">
                      <span className="bg-surface-variant px-2 py-0.5 rounded text-[11px] font-semibold uppercase">
                        {inv.paymentMode}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-primary">₹{Number(inv.amount).toLocaleString("en-IN")}</td>
                    <td className="p-4 text-on-surface-variant">₹{Number(inv.advancePaid).toLocaleString("en-IN")}</td>
                    <td className={`p-4 font-semibold ${Number(inv.balanceDue) > 0 ? "text-error" : "text-[#2E7D32]"}`}>
                      ₹{Number(inv.balanceDue).toLocaleString("en-IN")}
                    </td>
                    <td className="p-4 text-on-surface-variant">
                      {new Date(inv.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="p-4 pr-6">
                      <Link
                        href={`/invoices/${inv.orderId}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
                      >
                        <span className="material-symbols-outlined text-[14px]">receipt</span>
                        View Bill
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
