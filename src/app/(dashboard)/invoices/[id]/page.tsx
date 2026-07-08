import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InvoiceActions } from "@/components/invoices/invoice-actions";

interface InvoicePageProps {
  params: {
    id: string;
  };
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
  }

  const invoice = order.invoices[0];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mr-boot-crm.vercel.app";
  const token = order.publicOrderLinks[0]?.token || "";
  const trackingUrl = `${appUrl}/track/${token}`;

  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  const orgPhone = settings?.orgPhone || "9028983659";

  const phone = order.customer.phone.replace(/[^0-9]/g, "");
  const baseMessage =
    settings?.billReadyTemplate ||
    "Hi {{customer_first_name}}, Neel Sonawane here from Mr Boot. Your bill is ready: {{invoice_pdf_or_track_link}}";
  const message = baseMessage
    .replace("{{customer_first_name}}", order.customer.firstName)
    .replace("{{invoice_pdf_or_track_link}}", trackingUrl);
  const waShareUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  // Main photo from first item that has one
  const mainPhotoUrl = order.items.find((item) => item.photoUrl)?.photoUrl;

  const now = new Date();
  const currentDateTime = now.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const dueDate = new Date(order.dueDate).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const balanceDue = Number(invoice.balanceDue);
  const paymentStatus = balanceDue <= 0 ? "Paid" : "Pending";

  // Build line items — each order item as one row, price spread evenly
  const itemCount = order.items.length || 1;
  const pricePerItem = Number(order.price) / itemCount;

  return (
    <div className="w-full min-h-screen bg-gray-100 flex flex-col items-center justify-start py-8 px-4">
      {/* Action buttons */}
      <div className="w-full max-w-[900px] mb-4">
        <Suspense fallback={null}>
          <InvoiceActions waShareUrl={waShareUrl} invoiceNumber={invoice.invoiceNumber} />
        </Suspense>
      </div>

      {/* Invoice Box — matches the screenshot size exactly */}
      <div
        id="invoice-box"
        className="w-full bg-white shadow-md text-zinc-900"
        style={{ maxWidth: "900px", fontFamily: "Arial, sans-serif", fontSize: "14px" }}
      >
        {/* ── HEADER ── */}
        <div className="flex justify-between items-start px-8 pt-8 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Mr Boot Shoe Laundry &amp; Repair</h1>
            <p className="text-zinc-600 mt-0.5">Service Invoice</p>
            <p className="font-bold mt-2">Order number: #{invoice.invoiceNumber}</p>
          </div>
          <img
            src="/logo.png"
            alt="Mr. Boot Logo"
            crossOrigin="anonymous"
            className="w-16 h-16 rounded-full object-cover border border-zinc-200"
          />
        </div>

        {/* ── 3-COLUMN INFO BAR ── */}
        <div className="mx-8 mb-5 grid grid-cols-3 border border-zinc-200 rounded-sm overflow-hidden text-center text-sm">
          <div className="py-3 px-4 border-r border-zinc-200 bg-zinc-50">
            <p className="text-zinc-500 text-xs">Due Date:</p>
            <p className="font-bold mt-0.5">{dueDate}</p>
          </div>
          <div className="py-3 px-4 border-r border-zinc-200 bg-zinc-50">
            <p className="text-zinc-500 text-xs">Current Date &amp; Time:</p>
            <p className="font-bold mt-0.5">{currentDateTime}</p>
          </div>
          <div className="py-3 px-4 bg-zinc-50">
            <p className="text-zinc-500 text-xs">Payment Status:</p>
            <p
              className="font-bold mt-0.5"
              style={{ color: paymentStatus === "Paid" ? "#16a34a" : "#dc2626" }}
            >
              {paymentStatus}
            </p>
          </div>
        </div>

        {/* ── ITEM PHOTO ── */}
        {mainPhotoUrl && (
          <div className="mx-8 mb-5 flex items-center justify-center bg-zinc-50 border border-zinc-200 rounded-sm py-4 px-6">
            <img
              src={mainPhotoUrl}
              alt="Item photo"
              crossOrigin="anonymous"
              className="max-h-52 max-w-xs object-contain"
            />
          </div>
        )}

        {/* ── LINE ITEMS TABLE ── */}
        <div className="mx-8 mb-4">
          {/* Table Header */}
          <div
            className="grid text-sm font-bold text-zinc-700 border-b border-zinc-300 pb-2 mb-1"
            style={{ gridTemplateColumns: "1fr 80px 100px 100px" }}
          >
            <span>Item / Service Description</span>
            <span className="text-center">Rate</span>
            <span className="text-center">Quantity</span>
            <span className="text-right">Amount</span>
          </div>

          {/* Items */}
          {order.items.map((item, idx) => {
            const rowPrice = order.items.length > 1 ? pricePerItem : Number(order.price);
            return (
              <div
                key={item.id}
                className="py-3 border-b border-zinc-100"
                style={{ gridTemplateColumns: "1fr 80px 100px 100px" }}
              >
                <div className="grid" style={{ gridTemplateColumns: "1fr 80px 100px 100px" }}>
                  <div>
                    <p className="font-bold text-zinc-900">
                      {item.brand
                        ? `${item.brand} ${item.model || item.category}`
                        : item.model || item.category}
                    </p>
                    <p className="text-zinc-500 text-xs italic mt-0.5">
                      {item.services.join(", ")}
                    </p>
                    {item.description && (
                      <p className="text-zinc-400 text-xs mt-0.5">{item.description}</p>
                    )}
                  </div>
                  <span className="text-center text-sm self-start pt-0.5">
                    ₹{rowPrice.toLocaleString("en-IN")}
                  </span>
                  <span className="text-center text-sm self-start pt-0.5">1</span>
                  <span className="text-right font-bold text-sm self-start pt-0.5">
                    ₹{rowPrice.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Addons */}
          {(order.addons as any[]).map((addon) => (
            <div key={addon.id} className="py-3 border-b border-zinc-100">
              <div className="grid" style={{ gridTemplateColumns: "1fr 80px 100px 100px" }}>
                <div>
                  <p className="font-bold text-zinc-900">{addon.itemName}</p>
                  <p className="text-zinc-400 text-xs italic">Add-on</p>
                </div>
                <span className="text-center text-sm self-start pt-0.5">
                  ₹{Number(addon.unitCost).toLocaleString("en-IN")}
                </span>
                <span className="text-center text-sm self-start pt-0.5">{addon.qty}</span>
                <span className="text-right font-bold text-sm self-start pt-0.5">
                  ₹{Number(addon.totalCost).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ── BILLING SUMMARY BOX — right-aligned, matches screenshot ── */}
        <div className="mx-8 mb-6 flex justify-end">
          <div
            className="border rounded-sm p-4 text-sm"
            style={{
              width: "280px",
              borderColor: "#dc2626",
              borderWidth: "1.5px",
            }}
          >
            <p className="font-bold text-zinc-900 mb-2">Billing Summary:</p>

            <div className="flex justify-between mb-1">
              <span className="text-zinc-600">Services:</span>
              <span>₹{Number(order.price).toLocaleString("en-IN")}</span>
            </div>

            {(order.addons as any[]).length > 0 && (
              <div className="flex justify-between mb-1">
                <span className="text-zinc-600">Add-ons:</span>
                <span>
                  ₹{(order.addons as any[]).reduce((s: number, a: any) => s + Number(a.totalCost), 0).toLocaleString("en-IN")}
                </span>
              </div>
            )}

            <div className="border-t border-zinc-200 my-2" />

            <div className="flex justify-between mb-1">
              <span className="text-zinc-600">Subtotal:</span>
              <span>₹{Number(invoice.amount).toLocaleString("en-IN")}</span>
            </div>

            <div className="flex justify-between mb-1">
              <span className="text-zinc-600">Advance Paid:</span>
              <span>₹{Number(invoice.advancePaid).toLocaleString("en-IN")}</span>
            </div>

            <div className="flex justify-between mb-2 font-semibold">
              <span>Balance Amount:</span>
              <span style={{ color: balanceDue > 0 ? "#dc2626" : "#16a34a", fontWeight: "bold" }}>
                ₹{balanceDue.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-between font-bold text-zinc-900 text-base border-t border-zinc-200 pt-2">
              <span>Total Amount:</span>
              <span>₹{Number(invoice.amount).toLocaleString("en-IN")}</span>
            </div>

            <p className="text-right text-zinc-400 text-xs mt-1">
              Payment Mode: {invoice.paymentMode}
            </p>
          </div>
        </div>

        {/* ── TERMS & FOOTER ── */}
        <div className="border-t border-zinc-200 mx-8 pb-8 pt-5 text-center">
          <p className="text-zinc-500 text-xs leading-relaxed max-w-lg mx-auto">
            Terms &amp; Conditions: &quot;No guarantee on color restoration. No warranty on white shoes.
            Pre-existing damages are not covered.&quot;
          </p>
          <p className="text-zinc-700 font-medium mt-3 text-sm">
            Thank you for choosing Mr Boot Shoe Laundry &amp; Repair!
          </p>
          <p className="text-green-600 font-bold mt-1 text-sm">
            Contact: +91 {orgPhone}
          </p>
        </div>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
