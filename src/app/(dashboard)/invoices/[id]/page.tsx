import React from "react";
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
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
    month: "long",
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

  return (
    <div className="w-full min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Invoice Box */}
      <div className="glass-card w-full max-w-2xl rounded-[1.5rem] overflow-hidden relative border border-white/20 shadow-2xl bg-white/70">
        {/* Top Accent Line */}
        <div className="h-2.5 w-full bg-primary"></div>
        <div className="p-8 md:p-12">
          {/* Interactive Actions: Print + WhatsApp (Client Component) */}
          <InvoiceActions waShareUrl={waShareUrl} />

          {/* Header Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border border-black/5 bg-white flex-shrink-0 flex items-center justify-center text-primary font-bold text-2xl">
                MB
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary">Mr. Boot</h1>
                <p className="text-xs text-[#cb9e3f] tracking-widest uppercase mt-0.5">Premium Shoe Laundry</p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <h2 className="text-xl font-bold text-primary mb-1 uppercase">Receipt</h2>
              <p className="text-xs text-on-surface-variant">Invoice: <span className="font-semibold text-primary">#{invoice.invoiceNumber}</span></p>
              <p className="text-xs text-on-surface-variant">Date: {invoiceDate}</p>
            </div>
          </div>

          {/* Billed To Customer Info */}
          <div className="mb-8 bg-black/5 rounded-xl p-6 border border-black/5">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">Billed To</p>
            <p className="text-lg font-bold text-primary">{order.customer.firstName} {order.customer.lastName}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">{order.customer.phone}</p>
          </div>

          {/* Items Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center border-b border-black/5 pb-2 mb-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              <span>Service Description</span>
              <span className="text-right">Amount</span>
            </div>

            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-start border-b border-dashed border-black/5 pb-4 mb-4">
                <div className="pr-4">
                  <p className="text-md font-semibold text-primary mb-0.5">{item.brand ? `${item.brand} ${item.model}` : item.category}</p>
                  <p className="text-xs text-on-surface-variant">{item.services.join(", ")}</p>
                </div>
                <p className="font-semibold text-primary whitespace-nowrap">₹{Number(order.price).toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>

          {/* Totals & QR Tracker Section */}
          <div className="flex flex-col sm:flex-row justify-between items-end gap-6 mb-8 pt-4">
            {/* QR Code */}
            {qrCodeDataUrl && (
              <div className="flex items-center gap-4 w-full sm:w-auto relative border border-black/5 p-3 rounded-xl bg-white">
                <img src={qrCodeDataUrl} alt="Track status QR code" className="w-20 h-20 rounded flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-primary mb-0.5">Track Order Status</p>
                  <p className="text-[11px] text-on-surface-variant">Scan to view live restoration progress</p>
                </div>
              </div>
            )}

            {/* Price breakdown */}
            <div className="w-full sm:w-60 space-y-2 text-sm text-on-surface-variant">
              <div className="flex justify-between">
                <span>Advance Paid</span>
                <span>₹{Number(invoice.advancePaid).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between font-semibold text-primary">
                <span>Balance Due</span>
                <span className={Number(invoice.balanceDue) > 0 ? "text-error" : "text-[#2E7D32]"}>
                  ₹{Number(invoice.balanceDue).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="h-px bg-black/10 my-2"></div>
              <div className="flex justify-between items-end">
                <span className="font-semibold text-primary">Total Amount</span>
                <span className="text-2xl font-bold text-primary">₹{Number(invoice.amount).toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>



          {/* Signature Footer */}
          <div className="text-center mt-12 pt-6 border-t border-black/5">
            <p className="text-xs text-on-surface-variant italic max-w-md mx-auto">
              &ldquo;True craftsmanship takes time. Thank you for trusting Mr. Boot with your prized footwear. Wear them in good health.&rdquo;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
