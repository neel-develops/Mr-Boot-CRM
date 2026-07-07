import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";
import { InvoiceActions } from "@/components/invoices/invoice-actions";

interface InvoicePageProps {
  params: {
    id: string;
  };
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  const orderId = params.id;

  // 1. Fetch Order and Invoice details
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
  }

  const invoice = order.invoices[0];
  const token = order.publicOrderLinks[0]?.token || "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mr-boot-crm.vercel.app";
  const trackingUrl = `${appUrl}/track/${token}`;
  
  // Check if this is a readymade shoe sale
  const isReadymade = order.serviceType.toLowerCase().includes("readymade");

  // 2. Generate QR code server-side
  let qrCodeDataUrl = "";
  try {
    qrCodeDataUrl = await QRCode.toDataURL(trackingUrl, {
      margin: 1,
      width: 150,
      color: {
        dark: "#361f1a", // primary color match
        light: "#ffffff",
      },
    });
  } catch (err) {
    console.error("Failed to generate QR code:", err);
  }

  // Pre-formatted dates
  const invoiceDate = new Date(invoice.createdAt).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Calculate WhatsApp link for deep-sharing invoice receipt
  const phone = order.customer.phone.replace(/[^0-9]/g, "");
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  const baseMessage = settings?.billReadyTemplate || "Hi {{customer_first_name}}, Neel Sonawane here from Mr Boot. Your bill is ready: {{invoice_pdf_or_track_link}}";
  const message = baseMessage
    .replace("{{customer_first_name}}", order.customer.firstName)
    .replace("{{invoice_pdf_or_track_link}}", trackingUrl);
  const waShareUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  // Extract Created By
  let createdBy = "Staff";
  if (order.notes) {
    const creatorMatch = order.notes.match(/Created By:\s*([^\n\r]+)/i);
    if (creatorMatch && creatorMatch[1]) {
      createdBy = creatorMatch[1].trim();
    }
  }

  return (
    <div className="w-full min-h-screen bg-background flex items-center justify-center py-6 px-4">
      {/* Container holding controls and the printable/savable invoice box (constrained to standard mobile/tablet width) */}
      <div className="w-full max-w-md flex flex-col gap-4">
        {/* Interactive Actions: Print + WhatsApp (Client Component) */}
        <Suspense fallback={null}>
          <InvoiceActions waShareUrl={waShareUrl} invoiceNumber={invoice.invoiceNumber} />
        </Suspense>

        {/* Invoice Box: width locked to standard 400px maximum for crisp, non-blurry PNG rendering */}
        <div 
          id="invoice-box" 
          className="w-full mx-auto rounded-[1.5rem] overflow-hidden border border-black/5 bg-white text-zinc-900 shadow-lg relative"
          style={{ maxWidth: "420px", width: "100%" }}
        >
          {/* Top Accent Line */}
          <div className="h-2 w-full bg-[#361f1a]"></div>
          
          <div className="p-6">
            {/* Header Row */}
            <div className="flex justify-between items-start gap-4 mb-5 pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="Mr. Boot Logo"
                  crossOrigin="anonymous"
                  className="w-12 h-12 rounded-full object-cover border border-black/5"
                />
                <div>
                  <h1 className="text-xl font-bold text-[#361f1a] tracking-tight">Mr. Boot</h1>
                  <p className="text-[9px] text-[#cb9e3f] font-bold tracking-wider uppercase">PREMIUM CARE</p>
                </div>
              </div>

              <div className="text-right">
                <h2 className="text-sm font-bold text-[#361f1a] tracking-wider uppercase">RECEIPT</h2>
                <p className="text-[11px] text-zinc-500">Order: <span className="font-semibold text-[#361f1a]">#{invoice.invoiceNumber}</span></p>
                <p className="text-[11px] text-zinc-500">{invoiceDate}</p>
                <p className="text-[10px] text-zinc-400">By: {createdBy}</p>
              </div>
            </div>

            {/* Billed To Customer Info */}
            <div className="mb-5 bg-zinc-50 rounded-xl p-4 border border-zinc-100 flex flex-col gap-3">
              <div>
                <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-bold block mb-1">Customer Details</span>
                <p className="text-base font-bold text-[#361f1a]">{order.customer.firstName} {order.customer.lastName}</p>
                <p className="text-xs text-zinc-600 font-medium">{order.customer.phone}</p>
              </div>
              
              {/* Porter/Delivery Info (only show if not a standard ready-made sale, or format compactly) */}
              {!isReadymade && (
                <div className="border-t border-zinc-200/60 pt-2.5 mt-1">
                  {(() => {
                    const pickup = order.pickupByPorter || false;
                    const drop = order.dropByPorter || false;
                    let label = "Self Pickup & Self Drop";
                    if (pickup && drop) label = "Porter Pickup & Drop";
                    else if (pickup) label = "Porter Pickup / Self Drop";
                    else if (drop) label = "Self Pickup / Porter Drop";
                    const hasPorter = pickup || drop;
                    return (
                      <div className="flex items-center justify-between text-xs text-zinc-700 font-medium">
                        <span className="text-zinc-400 font-semibold text-[9px] uppercase">Delivery:</span>
                        <span>{label}</span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Items Section */}
            <div className="mb-5">
              <div className="flex justify-between items-center border-b border-zinc-200 pb-1.5 mb-3 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                <span>SERVICE DESCRIPTION</span>
                <span className="text-right">AMOUNT</span>
              </div>

              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between items-start border-b border-dashed border-zinc-200 pb-3 mb-3 last:border-0 last:pb-0 last:mb-0">
                  <div className="flex-1 pr-4">
                    <p className="text-sm font-bold text-[#361f1a] mb-0.5">
                      {item.brand ? `${item.brand} ${item.model || item.category}` : item.category}
                    </p>
                    <p className="text-[11px] text-zinc-500 leading-normal">
                      {item.services.join(", ")} {item.description && `— ${item.description}`}
                    </p>
                  </div>
                  <p className="font-bold text-[#361f1a] text-sm whitespace-nowrap">
                    ₹{Number(order.price).toLocaleString("en-IN")}.00
                  </p>
                </div>
              ))}
            </div>

            {/* Addons Section */}
            {(order.addons || []).length > 0 && (
              <div className="mb-5">
                <div className="flex justify-between items-center border-b border-zinc-200 pb-1.5 mb-3 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                  <span>ADD-ONS & EXTRAS</span>
                  <span className="text-right">AMOUNT</span>
                </div>
                {(order.addons as any[]).map((addon) => (
                  <div key={addon.id} className="flex justify-between items-center border-b border-dashed border-zinc-200 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                    <div>
                      <p className="text-xs font-semibold text-[#361f1a]">{addon.itemName}</p>
                      <p className="text-[10px] text-zinc-400">{addon.qty} × ₹{Number(addon.unitCost).toLocaleString("en-IN")}</p>
                    </div>
                    <p className="font-bold text-xs text-[#361f1a]">
                      ₹{Number(addon.totalCost).toLocaleString("en-IN")}.00
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Totals & QR Tracker Section */}
            <div className="flex flex-col gap-4 pt-3 border-t border-zinc-100 relative">
              {/* QR Code (Hidden for Ready-Made, shown for Bespoke/Services) */}
              {qrCodeDataUrl && !isReadymade && (
                <div className="flex items-center gap-3 border border-zinc-100 p-2.5 rounded-xl bg-white shadow-sm w-full">
                  <img src={qrCodeDataUrl} alt="Track status QR code" className="w-12 h-12 rounded flex-shrink-0" />
                  <div>
                    <p className="text-[11px] font-bold text-[#361f1a] mb-0.5">Track Order Status</p>
                    <p className="text-[9px] text-zinc-400 leading-tight">Scan to view live restoration progress</p>
                  </div>
                </div>
              )}

              {/* Price breakdown */}
              <div className="w-full space-y-1.5 text-xs text-zinc-500">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{Number(order.price).toLocaleString("en-IN")}.00</span>
                </div>

                <div className="flex justify-between">
                  <span>Advance Paid</span>
                  <span>₹{Number(invoice.advancePaid).toLocaleString("en-IN")}.00</span>
                </div>
                <div className="flex justify-between font-bold text-[#361f1a]">
                  <span>Balance Due</span>
                  <span className={Number(invoice.balanceDue) > 0 ? "text-red-600" : "text-emerald-600"}>
                    ₹{Number(invoice.balanceDue).toLocaleString("en-IN")}.00
                  </span>
                </div>
                <div className="flex justify-between text-[11px] font-semibold text-zinc-500">
                  <span>Payment Mode</span>
                  <span className="uppercase text-[#361f1a]">{invoice.paymentMode}</span>
                </div>
                <div className="h-px bg-zinc-200 my-1.5"></div>
                <div className="flex justify-between items-end">
                  <span className="font-bold text-[#361f1a]">Total</span>
                  <span className="text-xl font-bold text-[#361f1a]">₹{Number(invoice.amount).toLocaleString("en-IN")}.00</span>
                </div>
              </div>

              {/* PAID / UNPAID stamp */}
              {Number(invoice.balanceDue) === 0 ? (
                <div className="absolute right-4 top-1 transform -rotate-12 pointer-events-none select-none">
                  <div className="border-2 border-emerald-600 text-emerald-600 font-black text-xl px-4 py-1 rounded uppercase tracking-[0.25em] opacity-65"
                    style={{ fontFamily: "serif", textShadow: "0 0 1px #16a34a" }}>
                    PAID
                  </div>
                </div>
              ) : (
                <div className="absolute right-4 top-1 transform -rotate-12 pointer-events-none select-none">
                  <div className="border-2 border-red-600 text-red-600 font-black text-xl px-3 py-1 rounded uppercase tracking-[0.2em] opacity-60"
                    style={{ fontFamily: "serif", textShadow: "0 0 1px #dc2626" }}>
                    UNPAID
                  </div>
                </div>
              )}

            </div>

            {/* Signature Footer */}
            <div className="text-center mt-8 pt-4 border-t border-zinc-100">
              <p className="text-[10px] text-zinc-400 italic max-w-xs mx-auto">
                &ldquo;True craftsmanship takes time. Thank you for trusting Mr. Boot with your prized footwear. Wear them in good health.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
