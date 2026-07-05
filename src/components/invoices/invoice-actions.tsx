"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

interface InvoiceActionsProps {
  waShareUrl: string;
  invoiceNumber: string;
}

export const InvoiceActions: React.FC<InvoiceActionsProps> = ({ waShareUrl, invoiceNumber }) => {
  const searchParams = useSearchParams();
  const [saving, setSaving] = useState(false);

  const saveAsPng = async () => {
    setSaving(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      // Target the invoice box (second child of body or find by id)
      const invoiceEl = document.getElementById("invoice-box");
      if (!invoiceEl) {
        alert("Could not find invoice element.");
        setSaving(false);
        return;
      }
      const canvas = await html2canvas(invoiceEl, {
        scale: 3,           // 3x for high resolution quality
        useCORS: true,      // allow cross-origin images (Supabase photos)
        backgroundColor: "#ffffff",
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `Mr-Boot-Invoice-${invoiceNumber}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("PNG export failed:", err);
      alert("Could not save as PNG. Try the Print button instead.");
    } finally {
      setSaving(false);
    }
  };

  // Auto-save PNG when redirected from new order creation with ?print=1
  useEffect(() => {
    if (searchParams.get("print") === "1") {
      const timer = setTimeout(() => {
        saveAsPng();
      }, 1200); // wait for images to load
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <>
      {/* Action Buttons Row */}
      <div className="flex flex-wrap justify-end gap-2 mb-6 print:hidden">
        {/* Save as PNG */}
        <button
          onClick={saveAsPng}
          disabled={saving}
          className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 hover:opacity-90 transition-all disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[16px]">download</span>
          {saving ? "Saving..." : "Save as PNG"}
        </button>

        {/* Print fallback */}
        <button
          onClick={() => window.print()}
          className="px-4 py-2 border border-black/10 hover:bg-black/5 text-primary text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">print</span>
          Print
        </button>
      </div>

      {/* WhatsApp Share — below invoice content (rendered by parent) */}
      <div className="flex justify-center sm:justify-start pt-4 border-t border-zinc-100 print:hidden mt-4">
        <a
          href={waShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-6 py-3 rounded-full border border-emerald-500 bg-white text-emerald-600 hover:bg-emerald-50 transition-colors font-bold text-sm shadow-sm"
        >
          <span className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[14px] material-symbols-outlined font-normal">
            chat
          </span>
          Share via WhatsApp
        </a>
      </div>
    </>
  );
};

