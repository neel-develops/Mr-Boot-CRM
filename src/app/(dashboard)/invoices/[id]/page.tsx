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

  // Both guards must succeed before we reference anything
  if (!order || order.invoices.length === 0) {
    notFound();
    // Unreachable but satisfies TS narrowing
    return null;
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
  const mainPhotoUrl = order.items.find((item) => item.photoUrl)?.photoUrl ?? null;

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

  // Addons typed properly
  const addons = order.addons as Array<{
    id: string;
    itemName: string;
    qty: number;
    unitCost: number | string;
    totalCost: number | string;
  }>;

  return (
    <div className="w-full min-h-screen bg-gray-100 flex flex-col items-center justify-start py-8 px-4">
      {/* Action buttons */}
      <div className="w-full max-w-[900px] mb-4">
        <Suspense fallback={null}>
          <InvoiceActions waShareUrl={waShareUrl} invoiceNumber={invoice.invoiceNumber} />
        </Suspense>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          Invoice Box — matches the user's screenshot design exactly
          Max-width 900px, white, clean, A4-style bill
      ═══════════════════════════════════════════════════════════ */}
      <div
        id="invoice-box"
        className="w-full bg-white shadow-md text-zinc-900"
        style={{ maxWidth: "900px", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "14px" }}
      >

        {/* ── HEADER ── */}
        <div className="flex justify-between items-start px-8 pt-8 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 leading-tight">
              Mr Boot Shoe Laundry &amp; Repair
            </h1>
            <p className="text-zinc-500 mt-1 text-sm">Service Invoice</p>
            <p className="font-bold mt-2 text-sm">Order number: #{invoice.invoiceNumber}</p>
          </div>
          <img
            src="/logo.png"
            alt="Mr. Boot Logo"
            crossOrigin="anonymous"
            className="w-16 h-16 rounded-full object-cover border border-zinc-200 flex-shrink-0"
          />
        </div>

        {/* ── 3-COLUMN INFO BAR ── */}
        <div className="mx-8 mb-5 grid grid-cols-3 border border-zinc-200 text-center text-sm">
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

        {/* ── ITEM PHOTO (only shown if a photo was uploaded) ── */}
        {mainPhotoUrl && (
          <div className="mx-8 mb-5 flex items-center justify-center bg-zinc-50 border border-zinc-200 py-4 px-6">
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
            style={{ gridTemplateColumns: "1fr 90px 90px 110px" }}
          >
            <span>Item / Service Description</span>
            <span className="text-center">Rate</span>
            <span className="text-center">Quantity</span>
            <span className="text-right">Amount</span>
          </div>

          {/* Order Items — use each item's own price field */}
          {order.items.map((item) => {
            const itemPrice = Number(item.price ?? 0);
            return (
              <div key={item.id} className="py-3 border-b border-zinc-100">
                <div
                  className="grid items-start"
                  style={{ gridTemplateColumns: "1fr 90px 90px 110px" }}
                >
                  <div>
                    <p className="font-bold text-zinc-900 text-sm">
                      {item.brand
                        ? `${item.brand} ${item.model || item.category}`
                        : item.model || item.category}
                    </p>
                    {item.services.length > 0 && (
                      <p className="text-zinc-500 text-xs italic mt-0.5">
                        {item.services.join(", ")}
                      </p>
                    )}
                    {item.description && (
                      <p className="text-zinc-400 text-xs mt-0.5">{item.description}</p>
                    )}
                  </div>
                  <span className="text-center text-sm">
                    ₹{itemPrice.toLocaleString("en-IN")}
                  </span>
                  <span className="text-center text-sm">1</span>
                  <span className="text-right font-bold text-sm">
                    ₹{itemPrice.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Add-on items */}
          {addons.map((addon) => (
            <div key={addon.id} className="py-3 border-b border-zinc-100">
              <div
                className="grid items-start"
                style={{ gridTemplateColumns: "1fr 90px 90px 110px" }}
              >
                <div>
                  <p className="font-bold text-zinc-900 text-sm">{addon.itemName}</p>
                  <p className="text-zinc-400 text-xs italic">Add-on</p>
                </div>
                <span className="text-center text-sm">
                  ₹{Number(addon.unitCost).toLocaleString("en-IN")}
                </span>
                <span className="text-center text-sm">{addon.qty}</span>
                <span className="text-right font-bold text-sm">
                  ₹{Number(addon.totalCost).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ── BILLING SUMMARY BOX — bottom-right, red border (matches screenshot) ── */}
        <div className="mx-8 mb-6 flex justify-end">
          <div
            className="p-4 text-sm"
            style={{
              width: "280px",
              border: "1.5px solid #dc2626",
              borderRadius: "4px",
            }}
          >
            <p className="font-bold text-zinc-900 mb-3">Billing Summary:</p>

            <div className="flex justify-between mb-1.5">
              <span className="text-zinc-600">Services:</span>
              <span>₹{Number(order.price).toLocaleString("en-IN")}</span>
            </div>

            {addons.length > 0 && (
              <div className="flex justify-between mb-1.5">
                <span className="text-zinc-600">Add-ons:</span>
                <span>
                  ₹{addons
                    .reduce((sum, a) => sum + Number(a.totalCost), 0)
                    .toLocaleString("en-IN")}
                </span>
              </div>
            )}

            <div className="border-t border-zinc-200 my-2" />

            <div className="flex justify-between mb-1.5">
              <span className="text-zinc-600">Subtotal:</span>
              <span>₹{Number(invoice.amount).toLocaleString("en-IN")}</span>
            </div>

            <div className="flex justify-between mb-1.5">
              <span className="text-zinc-600">Advance Paid:</span>
              <span>₹{Number(invoice.advancePaid).toLocaleString("en-IN")}</span>
            </div>

            <div className="flex justify-between mb-2 font-semibold">
              <span className="text-zinc-700">Balance Amount:</span>
              <span style={{ color: balanceDue > 0 ? "#dc2626" : "#16a34a", fontWeight: "bold" }}>
                ₹{balanceDue.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-between font-bold text-zinc-900 text-base border-t border-zinc-200 pt-2">
              <span>Total Amount:</span>
              <span>₹{Number(invoice.amount).toLocaleString("en-IN")}</span>
            </div>

            <p className="text-right text-zinc-400 text-xs mt-1.5">
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
          <p className="font-bold mt-1 text-sm" style={{ color: "#16a34a" }}>
            Contact: +91 {orgPhone}
          </p>
        </div>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
