import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InvoiceActions } from "@/components/invoices/invoice-actions";
import QRCode from "qrcode";

interface InvoicePageProps {
  params: {
    id: string;
  };
}

interface ServiceItem {
  type: "item" | "addon";
  title: string;
  price: number;
  description?: string;
  services?: string[];
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  const orderId = params.id;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      items: true,
      invoices: true,
      publicOrderLinks: true,
      addons: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order || order.invoices.length === 0) {
    notFound();
    return null;
  }

  const invoice = order.invoices[0];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mr-boot-crm.vercel.app";
  const token = order.publicOrderLinks[0]?.token || "";
  const trackingUrl = `${appUrl}/track/${token}`;

  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });

  const phone = order.customer.phone.replace(/[^0-9]/g, "");
  const baseMessage =
    settings?.billReadyTemplate ||
    "Hi {{customer_first_name}}, Neel Sonawane here from Mr Boot. Your bill is ready: {{invoice_pdf_or_track_link}}";
  const message = baseMessage
    .replace("{{customer_first_name}}", order.customer.firstName)
    .replace("{{invoice_pdf_or_track_link}}", trackingUrl);
  const waShareUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  // Main photo from first item that has one
  const mainPhotoUrl = order.items.find((item) => item.photoUrl)?.photoUrl ?? null;

  const formattedOrderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const balanceDue = Number(invoice.balanceDue);
  const paymentStatus = balanceDue <= 0 ? "Paid" : "Pending";

  // Addons typed properly by double-casting to bypass TS2352
  const addons = (order.addons as any) as Array<{
    id: string;
    itemName: string;
    qty: number;
    unitCost: number | string;
    totalCost: number | string;
  }>;

  // Generate QR code server side
  let qrCodeDataUrl = "";
  try {
    qrCodeDataUrl = await QRCode.toDataURL(trackingUrl, {
      margin: 1,
      width: 150,
      errorCorrectionLevel: "H",
    });
  } catch (err) {
    console.error("Failed to generate QR code:", err);
    qrCodeDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackingUrl)}`;
  }

  // Group items and addons into a single list of service rows for pagination
  const itemsList: ServiceItem[] = order.items.map((item) => {
    // Order stores total price. We divide total price equally among items.
    const itemPrice = Number(order.price) / (order.items.length || 1);
    return {
      type: "item" as const,
      title: item.brand
        ? `${item.brand} ${item.model || item.category}`
        : item.model || item.category,
      price: itemPrice,
      description: item.description || undefined,
      services: item.services,
    };
  });

  const addonsList: ServiceItem[] = addons.map((addon) => ({
    type: "addon" as const,
    title: addon.itemName,
    price: Number(addon.totalCost),
    description: `Qty: ${addon.qty} @ ₹${Number(addon.unitCost)} each`,
  }));

  const allServices = [...itemsList, ...addonsList];

  // Dynamic pagination logic
  const pages: ServiceItem[][] = [];
  const hasHero = !!mainPhotoUrl;

  if (allServices.length === 1) {
    pages.push(allServices);
  } else {
    // Page 1 holds fewer items because it has the Hero image and Customer Card
    const page1Limit = hasHero ? 1 : 2;
    pages.push(allServices.slice(0, page1Limit));

    let remaining = allServices.slice(page1Limit);
    while (remaining.length > 0) {
      if (remaining.length <= 2) {
        pages.push(remaining);
        remaining = [];
      } else {
        pages.push(remaining.slice(0, 3));
        remaining = remaining.slice(3);
      }
    }
  }

  const totalPages = pages.length;

  // Pricing calculations
  const subtotal = allServices.reduce((sum, item) => sum + item.price, 0);
  const total = Number(invoice.amount);

  return (
    <div className="w-full min-h-screen bg-[#faf9f6] flex flex-col items-center justify-start py-8 px-4 font-sans">
      {/* Global CSS overrides for print view */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body {
                background-color: #ffffff !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .invoice-page {
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
                margin: 0 !important;
                page-break-after: always;
                break-after: page;
                width: 100% !important;
                max-width: 100% !important;
                height: auto !important;
              }
            }
          `,
        }}
      />

      {/* Action buttons (hidden in print) */}
      <div className="w-full max-w-[430px] mb-4 print:hidden">
        <InvoiceActions waShareUrl={waShareUrl} invoiceNumber={invoice.invoiceNumber} />
      </div>

      {/* Render all paginated receipt cards */}
      <div className="w-full flex flex-col items-center gap-6 print:gap-0">
        {pages.map((pageItems, p) => {
          const isFirstPage = p === 0;
          const isLastPage = p === totalPages - 1;

          return (
            <div
              key={p}
              className="invoice-page w-full max-w-[430px] bg-white shadow-xl rounded-3xl border border-zinc-100 flex flex-col justify-between overflow-hidden relative print:shadow-none print:border-none print:rounded-none"
              style={{
                aspectRatio: "1/1.91",
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              {/* Header brown line */}
              <div className="w-full h-1.5 bg-[#361f1a] flex-shrink-0"></div>

              {/* Page Content */}
              <div className="flex-1 flex flex-col justify-start">
                {/* ── HEADER ── */}
                <div className="flex justify-between items-start px-6 pt-6 pb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src="/logo.png"
                      alt="Mr. Boot Logo"
                      crossOrigin="anonymous"
                      className="w-12 h-12 rounded-full border border-zinc-200 flex-shrink-0 object-cover"
                    />
                    <div>
                      <h1 className="text-lg font-black text-[#361f1a] leading-none">Mr. Boot</h1>
                      <p className="text-[9px] font-bold text-[#b38e5d] tracking-widest uppercase mt-0.5">
                        Premium Care
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-black tracking-wide text-zinc-950 leading-none">RECEIPT</h2>
                    <p className="text-[11px] text-zinc-800 font-medium mt-1">
                      Order: <span className="font-bold">#{invoice.invoiceNumber}</span>
                    </p>
                    <p className="text-[9px] text-zinc-500 mt-0.5">{formattedOrderDate}</p>
                  </div>
                </div>

                {/* ── HERO IMAGE (Page 1 Only) ── */}
                {isFirstPage && mainPhotoUrl && (
                  <div className="px-6 mb-4">
                    <div className="bg-zinc-100/80 rounded-2xl flex items-center justify-center p-3 h-52 w-full overflow-hidden">
                      <img
                        src={mainPhotoUrl}
                        alt="Hero Shoe Image"
                        crossOrigin="anonymous"
                        className="max-h-full max-w-full object-contain rounded-lg"
                      />
                    </div>
                  </div>
                )}

                {/* ── CUSTOMER CARD (Page 1 Only) ── */}
                {isFirstPage && (
                  <div className="px-6 mb-4">
                    <div className="bg-zinc-100/70 border border-zinc-100/80 rounded-2xl p-4">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">
                        Billed To
                      </span>
                      <h3 className="text-base font-bold text-zinc-800 mt-0.5 leading-tight">
                        {order.customer.firstName} {order.customer.lastName}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">{order.customer.phone}</p>
                    </div>
                  </div>
                )}

                {/* ── SERVICE DESCRIPTION TABLE ── */}
                <div className="px-6 mb-4 flex-1 flex flex-col justify-start">
                  <div className="flex justify-between items-center text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    <span>Service Description</span>
                    <span>Amount</span>
                  </div>
                  <div className="border-t border-dashed border-zinc-200 mb-2"></div>
                  <div className="space-y-3">
                    {pageItems.map((item, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between items-start gap-4">
                          <h4 className="text-sm font-bold text-zinc-800 leading-snug">{item.title}</h4>
                          <span className="text-sm font-bold text-zinc-800">
                            ₹{item.price.toFixed(2)}
                          </span>
                        </div>
                        {item.services && item.services.length > 0 && (
                          <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed font-medium">
                            {item.services.join(", ")}
                          </p>
                        )}
                        {item.description && (
                          <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                        <div className="border-t border-dashed border-zinc-200 mt-3"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Sticky Layout */}
              <div className="flex-shrink-0 flex flex-col justify-end">
                {/* ── BILLING SUMMARY & QR (Last Page Only) ── */}
                {isLastPage && (
                  <div className="px-6 mb-4 relative z-0">
                    <div className="flex justify-between items-end gap-4 relative pb-4">
                      {/* PAID Stamp overlapping */}
                      {paymentStatus === "Paid" && (
                        <div className="absolute left-[135px] bottom-[30px] border-2 border-emerald-500 rounded px-2.5 py-0.5 select-none z-10 pointer-events-none transform -rotate-12 bg-white/90 backdrop-blur-[1px] shadow-sm">
                          <span className="text-emerald-500 font-black tracking-widest text-xs uppercase">
                            PAID
                          </span>
                        </div>
                      )}

                      {/* Left: QR Code info */}
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-[68px] h-[68px] bg-white border border-zinc-200 rounded-xl p-1 flex items-center justify-center flex-shrink-0 shadow-sm">
                          {qrCodeDataUrl ? (
                            <img
                              src={qrCodeDataUrl}
                              alt="Tracking QR Code"
                              crossOrigin="anonymous"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="w-full h-full bg-zinc-100 rounded-lg flex items-center justify-center text-[8px] text-zinc-400 text-center font-bold">
                              QR
                            </div>
                          )}
                        </div>
                        <div>
                          <h5 className="text-[10px] font-bold text-zinc-800 leading-tight">
                            Track Order Status
                          </h5>
                          <p className="text-[8px] text-zinc-400 leading-tight mt-0.5 max-w-[110px]">
                            Scan to view restoration progress
                          </p>
                        </div>
                      </div>

                      {/* Right: Totals */}
                      <div className="w-[160px] text-right">
                        <div className="flex justify-between items-center text-xs text-zinc-500 mb-1">
                          <span>Subtotal</span>
                          <span>₹{subtotal.toFixed(2)}</span>
                        </div>
                        {Number(invoice.advancePaid) > 0 && (
                          <div className="flex justify-between items-center text-xs text-zinc-500 mb-1">
                            <span>Advance</span>
                            <span>₹{Number(invoice.advancePaid).toFixed(2)}</span>
                          </div>
                        )}
                        {balanceDue > 0 && (
                          <div className="flex justify-between items-center text-xs text-zinc-500 mb-1">
                            <span>Balance</span>
                            <span className="text-red-500 font-bold">₹{balanceDue.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="border-t border-zinc-200 my-1.5"></div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs font-bold text-zinc-800">Total</span>
                          <span className="text-lg font-black text-zinc-950">₹{total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* WhatsApp Action Button */}
                    <div className="pt-2 pb-4 print:hidden">
                      <a
                        href={waShareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 border border-emerald-500 text-emerald-600 bg-white hover:bg-emerald-50 font-bold text-xs py-2 px-5 rounded-full w-fit mx-auto cursor-pointer shadow-sm transition-colors"
                      >
                        <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] material-symbols-outlined font-normal">
                          chat
                        </span>
                        Share via WhatsApp
                      </a>
                    </div>
                  </div>
                )}

                {/* ── FOOTER ── */}
                <div className="border-t border-zinc-100 mx-6 pt-4 pb-6 flex flex-col items-center">
                  <span className="material-symbols-outlined text-[18px] text-[#b38e5d] mb-1 font-normal">
                    construction
                  </span>
                  <p className="text-[9px] text-zinc-400 text-center italic max-w-[280px] leading-relaxed">
                    &quot;True craftsmanship takes time. Thank you for trusting Mr. Boot with your prized
                    footwear. Wear them in good health.&quot;
                  </p>

                  {/* Page indicator */}
                  {totalPages > 1 && (
                    <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mt-3">
                      Page {p + 1} of {totalPages}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
