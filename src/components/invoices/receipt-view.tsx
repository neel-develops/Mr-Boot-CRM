"use client";

import React, { useState } from "react";
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
  // State to track the uploaded shoe image aspect ratio dynamically
  const [imageAspect, setImageAspect] = useState<"portrait" | "landscape" | "square">("landscape");

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const ratio = img.naturalWidth / img.naturalHeight;
    if (ratio > 1.15) {
      setImageAspect("landscape");
    } else if (ratio < 0.85) {
      setImageAspect("portrait");
    } else {
      setImageAspect("square");
    }
  };

  const count = allServices.length;

  // Space budget calculations based on number of items to fit 2160x2368 ratio perfectly
  let heroHeightClass = "h-36";
  let customerPaddingClass = "p-4";
  let customerTextClass = "text-base";
  let tableRowPadding = "py-2";
  let itemTitleClass = "text-sm";
  let itemDescClass = "text-xs";
  let totalsSpacingClass = "mb-1";
  let totalTextClass = "text-lg";
  let footerPaddingClass = "pt-4 pb-6";
  let iconSizeClass = "text-[18px]";
  let headerPaddingClass = "px-6 pt-6 pb-4";
  let serviceHeaderClass = "text-[9px] mb-2";

  if (count >= 3 && count <= 5) {
    heroHeightClass = "h-24";
    customerPaddingClass = "p-3";
    customerTextClass = "text-sm";
    tableRowPadding = "py-1.5";
    itemTitleClass = "text-xs";
    itemDescClass = "text-[10px]";
    totalsSpacingClass = "mb-0.5";
    totalTextClass = "text-base";
    footerPaddingClass = "pt-2 pb-4";
    headerPaddingClass = "px-6 pt-4 pb-3";
    serviceHeaderClass = "text-[8px] mb-1.5";
  } else if (count > 5) {
    heroHeightClass = "h-14"; // Highly compact image container for 6-10 items
    customerPaddingClass = "p-2";
    customerTextClass = "text-xs";
    tableRowPadding = "py-0.5";
    itemTitleClass = "text-[11px]";
    itemDescClass = "text-[9px]";
    totalsSpacingClass = "mb-0";
    totalTextClass = "text-sm";
    footerPaddingClass = "pt-1 pb-2";
    iconSizeClass = "text-[14px]";
    headerPaddingClass = "px-5 pt-3 pb-2";
    serviceHeaderClass = "text-[8px] mb-1";
  }

  // Determine dynamic height based on aspect ratio
  const getImageContainerClass = () => {
    if (count > 5) return "h-14 w-full"; // keep it small if there are many items
    switch (imageAspect) {
      case "portrait":
        return "h-44 w-full";
      case "square":
        return "h-36 w-full";
      case "landscape":
      default:
        return "h-28 w-full";
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-6 print:gap-0">
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
                width: 100% !important;
                max-width: 100% !important;
                aspect-ratio: 2160/2368 !important;
              }
            }
          `,
        }}
      />

      {/* Action buttons (hidden in print) */}
      <div className="w-full max-w-[430px] md:max-w-[480px] mb-2 print:hidden">
        <InvoiceActions waShareUrl={waShareUrl} invoiceNumber={invoice.invoiceNumber} />
      </div>

      {/* Render Single Bill Card with strict 2160x2368 aspect ratio */}
      <div className="w-full flex flex-col items-center">
        <div
          id="invoice-box"
          className="invoice-page w-full max-w-[430px] md:max-w-[480px] bg-white shadow-xl rounded-3xl border border-zinc-100 flex flex-col justify-between overflow-hidden relative print:shadow-none print:border-none print:rounded-none"
          style={{
            aspectRatio: "2160/2368", // Strict target ratio, prevents any cutting or overflow
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {/* Header brown line */}
          <div className="w-full h-1.5 bg-[#361f1a] flex-shrink-0"></div>

          {/* Page Content */}
          <div className="flex-1 flex flex-col justify-start overflow-hidden">
            {/* ── HEADER ── */}
            <div className={`flex justify-between items-start ${headerPaddingClass}`}>
              <div className="flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="Mr. Boot Logo"
                  crossOrigin="anonymous"
                  className="w-10 h-10 rounded-full border border-zinc-200 flex-shrink-0 object-cover"
                />
                <div>
                  <h1 className="text-base font-black text-[#361f1a] leading-none">Mr. Boot</h1>
                  <p className="text-[8px] font-bold text-[#b38e5d] tracking-widest uppercase mt-0.5">
                    Premium Care
                  </p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-black tracking-wide text-zinc-950 leading-none">RECEIPT</h2>
                <p className="text-[10px] text-zinc-800 font-medium mt-1">
                  Order: <span className="font-bold">#{invoice.invoiceNumber}</span>
                </p>
                <p className="text-[8px] text-zinc-500 mt-0.5">{formattedOrderDate}</p>
              </div>
            </div>

            {/* ── HERO IMAGE ── */}
            {mainPhotoUrl && (
              <div className="px-5 mb-2">
                <div className={`bg-zinc-100/85 rounded-xl flex items-center justify-center p-2 w-full overflow-hidden transition-all duration-300 ${getImageContainerClass()}`}>
                  <img
                    src={mainPhotoUrl}
                    alt="Hero Shoe Image"
                    crossOrigin="anonymous"
                    onLoad={handleImageLoad}
                    className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
                  />
                </div>
              </div>
            )}

            {/* ── CUSTOMER CARD ── */}
            <div className="px-5 mb-2">
              <div className={`bg-zinc-100/70 border border-zinc-100/80 rounded-xl ${customerPaddingClass}`}>
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Billed To
                </span>
                <h3 className={`${customerTextClass} font-bold text-zinc-800 mt-0.5 leading-none`}>
                  {order.customer.firstName} {order.customer.lastName}
                </h3>
                <p className="text-[10px] text-zinc-500 mt-0.5 leading-none">{order.customer.phone}</p>
              </div>
            </div>

            {/* ── SERVICE DESCRIPTION TABLE ── */}
            <div className="px-5 mb-2 flex-1 flex flex-col justify-start overflow-hidden">
              <div className={`flex justify-between items-center font-bold text-zinc-400 uppercase tracking-wider ${serviceHeaderClass}`}>
                <span>Service Description</span>
                <span>Amount</span>
              </div>
              <div className="border-t border-dashed border-zinc-200 mb-1.5"></div>
              <div className="space-y-1.5 overflow-y-auto pr-1">
                {allServices.map((item, idx) => (
                  <div key={idx} className={`border-b border-dashed border-zinc-100 last:border-b-0 ${tableRowPadding}`}>
                    <div className="flex justify-between items-start gap-4">
                      <h4 className={`${itemTitleClass} font-bold text-zinc-800 leading-tight`}>{item.title}</h4>
                      <span className={`${itemTitleClass} font-bold text-zinc-800`}>
                        ₹{item.price.toFixed(2)}
                      </span>
                    </div>
                    {item.services && item.services.length > 0 && (
                      <p className={`${itemDescClass} text-zinc-500 mt-0.5 leading-none font-medium`}>
                        {item.services.join(", ")}
                      </p>
                    )}
                    {item.description && (
                      <p className={`${itemDescClass} text-zinc-400 mt-0.5 leading-none`}>
                        {item.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Sticky Layout */}
          <div className="flex-shrink-0 flex flex-col justify-end bg-white">
            {/* ── BILLING SUMMARY & QR ── */}
            <div className="px-5 mb-2 relative z-0">
              <div className="flex justify-between items-end gap-4 relative pb-2">
                {/* Distressed Authentic PAID Stamp overlapping */}
                {paymentStatus === "Paid" && (
                  <div 
                    className="absolute left-[135px] bottom-[22px] rotate-[-15deg] border-[3px] border-double border-emerald-600 rounded px-2.5 py-0.5 font-black text-emerald-600 tracking-widest text-[12px] uppercase z-10 pointer-events-none bg-white/95 shadow-md"
                    style={{
                      boxShadow: "0 0 0 3px rgba(16, 185, 129, 0.15)",
                    }}
                  >
                    PAID
                  </div>
                )}

                {/* Left: QR Code info */}
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-[56px] h-[56px] bg-white border border-zinc-200 rounded-lg p-1 flex items-center justify-center flex-shrink-0 shadow-sm">
                    {qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt="Tracking QR Code"
                        crossOrigin="anonymous"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-100 rounded flex items-center justify-center text-[8px] text-zinc-400 text-center font-bold">
                        QR
                      </div>
                    )}
                  </div>
                  <div>
                    <h5 className="text-[9px] font-bold text-zinc-800 leading-tight">
                      Track Order Status
                    </h5>
                    <p className="text-[7px] text-zinc-400 leading-tight mt-0.5 max-w-[95px]">
                      Scan to view restoration progress
                    </p>
                  </div>
                </div>

                {/* Right: Totals */}
                <div className="w-[140px] text-right">
                  <div className={`flex justify-between items-center text-[10px] text-zinc-500 ${totalsSpacingClass}`}>
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  {Number(invoice.advancePaid) > 0 && (
                    <div className={`flex justify-between items-center text-[10px] text-zinc-500 ${totalsSpacingClass}`}>
                      <span>Advance</span>
                      <span>₹{Number(invoice.advancePaid).toFixed(2)}</span>
                    </div>
                  )}
                  {balanceDue > 0 && (
                    <div className={`flex justify-between items-center text-[10px] text-zinc-500 ${totalsSpacingClass}`}>
                      <span>Balance</span>
                      <span className="text-red-500 font-bold">₹{balanceDue.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-zinc-200 my-1"></div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px] font-bold text-zinc-800">Total</span>
                    <span className={`${totalTextClass} font-black text-zinc-950`}>₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── FOOTER ── */}
            <div className={`border-t border-zinc-100 mx-5 ${footerPaddingClass} flex flex-col items-center`}>
              <span className={`material-symbols-outlined ${iconSizeClass} text-[#b38e5d] mb-0.5 font-normal`}>
                construction
              </span>
              <p className="text-[8px] text-zinc-400 text-center italic max-w-[260px] leading-tight">
                &quot;True craftsmanship takes time. Thank you for trusting Mr. Boot with your prized
                footwear. Wear them in good health.&quot;
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Button moved OUTSIDE of the bill card so it is not printed or captured in PNG */}
      <div className="w-full max-w-[430px] flex justify-center mt-2 pb-8 print:hidden">
        <a
          href={waShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 border border-emerald-500 text-emerald-600 bg-white hover:bg-emerald-50 font-bold text-xs py-2.5 px-6 rounded-full shadow-md transition-all active:scale-95"
        >
          <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] material-symbols-outlined font-normal">
            chat
          </span>
          Share via WhatsApp
        </a>
      </div>
    </div>
  );
};
