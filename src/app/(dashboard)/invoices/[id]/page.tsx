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
    },
  });

  if (!order || order.invoices.length === 0) {
    notFound();
  }

  const invoice = order.invoices[0];
  const token = order.publicOrderLinks[0]?.token || "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mr-boot-crm.vercel.app";
  const trackingUrl = `${appUrl}/track/${token}`;

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

  // Find first photo to display in the main top container
  const mainPhotoUrl = order.items.find(item => item.photoUrl)?.photoUrl;

  const fallbackShoeImg = "https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=150&auto=format&fit=crop&q=60"; // Classic premium brown shoe

  // Extract Created By
  let createdBy = "Neel Sonawane";
  if (order.notes) {
    const creatorMatch = order.notes.match(/Created By:\s*([^\n\r]+)/i);
    if (creatorMatch && creatorMatch[1]) {
      createdBy = creatorMatch[1].trim();
    }
  }

  return (
    <div className="w-full min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Container holding controls and the printable/savable invoice box */}
      <div className="w-full max-w-2xl flex flex-col gap-4">
        {/* Interactive Actions: Print + WhatsApp (Client Component) */}
        <Suspense fallback={null}>
          <InvoiceActions waShareUrl={waShareUrl} invoiceNumber={invoice.invoiceNumber} />
        </Suspense>

        {/* Invoice Box */}
        <div id="invoice-box" className="w-full rounded-[1.5rem] overflow-hidden relative border border-black/5 bg-white text-zinc-900 shadow-xl relative">
          {/* Top Accent Line */}
          <div className="h-2.5 w-full bg-[#361f1a]"></div>
          
          <div className="p-8 md:p-12">
            {/* Header Row */}
            <div className="flex justify-between items-start gap-6 mb-8">
              <div className="flex items-center gap-4">
                <img
                  src="/logo.png"
                  alt="Mr. Boot Logo"
                  crossOrigin="anonymous"
                  className="w-16 h-16 rounded-full object-cover border border-black/5"
                />
                <div>
                  <h1 className="text-2xl font-bold text-[#361f1a] tracking-tight">Mr. Boot</h1>
                  <p className="text-xs text-[#cb9e3f] font-bold tracking-widest uppercase mt-0.5">PREMIUM CARE</p>
                </div>
              </div>

              <div className="text-right">
                <h2 className="text-xl font-bold text-[#361f1a] tracking-wider uppercase mb-1">RECEIPT</h2>
                <p className="text-xs text-zinc-500">Order: <span className="font-semibold text-[#361f1a]">#{invoice.invoiceNumber}</span></p>
                <p className="text-xs text-zinc-500">Date: {invoiceDate}</p>
                <p className="text-xs text-zinc-500">Created By: <span className="font-semibold text-[#361f1a]">{createdBy}</span></p>
              </div>
            </div>

            {/* Main Item Intake / Preview Box */}
            <div className="mb-6 w-full bg-zinc-50 rounded-2xl p-4 flex items-center justify-center border border-zinc-100 min-h-[180px]">
              {mainPhotoUrl ? (
                <img
                  src={mainPhotoUrl}
                  alt="Item intake"
                  crossOrigin="anonymous"
                  className="max-h-64 object-contain rounded-xl shadow-md border border-white"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-zinc-400">
                  <span className="material-symbols-outlined text-[48px] text-[#cb9e3f] mb-2">dry_cleaning</span>
                  <p className="text-sm font-semibold text-zinc-600">Premium Care Intake</p>
                  <p className="text-xs text-zinc-400">No photos uploaded for this order</p>
                </div>
              )}
            </div>

            {/* Billed To Customer Info */}
            <div className="mb-8 bg-zinc-50 rounded-xl p-5 border border-zinc-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1.5 font-bold">Billed To</span>
                <p className="text-lg font-bold text-[#361f1a]">{order.customer.firstName} {order.customer.lastName}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{order.customer.phone}</p>
              </div>
              <div className="flex flex-col gap-1 bg-white border border-zinc-200/80 rounded-lg py-2 px-3 self-start sm:self-auto min-w-[200px] shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
                  <input
                    type="checkbox"
                    checked={order.isPorter || false}
                    readOnly
                    className="rounded border-zinc-300 text-zinc-800 focus:ring-zinc-800 w-4 h-4 pointer-events-none"
                  />
                  <span>Pick & Drop via Porter</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-zinc-400 pl-6">
                  <span>{order.isPorter ? `Porter Courier Active` : "Self Pickup"}</span>
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div className="mb-8">
              <div className="flex justify-between items-center border-b border-zinc-200 pb-2 mb-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                <span>SERVICE DESCRIPTION</span>
                <span className="text-right">AMOUNT</span>
              </div>

              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between items-start border-b border-dashed border-zinc-200 pb-4 mb-4">
                  <div className="flex items-center gap-4 flex-1 pr-4">
                    {/* Shoe card preview */}
                    <div className="w-20 h-20 bg-zinc-50 rounded-xl border border-zinc-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      <img
                        src={item.photoUrl || fallbackShoeImg}
                        alt={`${item.category} thumbnail`}
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-base font-bold text-[#361f1a] mb-1">
                        {item.brand ? `${item.brand} ${item.model || item.category}` : item.category}
                      </p>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        {item.services.join(", ")} {item.description && `— ${item.description}`}
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-[#361f1a] text-lg whitespace-nowrap">
                    ₹{Number(order.price).toLocaleString("en-IN")}.00
                  </p>
                </div>
              ))}
            </div>

            {/* Totals & QR Tracker Section */}
            <div className="flex flex-col sm:flex-row justify-between items-end gap-6 mb-4 pt-4 relative">
              {/* QR Code */}
              {qrCodeDataUrl && (
                <div className="flex items-center gap-4 w-full sm:w-auto relative border border-zinc-100 p-3 rounded-xl bg-white shadow-sm">
                  <img src={qrCodeDataUrl} alt="Track status QR code" className="w-16 h-16 rounded flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-[#361f1a] mb-0.5">Track Order Status</p>
                    <p className="text-[11px] text-zinc-400 leading-tight">Scan to view live restoration progress</p>
                  </div>
                </div>
              )}

              {/* Price breakdown */}
              <div className="w-full sm:w-64 space-y-2 text-sm text-zinc-500">
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
                <div className="flex justify-between text-xs font-semibold text-zinc-500">
                  <span>Payment Mode</span>
                  <span className="uppercase text-[#361f1a]">{invoice.paymentMode}</span>
                </div>
                <div className="h-px bg-zinc-200 my-2"></div>
                <div className="flex justify-between items-end">
                  <span className="font-bold text-[#361f1a]">Total</span>
                  <span className="text-2xl font-bold text-[#361f1a]">₹{Number(invoice.amount).toLocaleString("en-IN")}.00</span>
                </div>
              </div>

              {/* PAID / UNPAID stamp */}
              {Number(invoice.balanceDue) === 0 ? (
                <div className="absolute right-8 bottom-[160px] transform -rotate-12 pointer-events-none select-none">
                  <div className="border-[3px] border-emerald-600 text-emerald-600 font-black text-3xl px-8 py-2 rounded-lg uppercase tracking-[0.3em] opacity-75"
                    style={{ fontFamily: "serif", textShadow: "0 0 1px #16a34a" }}>
                    PAID
                  </div>
                </div>
              ) : (
                <div className="absolute right-8 bottom-[160px] transform -rotate-12 pointer-events-none select-none">
                  <div className="border-[3px] border-red-600 text-red-600 font-black text-3xl px-6 py-2 rounded-lg uppercase tracking-[0.25em] opacity-70"
                    style={{ fontFamily: "serif", textShadow: "0 0 1px #dc2626" }}>
                    UNPAID
                  </div>
                </div>
              )}

            </div>

            {/* Signature Footer */}
            <div className="text-center mt-12 pt-6 border-t border-zinc-100">
              <p className="text-xs text-zinc-400 italic max-w-md mx-auto">
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
