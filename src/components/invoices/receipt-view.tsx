"use client";

import React, { useEffect, useState } from "react";
import { InvoiceActions } from "./invoice-actions";

interface ReceiptViewProps {
  order: any;
  invoice: any;
  trackingUrl: string;
  waShareUrl: string;
  mainPhotoUrl: string | null;
  formattedOrderDate: string;
  paymentStatus: string;
  balanceDue: number;
  subtotal: number;
  total: number;
  qrCodeDataUrl: string;
  allServices: any[];
}

// The bill is always laid out at this width and exported at 1080px (2.25×):
// the standard phone / WhatsApp width, so the image is sharp and never oversized.
export const BILL_WIDTH = 480;

type PhotoShape = "landscape" | "portrait" | "square";

/** Pick the frame for the shoe photo: wide → 16:9, tall → 9:16, roughly square → 1:1. */
function shapeFor(width: number, height: number): PhotoShape {
  const ratio = width / height;
  if (ratio >= 1.15) return "landscape";
  if (ratio <= 0.87) return "portrait";
  return "square";
}

const money = (n: number) =>
  `${n < 0 ? "−" : ""}₹${Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const ReceiptView: React.FC<ReceiptViewProps> = ({
  order,
  invoice,
  waShareUrl,
  mainPhotoUrl,
  formattedOrderDate,
  paymentStatus,
  balanceDue,
  subtotal,
  total,
  qrCodeDataUrl,
  allServices,
}) => {
  // null = still measuring the photo; the export waits for this.
  const [shape, setShape] = useState<PhotoShape | null>(mainPhotoUrl ? null : "landscape");
  const [photoFailed, setPhotoFailed] = useState(false);
  const [photoRatio, setPhotoRatio] = useState(16 / 9); // width / height of the actual photo

  useEffect(() => {
    if (!mainPhotoUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setPhotoRatio(img.naturalWidth / img.naturalHeight);
      setShape(shapeFor(img.naturalWidth, img.naturalHeight));
    };
    img.onerror = () => {
      setPhotoFailed(true);
      setShape("landscape");
    };
    img.src = mainPhotoUrl;
  }, [mainPhotoUrl]);

  const showPhoto = !!mainPhotoUrl && !photoFailed;
  const sideBySide = showPhoto && (shape === "portrait" || shape === "square");
  const advancePaid = Number(invoice.advancePaid);

  // Fit the photo inside the frame ourselves (like object-fit: contain) and draw it as a real
  // <img>: the export then uses the full-resolution photo. A CSS background was re-sampled at
  // low resolution by the exporter, which made the shoes blurry.
  const frameRatio = shape === "portrait" ? 9 / 16 : shape === "square" ? 1 : 16 / 9;
  const fitW = photoRatio >= frameRatio ? 100 : (photoRatio / frameRatio) * 100;
  const fitH = photoRatio >= frameRatio ? (frameRatio / photoRatio) * 100 : 100;
  const photo = showPhoto ? (
    <div
      className={`relative rounded-2xl bg-zinc-100 border border-zinc-100 overflow-hidden ${
        shape === "portrait" ? "aspect-[9/16]" : shape === "square" ? "aspect-square" : "aspect-[16/9]"
      } w-full`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mainPhotoUrl!}
        alt="Shoe photo"
        crossOrigin="anonymous"
        className="absolute rounded-2xl"
        style={{
          width: `${fitW}%`,
          height: `${fitH}%`,
          left: `${(100 - fitW) / 2}%`,
          top: `${(100 - fitH) / 2}%`,
        }}
      />
    </div>
  ) : null;

  const customerCard = (
    <div className="bg-zinc-100/70 border border-zinc-100/80 rounded-2xl p-4">
      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Billed To</span>
      <h3 className="text-base font-bold text-zinc-800 mt-1 leading-tight break-words">
        {order.customer.firstName} {order.customer.lastName}
      </h3>
      <p className="text-xs text-zinc-500 mt-1 leading-none">{order.customer.phone}</p>
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center gap-6 print:gap-0">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body { background-color: #ffffff !important; padding: 0 !important; margin: 0 !important; }
              .invoice-page { box-shadow: none !important; border: none !important; border-radius: 0 !important; margin: 0 auto !important; }
            }
          `,
        }}
      />

      {/* Action buttons (hidden in print) */}
      <div className="w-full mb-2 print:hidden" style={{ maxWidth: BILL_WIDTH }}>
        <InvoiceActions waShareUrl={waShareUrl} invoiceNumber={invoice.invoiceNumber} ready={shape !== null} />
      </div>

      {/* The bill. Same layout on every device; height grows with the number of items. */}
      <div className="w-full flex flex-col items-center">
        <div
          id="invoice-box"
          className="invoice-page w-full bg-white shadow-xl rounded-3xl border border-zinc-100 flex flex-col relative overflow-hidden print:shadow-none print:border-none print:rounded-none"
          style={{ maxWidth: BILL_WIDTH, fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}
        >
          {/* Header brown line */}
          <div className="w-full h-1.5 bg-[#361f1a] flex-shrink-0"></div>

          {/* ── HEADER ── */}
          <div className="flex justify-between items-start px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Mr. Boot Logo"
                crossOrigin="anonymous"
                className="w-12 h-12 rounded-full border border-zinc-200 flex-shrink-0"
              />
              <div>
                <h1 className="text-lg font-black text-[#361f1a] leading-none">Mr. Boot</h1>
                <p className="text-[10px] font-bold text-[#b38e5d] tracking-widest uppercase mt-1">Premium Care</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-black tracking-wide text-zinc-950 leading-none">RECEIPT</h2>
              <p className="text-[11px] text-zinc-800 font-medium mt-1.5">
                Bill: <span className="font-bold">#{invoice.invoiceNumber}</span>
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{formattedOrderDate}</p>
            </div>
          </div>

          {/* ── PHOTO + CUSTOMER ── */}
          {sideBySide ? (
            // Tall (9:16) or square photo: photo on the left, details on the right.
            <div className="px-6 mb-4 flex gap-4 items-start">
              <div className={shape === "portrait" ? "w-[44%] flex-shrink-0" : "w-[48%] flex-shrink-0"}>{photo}</div>
              <div className="flex-1 min-w-0 flex flex-col gap-3">
                {customerCard}
                <div className="rounded-2xl border border-zinc-100 p-4">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Amount</span>
                  <p className="text-lg font-black text-zinc-950 mt-1 leading-none">{money(total)}</p>
                  <p className={`text-[11px] font-bold mt-1.5 ${balanceDue > 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {balanceDue > 0 ? `Balance ${money(balanceDue)}` : "Fully paid"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // Wide (16:9) photo or no photo: full-width photo, details below.
            <>
              {photo && <div className="px-6 mb-4">{photo}</div>}
              <div className="px-6 mb-4">{customerCard}</div>
            </>
          )}

          {/* ── SERVICE DESCRIPTION TABLE ── */}
          <div className="px-6 mb-5">
            <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
              <span>Service Description</span>
              <span>Amount</span>
            </div>
            <div className="border-t border-dashed border-zinc-200 mb-2"></div>
            <div>
              {allServices.map((item, idx) => (
                <div key={idx} className="border-b border-dashed border-zinc-100 last:border-b-0 py-2.5">
                  <div className="flex justify-between items-start gap-4">
                    <h4 className="text-sm font-bold text-zinc-800 leading-snug break-words min-w-0">{item.title}</h4>
                    <span className="text-sm font-bold text-zinc-800 whitespace-nowrap">{money(item.price)}</span>
                  </div>
                  {item.services && item.services.length > 0 && (
                    <p className="text-[11px] text-zinc-500 mt-1 leading-snug font-medium">{item.services.join(", ")}</p>
                  )}
                  {item.description && (
                    <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">{item.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── BILLING SUMMARY & QR ── */}
          <div className="px-6 mb-4">
            <div className="flex justify-between items-end gap-4 border-t border-zinc-200 pt-4">
              {/* Left: payment stamp + QR (stamp sits in its own space, never over the amounts) */}
              <div className="flex flex-col items-start gap-3 flex-1 min-w-0">
                {paymentStatus === "Paid" ? (
                  <div className="bill-stamp ml-1 rotate-[-8deg] border-[3px] border-double border-emerald-600 rounded px-3 py-0.5 font-black text-emerald-600 tracking-widest text-[13px] uppercase">
                    PAID
                  </div>
                ) : advancePaid > 0 && balanceDue > 0 ? (
                  <div className="bill-stamp ml-1 rotate-[-8deg] border-[3px] border-double border-red-600 rounded px-2 py-0.5 font-black text-red-600 tracking-wide text-[11px] uppercase whitespace-nowrap">
                    ADVANCE PAID
                  </div>
                ) : null}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-[64px] h-[64px] bg-white border border-zinc-200 rounded-xl p-1 flex items-center justify-center flex-shrink-0">
                    {qrCodeDataUrl ? (
                      <img src={qrCodeDataUrl} alt="Tracking QR Code" crossOrigin="anonymous" className="w-full h-full" />
                    ) : (
                      <div className="w-full h-full bg-zinc-100 rounded flex items-center justify-center text-[10px] text-zinc-400 font-bold">QR</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-[10px] font-bold text-zinc-800 leading-tight">Track Order</h5>
                    <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">Scan to see progress</p>
                  </div>
                </div>
              </div>

              {/* Right: totals */}
              <div className="w-[170px] flex-shrink-0 text-right">
                <div className="flex justify-between items-center text-xs text-zinc-500 mb-1">
                  <span>Subtotal</span>
                  <span>{money(subtotal)}</span>
                </div>
                {advancePaid > 0 && (
                  <div className="flex justify-between items-center text-xs text-zinc-500 mb-1">
                    <span>Paid</span>
                    <span>{money(advancePaid)}</span>
                  </div>
                )}
                {balanceDue > 0 && (
                  <div className="flex justify-between items-center text-xs text-zinc-500 mb-1">
                    <span>Balance</span>
                    <span className="text-red-600 font-bold">{money(balanceDue)}</span>
                  </div>
                )}
                <div className="bill-divider border-t border-zinc-200 my-1.5"></div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-zinc-800">Total</span>
                  <span className="text-lg font-black text-zinc-950">{money(total)}</span>
                </div>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-1">
                  {advancePaid > 0 ? `Paid via ${invoice.paymentMode}` : "Payment pending"}
                </p>
              </div>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div className="border-t border-zinc-100 mx-6 pt-3 pb-5 flex flex-col items-center">
            <p className="text-[10px] text-zinc-400 text-center italic max-w-[300px] leading-relaxed">
              &quot;True craftsmanship takes time. Thank you for trusting Mr. Boot with your prized footwear.&quot;
            </p>
          </div>
        </div>
      </div>

      {/* WhatsApp text link (outside the bill, so it's not in the image) */}
      <div className="w-full flex justify-center mt-2 pb-8 print:hidden" style={{ maxWidth: BILL_WIDTH }}>
        <a
          href={waShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 border border-emerald-500 text-emerald-600 bg-white hover:bg-emerald-50 font-bold text-xs py-2.5 px-6 rounded-full shadow-md transition-all active:scale-95"
        >
          Send tracking link on WhatsApp
        </a>
      </div>
    </div>
  );
};
