"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

interface InvoiceActionsProps {
  waShareUrl: string;
  invoiceNumber: string;
  /** False until the shoe photo has been measured and its frame chosen. */
  ready: boolean;
}

// Must match BILL_WIDTH in receipt-view.tsx.
const BILL_WIDTH = 480;
// 1080px wide = standard phone / WhatsApp width: sharp on every phone, small file.
const EXPORT_WIDTH = 1080;

async function waitForImages(root: HTMLElement, timeoutMs = 8000) {
  const imgs = Array.from(root.querySelectorAll("img"));
  const bgUrls = Array.from(root.querySelectorAll<HTMLElement>("[style*='background-image']"))
    .map((el) => /url\(["']?(.*?)["']?\)/.exec(el.style.backgroundImage)?.[1])
    .filter((u): u is string => !!u);

  const pending = [
    ...imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((res) => {
            img.addEventListener("load", () => res(), { once: true });
            img.addEventListener("error", () => res(), { once: true });
          })
    ),
    ...bgUrls.map(
      (url) =>
        new Promise<void>((res) => {
          const i = new Image();
          i.crossOrigin = "anonymous";
          i.onload = () => res();
          i.onerror = () => res();
          i.src = url;
        })
    ),
  ];
  await Promise.race([Promise.all(pending), new Promise((r) => setTimeout(r, timeoutMs))]);
}

/** Renders the bill at a fixed 480px layout and returns a 1080px-wide JPEG. */
async function renderBill(): Promise<Blob> {
  const el = document.getElementById("invoice-box");
  if (!el) throw new Error("Could not find the bill on the page.");
  await waitForImages(el);
  if (document.fonts?.ready) await document.fonts.ready;

  const html2canvas = (await import("html2canvas")).default;
  const canvas = await html2canvas(el, {
    scale: EXPORT_WIDTH / BILL_WIDTH,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: BILL_WIDTH,
    // Same layout on every phone/laptop: force the copy to exactly 480px wide.
    onclone: (doc) => {
      // html2canvas draws text ~3px lower than the browser does; re-centre the spots where it shows.
      const fix = doc.createElement("style");
      fix.textContent =
        ".bill-stamp{padding-top:0!important;padding-bottom:6px!important}" +
        ".bill-divider{margin-top:10px!important}";
      doc.head.appendChild(fix);
      const box = doc.getElementById("invoice-box");
      if (box) {
        box.style.width = `${BILL_WIDTH}px`;
        box.style.maxWidth = `${BILL_WIDTH}px`;
        box.style.borderRadius = "0";
        box.style.boxShadow = "none";
        box.style.border = "none";
      }
    },
  });

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create the image."))), "image/jpeg", 0.95)
  );
}

export const InvoiceActions: React.FC<InvoiceActionsProps> = ({ invoiceNumber, ready }) => {
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState<"" | "save" | "share">("");
  const autoSaved = useRef(false);
  const fileName = `Mr-Boot-Bill-${invoiceNumber}.jpg`;

  const download = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = fileName;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const saveImage = useCallback(async () => {
    setBusy("save");
    try {
      download(await renderBill());
    } catch (err: any) {
      console.error("Bill export failed:", err);
      alert("Could not save the bill image: " + (err?.message || "please try again"));
    } finally {
      setBusy("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceNumber]);

  // Phones: open the share sheet with the image itself (pick WhatsApp → customer).
  const shareImage = async () => {
    setBusy("share");
    try {
      const blob = await renderBill();
      const file = new File([blob], fileName, { type: "image/jpeg" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Mr. Boot Bill #${invoiceNumber}` });
      } else {
        download(blob);
        alert("Sharing isn't supported in this browser, so the bill was saved instead. Attach it in WhatsApp.");
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.error("Bill share failed:", err);
        alert("Could not share the bill: " + (err?.message || "please try again"));
      }
    } finally {
      setBusy("");
    }
  };

  // Auto-save once when arriving from a new order (?print=1), after the photo frame is ready.
  useEffect(() => {
    if (searchParams.get("print") === "1" && ready && !autoSaved.current) {
      autoSaved.current = true;
      saveImage();
    }
  }, [searchParams, ready, saveImage]);

  const btn = "px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-60";

  return (
    <div className="flex flex-wrap justify-end gap-2 mb-4 print:hidden">
      <button onClick={shareImage} disabled={!!busy || !ready} className={`${btn} bg-[#25D366] text-white hover:opacity-90 shadow-sm`}>
        <span className="material-symbols-outlined text-[16px]">share</span>
        {busy === "share" ? "Preparing..." : "Share Bill"}
      </button>
      <button onClick={saveImage} disabled={!!busy || !ready} className={`${btn} bg-[#361f1a] text-white hover:opacity-90 shadow-sm`}>
        <span className="material-symbols-outlined text-[16px]">download</span>
        {busy === "save" ? "Saving..." : "Save Image"}
      </button>
      <button onClick={() => window.print()} className={`${btn} border border-black/10 hover:bg-black/5 text-[#361f1a]`}>
        <span className="material-symbols-outlined text-[16px]">print</span>
        Print
      </button>
    </div>
  );
};
