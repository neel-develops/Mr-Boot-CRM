import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BillingHubClient } from "./billing-hub-client";

export default async function BillingHubPage() {
  // Fetch all invoices
  const invoices = await prisma.invoice.findMany({
    include: {
      order: {
        include: {
          customer: true,
          items: true,
          publicOrderLinks: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="w-full max-w-6xl mx-auto py-6 px-4">
      {/* Top Header / Breadcrumb */}
      <div className="text-xs text-on-surface-variant/70 mb-2">
        Finance &gt; <span className="font-semibold text-primary">Billing</span>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#361f1a]">Billing & Invoices</h1>
          <p className="text-sm text-on-surface-variant mt-1 max-w-2xl">
            Create and manage financial records for bespoke shoe making and premium restoration services.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/orders/new"
            className="flex items-center gap-2 px-4 py-2.5 border border-[#361f1a]/20 text-[#361f1a] rounded-lg text-sm font-semibold hover:bg-black/5 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">build</span>
            Create Service Bill
          </Link>
          <Link
            href="/billing/readymade"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#361f1a] text-white rounded-lg text-sm font-semibold hover:bg-[#361f1a]/90 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Create Shoe Making Bill
          </Link>
        </div>
      </div>

      {/* Render Client Side Search, Filter and Card List */}
      <BillingHubClient initialInvoices={JSON.parse(JSON.stringify(invoices))} />
    </div>
  );
}

export const dynamic = "force-dynamic";
