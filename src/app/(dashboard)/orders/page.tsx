import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import { GlassCard } from "@/components/ui/glass-card";

interface OrdersPageProps {
  searchParams: {
    search?: string;
    status?: string;
  };
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const search = searchParams.search || "";
  const statusFilter = searchParams.status || "ALL";

  // 1. Fetch settings to read the templates and WhatsApp business number
  let settings = await prisma.settings.findUnique({
    where: { id: "singleton" },
  });

  if (!settings) {
    settings = {
      id: "singleton",
      orgName: "Mr. Boot",
      orgPhone: "",
      orgEmail: "",
      orgAddress: "",
      billReadyTemplate: "Hi {{customer_first_name}}, Neel Sonawane here from Mr Boot. Your bill is ready: {{invoice_pdf_or_track_link}}",
      reviewRequestTemplate: "Hi {{customer_first_name}}, hope you're loving your {{item_type}}! Would mean a lot if you could leave us a quick review: {{google_review_link}}",
      googleReviewLink: "https://g.page/r/your-google-review-link",
      darkMode: false,
      updatedAt: new Date(),
    };
  }

  // 2. Query orders from Neon Postgres based on search queries and status filters
  const orders = await prisma.order.findMany({
    where: {
      AND: [
        statusFilter !== "ALL" ? { status: statusFilter as OrderStatus } : {},
        search
          ? {
              OR: [
                { customer: { firstName: { contains: search, mode: "insensitive" } } },
                { customer: { lastName: { contains: search, mode: "insensitive" } } },
                { customer: { phone: { contains: search } } },
                { itemType: { contains: search, mode: "insensitive" } },
                { serviceType: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
    include: {
      customer: true,
      items: true,
      invoices: true,
      publicOrderLinks: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate totals for badges
  const totalCount = await prisma.order.count();
  const pendingCount = await prisma.order.count({
    where: { status: { in: [OrderStatus.RECEIVED, OrderStatus.IN_PROGRESS] } },
  });
  const readyCount = await prisma.order.count({
    where: { status: OrderStatus.READY },
  });
  const completedCount = await prisma.order.count({
    where: { status: OrderStatus.DELIVERED },
  });

  return (
    <div className="w-full max-w-[1200px] px-4 md:px-gutter mx-auto py-4">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-primary dark:text-primary-fixed mb-2">Orders Workspace</h2>
          <p className="text-on-surface-variant font-body-md text-body-md">Manage and track premium service requests.</p>
        </div>

        {/* Search Input Form */}
        <form method="GET" action="/orders" className="w-full md:w-96 relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
            search
          </span>
          <input
            type="text"
            name="search"
            defaultValue={search}
            className="w-full pl-12 pr-12 py-3 rounded-full text-on-surface font-body-md bg-white/70 border border-white/40 shadow-sm focus:bg-white/95 focus:outline-none focus:ring-1 focus:ring-primary backdrop-blur-xl"
            placeholder="Search customer, phone, or items..."
          />
          {statusFilter !== "ALL" && <input type="hidden" name="status" value={statusFilter} />}
          <button type="submit" className="absolute inset-y-0 right-0 pr-4 flex items-center text-outline hover:text-primary">
            <span className="material-symbols-outlined">tune</span>
          </button>
        </form>
      </div>

      {/* Tabs Filter Bar */}
      <div className="flex overflow-x-auto pb-4 mb-4 gap-3 snap-x scrollbar-hide hide-scrollbar">
        <Link
          href={`/orders?status=ALL${search ? `&search=${search}` : ""}`}
          className={`snap-start whitespace-nowrap px-5 py-2 rounded-full font-label-sm text-label-sm transition-all ${
            statusFilter === "ALL"
              ? "bg-primary text-on-primary shadow-md"
              : "glass-card text-on-surface-variant hover:text-primary"
          }`}
        >
          All Orders <span className="ml-2 opacity-70">{totalCount}</span>
        </Link>
        <Link
          href={`/orders?status=IN_PROGRESS${search ? `&search=${search}` : ""}`}
          className={`snap-start whitespace-nowrap px-5 py-2 rounded-full font-label-sm text-label-sm transition-all ${
            statusFilter === "IN_PROGRESS"
              ? "bg-primary text-on-primary shadow-md"
              : "glass-card text-on-surface-variant hover:text-primary"
          }`}
        >
          In Progress <span className="ml-2 bg-surface-variant text-on-surface px-2 py-0.5 rounded-full text-[11px]">{pendingCount}</span>
        </Link>
        <Link
          href={`/orders?status=READY${search ? `&search=${search}` : ""}`}
          className={`snap-start whitespace-nowrap px-5 py-2 rounded-full font-label-sm text-label-sm transition-all flex items-center gap-2 ${
            statusFilter === "READY"
              ? "bg-primary text-on-primary shadow-md"
              : "glass-card text-on-surface-variant hover:text-primary"
          }`}
        >
          Ready <span className="w-2 h-2 rounded-full bg-[#4CAF50] status-pulse"></span>
          <span className="ml-1 bg-surface-variant text-on-surface px-2 py-0.5 rounded-full text-[11px]">{readyCount}</span>
        </Link>
        <Link
          href={`/orders?status=DELIVERED${search ? `&search=${search}` : ""}`}
          className={`snap-start whitespace-nowrap px-5 py-2 rounded-full font-label-sm text-label-sm transition-all ${
            statusFilter === "DELIVERED"
              ? "bg-primary text-on-primary shadow-md"
              : "glass-card text-on-surface-variant hover:text-primary"
          }`}
        >
          Delivered <span className="ml-2 bg-surface-variant text-on-surface px-2 py-0.5 rounded-full text-[11px]">{completedCount}</span>
        </Link>
      </div>

      {/* Orders List Container */}
      <div className="flex flex-col gap-4">
        {orders.length === 0 ? (
          <GlassCard className="text-center py-16">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40 mb-2">receipt</span>
            <p className="text-on-surface-variant font-medium">No orders found.</p>
            <Link href="/orders/new" className="mt-4 inline-flex items-center gap-2 text-primary font-semibold hover:underline">
              Create one now <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </GlassCard>
        ) : (
          orders.map((order) => {
            const trackingLink = order.publicOrderLinks[0]
              ? `${process.env.NEXT_PUBLIC_APP_URL || "https://mr-boot-crm.vercel.app"}/track/${order.publicOrderLinks[0].token}`
              : "#";

            const invoice = order.invoices[0];
            const invoiceLink = invoice ? `${process.env.NEXT_PUBLIC_APP_URL || "https://mr-boot-crm.vercel.app"}/invoices/${order.id}` : "#";

            // Prefilled WhatsApp reminder texts
            const formattedBillMsg = settings.billReadyTemplate
              .replace("{{customer_first_name}}", order.customer.firstName)
              .replace("{{invoice_pdf_or_track_link}}", trackingLink);

            const waBillUrl = `https://wa.me/${order.customer.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(formattedBillMsg)}`;

            return (
              <GlassCard key={order.id} className="relative overflow-hidden p-4 md:p-6 hover:translate-y-[-2px] transition-all">
                {/* Semantic status indicator bar */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${
                    order.status === "DELIVERED"
                      ? "bg-[#5e5e5c]"
                      : order.status === "READY"
                      ? "bg-[#4CAF50]"
                      : "bg-[#c89b3c]"
                  }`}
                />

                <div className="flex flex-col md:flex-row gap-6 relative z-10">
                  {/* Left Column: Customer details & Price */}
                  <div className="flex flex-row md:flex-col justify-between items-start md:w-48 gap-4 border-b md:border-b-0 border-black/5 pb-4 md:pb-0 md:pr-6 md:border-r">
                    <div>
                      <h3 className="font-semibold text-primary dark:text-primary-fixed leading-tight">
                        {order.customer.firstName} {order.customer.lastName}
                      </h3>
                      <p className="text-on-surface-variant text-[13px]">{order.customer.phone}</p>
                    </div>

                    <div className="text-right md:text-left">
                      <p className="text-[20px] font-semibold text-primary dark:text-primary-fixed">
                        ₹{Number(order.price).toLocaleString("en-IN")}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label-sm text-[11px] mt-1 border ${
                          order.status === "DELIVERED"
                            ? "bg-[#e1dfdc] text-[#636360] border-black/5"
                            : order.status === "READY"
                            ? "bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]"
                            : "bg-[#ffdea4]/20 text-[#cb9e3f] border-[#cb9e3f]/20"
                        }`}
                      >
                        {order.status === "READY" && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#4CAF50] status-pulse"></span>
                        )}
                        {order.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {/* Middle Column: Item details & Progress */}
                  <div className="flex-1 flex gap-6 items-center">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface-container flex-shrink-0 border border-black/5 shadow-inner">
                      <img
                        alt="Intake item"
                        className="w-full h-full object-cover"
                        src={order.items[0]?.photoUrl || "https://images.unsplash.com/photo-1542291026-7eec264c27ff"}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-xs text-outline uppercase tracking-wider mb-0.5">Order #{order.id.slice(-6).toUpperCase()}</p>
                          <h4 className="font-medium text-on-surface text-[15px]">{order.items.map((i) => i.brand ? `${i.brand} ${i.model}` : i.category).join(", ")}</h4>
                        </div>
                        <p className="text-[12px] text-outline">Due: {new Date(order.dueDate).toLocaleDateString("en-IN")}</p>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-4 flex items-center w-full max-w-sm">
                        <div className={`h-1.5 flex-1 rounded-l-full relative ${order.status !== "RECEIVED" ? "bg-[#4CAF50]" : "bg-surface-container-high"}`}>
                          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white shadow-sm ${order.status !== "RECEIVED" ? "bg-[#4CAF50]" : "bg-surface-container-high"}`}></div>
                        </div>
                        <div className={`h-1.5 flex-1 relative ${order.status === "READY" || order.status === "DELIVERED" ? "bg-[#4CAF50]" : "bg-surface-container-high"}`}>
                          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white shadow-sm ${order.status === "READY" || order.status === "DELIVERED" ? "bg-[#4CAF50]" : "bg-surface-container-high"}`}></div>
                        </div>
                        <div className={`h-1.5 flex-1 rounded-r-full relative ${order.status === "DELIVERED" ? "bg-[#4CAF50]" : "bg-surface-container-high"}`}>
                          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white shadow-sm ${order.status === "DELIVERED" ? "bg-[#4CAF50]" : "bg-surface-container-high"}`}></div>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between text-[11px] text-outline w-full max-w-sm font-label-sm">
                        <span>Intake</span>
                        <span>Workshop</span>
                        <span>Ready</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex sm:flex-col gap-2 justify-end w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-black/5">
                    <Link
                      href={`/orders/${order.id}`}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-black/5 hover:bg-black/5 transition-colors font-label-sm text-[13px]"
                    >
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                      Fulfill Workspace
                    </Link>
                    <a
                      href={waBillUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#25D366] text-white hover:bg-[#128C7E] transition-colors font-label-sm text-[13px] shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[18px]">send</span>
                      Send Bill
                    </a>
                  </div>
                </div>
              </GlassCard>
            );
          })
        )}
      </div>
    </div>
  );
}
