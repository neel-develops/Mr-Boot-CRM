"use client";

import React from "react";

interface InvoiceActionsProps {
  waShareUrl: string;
}

export const InvoiceActions: React.FC<InvoiceActionsProps> = ({ waShareUrl }) => {
  return (
    <>
      {/* Print Button */}
      <div className="flex justify-end mb-6 print:hidden">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 border border-black/10 hover:bg-black/5 text-primary text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">print</span>
          Print Invoice
        </button>
      </div>

      {/* WhatsApp Share */}
      <div className="flex justify-center sm:justify-start pt-4 border-t border-black/5 print:hidden">
        <a
          href={waShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#25D366] text-white hover:bg-[#128C7E] transition-colors font-semibold text-xs shadow-sm"
        >
          <span className="material-symbols-outlined text-[16px]">send</span>
          Share via WhatsApp
        </a>
      </div>
    </>
  );
};
