import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/ui/glass-card";

interface CustomersPageProps {
  searchParams: {
    search?: string;
  };
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const search = searchParams.search || "";

  // Query customers from database
  const customers = await prisma.customer.findMany({
    where: search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      orders: {
        include: {
          invoices: true,
        },
      },
    },
    orderBy: { firstName: "asc" },
  });

  return (
    <div className="w-full max-w-[1200px] px-4 md:px-gutter mx-auto py-4">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-primary dark:text-primary-fixed mb-2">Customers</h2>
          <p className="text-on-surface-variant font-body-md text-body-md">Manage customer profiles, preferences, and service history.</p>
        </div>

        {/* Search Input */}
        <form method="GET" action="/customers" className="w-full md:w-96 relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
            search
          </span>
          <input
            type="text"
            name="search"
            defaultValue={search}
            className="w-full pl-12 pr-4 py-3 rounded-full text-on-surface font-body-md bg-white/70 border border-white/40 shadow-sm focus:bg-white/95 focus:outline-none focus:ring-1 focus:ring-primary backdrop-blur-xl"
            placeholder="Search by name, email, or phone..."
          />
        </form>
      </div>

      {/* Grid of Customers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-card-gap">
        {customers.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40 mb-2">group</span>
            <p className="text-on-surface-variant font-medium">No customers found.</p>
          </div>
        ) : (
          customers.map((customer) => {
            // Calculate Total spend & pair count
            let totalSpend = 0;
            let pairCount = 0;

            customer.orders.forEach((order) => {
              pairCount += 1;
              order.invoices.forEach((inv) => {
                totalSpend += Number(inv.amount);
              });
            });

            return (
              <GlassCard key={customer.id} hoverable className="p-6 relative overflow-hidden flex flex-col justify-between h-48">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-primary dark:text-primary-fixed text-lg">
                        {customer.firstName} {customer.lastName}
                      </h3>
                      <p className="text-xs text-on-surface-variant mt-0.5">{customer.phone}</p>
                    </div>
                    {pairCount >= 3 && (
                      <span className="bg-tertiary-fixed text-on-tertiary-fixed font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Loyal
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-on-surface-variant/80 mt-3 truncate">{customer.email || "No email provided"}</p>
                </div>

                <div className="flex justify-between items-end border-t border-black/5 pt-4 mt-4">
                  <div>
                    <p className="text-[11px] text-outline uppercase tracking-wider">Spend / Pairs</p>
                    <p className="font-semibold text-primary dark:text-primary-fixed">
                      ₹{totalSpend.toLocaleString("en-IN")} <span className="text-xs text-on-surface-variant font-normal">({pairCount} pairs)</span>
                    </p>
                  </div>
                  <Link
                    href={`/customers/${customer.id}`}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    Profile <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </Link>
                </div>
              </GlassCard>
            );
          })
        )}
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
