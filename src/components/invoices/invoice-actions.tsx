"use client";

import React, { useEffect, useState } from "react";
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
      const pages = document.querySelectorAll(".invoice-page");
      
      if (pages.length === 0) {
        alert("Could not find invoice elements.");
        setSaving(false);
        return;
      }

      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i] as HTMLElement;
        
        // Calculate the scale to generate exactly 2480px width for high resolution
        const targetWidth = 2480;
        const currentWidth = pageEl.offsetWidth || 430;
        const customScale = targetWidth / currentWidth;

        const canvas = await html2canvas(pageEl, {
          scale: customScale,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          allowTaint: true,
          windowWidth: currentWidth,
        });

        const link = document.createElement("a");
        link.download = `Mr-Boot-Invoice-${invoiceNumber}-Page-${i + 1}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      }
    } catch (err) {
      console.error("PNG export failed:", err);
      alert("Could not save as PNG. Try printing or using another browser.");
    } finally {
      setSaving(false);
    }
  };

  // Auto-save PNG when redirected from new order creation with ?print=1
  useEffect(() => {
    if (searchParams.get("print") === "1") {
      const timer = setTimeout(() => {
        saveAsPng();
      }, 1500); // wait for images to load completely
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
          className="px-4 py-2 bg-[#361f1a] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 hover:opacity-90 transition-all disabled:opacity-60 shadow-sm"
        >
          <span className="material-symbols-outlined text-[16px]">download</span>
          {saving ? "Saving High-Res PNG..." : "Save as PNG"}
        </button>

        {/* Print fallback */}
        <button
          onClick={() => window.print()}
          className="px-4 py-2 border border-black/10 hover:bg-black/5 text-[#361f1a] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">print</span>
          Print
        </button>
      </div>
    </>
  );
};
