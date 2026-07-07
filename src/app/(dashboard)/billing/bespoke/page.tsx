"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createOrder } from "@/app/actions/orders";
import { uploadImage } from "@/lib/upload";

function BespokeBillingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Prepopulate from searchParams
  const [customerName, setCustomerName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [modelCode, setModelCode] = useState("");
  const [shoeSize, setShoeSize] = useState("8");

  useEffect(() => {
    if (searchParams) {
      setCustomerName(searchParams.get("name") || "");
      setContactNumber(searchParams.get("phone") || "");
      setModelCode(searchParams.get("shoeName") || "The Heritage Oxford - E01");
      const sz = searchParams.get("shoeSize") || "8";
      setShoeSize(sz.replace(/[^0-9]/g, "") || "8");
    }
  }, [searchParams]);

  // Specifications
  const [shoeType, setShoeType] = useState("Formal (Standard)");
  const [selectedLeather, setSelectedLeather] = useState("Standard Leather");
  const [customLeather, setCustomLeather] = useState("");

  // Logistics
  const [targetDate, setTargetDate] = useState("");
  const [baseQuotation, setBaseQuotation] = useState(25000);
  const [artisanNotes, setArtisanNotes] = useState("");

  // Upload Reference Sketches
  const [refFile, setRefFile] = useState<File | null>(null);
  const [refUrl, setRefUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Financial calculations
  const workshopFee = 0;
  const subtotal = Number(baseQuotation);
  const totalPayable = subtotal;

  const [paymentMode, setPaymentMode] = useState("UPI");
  const [advancePaid, setAdvancePaid] = useState(12500);

  useEffect(() => {
    setAdvancePaid(Math.round(totalPayable * 0.5));
  }, [totalPayable]);

  const leathers = [
    {
      name: "Brown Calf",
      img: "https://images.unsplash.com/photo-1590534244457-36e65a0b77b1?w=100&auto=format&fit=crop&q=60",
    },
    {
      name: "Black Cordovan",
      img: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=100&auto=format&fit=crop&q=60",
    },
    {
      name: "Tan Suede",
      img: "https://images.unsplash.com/photo-1512374382149-433853003064?w=100&auto=format&fit=crop&q=60",
    },
  ];

  const handleRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRefFile(file);
    setUploading(true);
    try {
      const url = await uploadImage(file, "before-images");
      setRefUrl(url);
    } catch {
      setRefUrl(URL.createObjectURL(file));
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!customerName || !contactNumber) {
      alert("Please fill in Customer Name and Contact Number.");
      return;
    }

    setIsSubmitting(true);

    const nameParts = customerName.trim().split(/\s+/);
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.slice(1).join(" ") || " ";

    const payload = {
      customer: {
        firstName,
        lastName,
        phone: contactNumber,
      },
      order: {
        serviceType: `Bespoke Custom (${shoeType})`,
        itemType: modelCode || `Bespoke ${selectedLeather}`,
        price: totalPayable,
        dueDate: targetDate ? new Date(targetDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
        notes: `Leather: ${selectedLeather}${customLeather ? ` (${customLeather})` : ""}. Size: UK ${shoeSize}. Notes: ${artisanNotes}`,
      },
      items: [
        {
          category: "Formal Shoe",
          brand: "Mr. Boot Bespoke",
          model: modelCode,
          description: `Custom Handmade Shoe. Type: ${shoeType}, Size: UK ${shoeSize}, Leather: ${selectedLeather}. ${artisanNotes}`,
          services: ["Bespoke Last Creation", "Upper Stitching", "Welt Stitching"],
          price: totalPayable,
          photoUrl: refUrl || leathers.find((l) => l.name === selectedLeather)?.img,
        },
      ],
      payment: {
        advancePaid: Number(advancePaid),
        paymentMode: paymentMode,
      },
    };

    try {
      const res = await createOrder(payload);
      if (res.success) {
        router.push(`/invoices/${res.orderId}?print=1`);
      } else {
        alert("Failed to confirm bespoke commission: " + res.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWhatsAppLink = () => {
    const trackingUrl = `https://mr-boot-crm.vercel.app/billing`;
    const message = `Hi ${customerName}, here is the estimate details for your Mr. Boot Bespoke Commission Order of ${modelCode} (${shoeType}). Size UK ${shoeSize}. Leather: ${selectedLeather}. Total Amount: ₹${totalPayable.toLocaleString("en-IN")}.00.`;
    return `https://wa.me/${contactNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-6 px-4">
      {/* Breadcrumbs */}
      <div className="text-xs text-on-surface-variant/70 mb-2">
        Orders &gt; <span className="font-semibold text-primary">New Custom Order</span>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#361f1a]">Bespoke Commission</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Specification Form */}
        <div className="lg:col-span-8 space-y-6">
          {/* Customer Identity */}
          <section className="bg-white/60  backdrop-blur-xl border border-white/20  rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-black/5 pb-4">
              <span className="material-symbols-outlined text-primary p-2 bg-primary/10 rounded-lg">
                assignment_ind
              </span>
              <h2 className="text-lg font-bold text-[#361f1a]">Customer Identity</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Search or add new..."
                  className="w-full bg-white/50 border border-black/5 rounded-xl py-3 px-4 font-body-md text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Contact Number</label>
                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="+91 00000 00000"
                  className="w-full bg-white/50 border border-black/5 rounded-xl py-3 px-4 font-body-md text-sm focus:outline-none"
                />
              </div>
            </div>
          </section>

          {/* Bespoke Specifications */}
          <section className="bg-white/60  backdrop-blur-xl border border-white/20  rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-black/5 pb-4">
              <span className="material-symbols-outlined text-primary p-2 bg-primary/10 rounded-lg">
                design_services
              </span>
              <h2 className="text-lg font-bold text-[#361f1a]">Bespoke Specifications</h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Shoe Name / Model Code</label>
              <input
                type="text"
                value={modelCode}
                onChange={(e) => setModelCode(e.target.value)}
                placeholder="e.g. The Heritage Oxford - E01"
                className="w-full bg-white/50 border border-black/5 rounded-xl py-3 px-4 font-body-md text-sm focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Shoe Type</label>
                <select
                  value={shoeType}
                  onChange={(e) => setShoeType(e.target.value)}
                  className="w-full bg-white/50 border border-black/5 rounded-xl py-3 px-4 text-sm focus:outline-none"
                >
                  <option value="Formal (Standard)">Formal (Standard)</option>
                  <option value="Brogues">Brogues</option>
                  <option value="Chelsea Boots">Chelsea Boots</option>
                  <option value="Monk Straps">Monk Straps</option>
                  <option value="Loafers">Loafers</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Shoe Size (UK)</label>
                <select
                  value={shoeSize}
                  onChange={(e) => setShoeSize(e.target.value)}
                  className="w-full bg-white/50 border border-black/5 rounded-xl py-3 px-4 text-sm focus:outline-none"
                >
                  {["5", "6", "7", "8", "9", "10", "11", "12"].map((sz) => (
                    <option key={sz} value={sz}>
                      UK {sz}
                    </option>
                  ))}
                </select>
              </div>
            </div>

          </section>

          {/* Workshop Logistics */}
          <section className="bg-white/60  backdrop-blur-xl border border-white/20  rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-black/5 pb-4">
              <span className="material-symbols-outlined text-primary p-2 bg-primary/10 rounded-lg">
                precision_manufacturing
              </span>
              <h2 className="text-lg font-bold text-[#361f1a]">Workshop Logistics</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Target Delivery Date</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full bg-white/50 border border-black/5 rounded-xl py-3 px-4 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Base Quotation (₹)</label>
                <input
                  type="number"
                  value={baseQuotation}
                  onChange={(e) => setBaseQuotation(Number(e.target.value))}
                  className="w-full bg-white/50 border border-black/5 rounded-xl py-3 px-4 font-bold text-zinc-800 text-sm focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-zinc-500 uppercase">
                  Artisan Notes / Special Instructions
                </label>
                <span className="text-[10px] text-zinc-400 font-bold">{artisanNotes.length}/300</span>
              </div>
              <textarea
                value={artisanNotes}
                maxLength={300}
                onChange={(e) => setArtisanNotes(e.target.value)}
                placeholder="Specify welt type, heel height, monogramming details..."
                className="w-full bg-white/50 border border-black/5 rounded-xl py-3 px-4 font-body-md text-sm focus:outline-none h-28"
              />
            </div>

            {/* Sketches */}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-3">Design Sketches & Reference Assets</label>
              <label className="relative w-full h-40 border-2 border-dashed border-black/10 rounded-2xl bg-white/20 hover:bg-white/40 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer overflow-hidden">
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleRefUpload}
                />
                {refUrl ? (
                  <img src={refUrl} alt="Sketches" className="w-full h-full object-cover absolute inset-0" />
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400">
                      <span className="material-symbols-outlined">cloud_upload</span>
                    </div>
                    <span className="text-xs font-bold text-zinc-500">Upload Workshop Reference</span>
                    <span className="text-[10px] text-zinc-400">Drag assets here or browse local files. Max 5MB.</span>
                    {uploading && <span className="text-[10px] text-zinc-500 animate-pulse">Uploading file...</span>}
                  </>
                )}
              </label>
            </div>
          </section>
        </div>

        {/* Right Price Estimation Sidebar */}
        <div className="lg:col-span-4 sticky top-6 space-y-4">
          <section className="bg-white/60  backdrop-blur-xl border border-white/20  rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-black/5 pb-4">
              <span className="material-symbols-outlined text-primary">analytics</span>
              <h3 className="font-bold text-[#361f1a] text-lg">Price Estimation</h3>
            </div>

            <div className="space-y-4 text-xs font-semibold text-zinc-500">
              <div className="flex justify-between">
                <span>Standard Formal Last</span>
                <span className="text-zinc-800">₹{baseQuotation.toLocaleString("en-IN")}.00</span>
              </div>
              <div className="flex justify-between">
                <span>Premium Leather</span>
                <span className="text-emerald-600 font-bold">Included</span>
              </div>

              <div className="pt-4 border-t border-black/5 space-y-4 text-zinc-800">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Advance Paid (₹)</label>
                  <input
                    type="number"
                    value={advancePaid}
                    onChange={(e) => setAdvancePaid(Number(e.target.value))}
                    className="w-full bg-white border border-black/10 rounded-xl py-3 px-4 font-bold text-zinc-800 text-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Payment Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["CASH", "UPI", "CARD"].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentMode(mode)}
                        className={`py-2 rounded-lg text-center text-xs font-bold border transition-all ${
                          paymentMode === mode
                            ? "bg-[#361f1a] text-white border-[#361f1a] shadow-sm"
                            : "bg-white border-black/10 text-zinc-600 hover:bg-black/5"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="h-px bg-black/5 my-4"></div>

              <div className="flex justify-between items-end pt-2 text-zinc-800">
                <div className="text-left">
                  <p className="text-sm font-bold uppercase tracking-wider text-zinc-400">Total Payable</p>
                  <p className="text-2xl font-black mt-1 text-[#361f1a]">
                    ₹{totalPayable.toLocaleString("en-IN")}.00
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 space-y-3 flex flex-col">
                <button
                  type="button"
                  onClick={handleConfirmOrder}
                  disabled={isSubmitting || uploading}
                  className="w-full bg-[#361f1a] hover:bg-[#361f1a]/95 text-white py-3.5 rounded-xl text-sm font-semibold flex justify-center items-center gap-2 shadow-sm disabled:opacity-50 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">done</span>
                  Confirm Bespoke Order
                </button>
                <a
                  href={getWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full border border-emerald-600 text-emerald-600 py-3 rounded-xl text-sm font-semibold hover:bg-emerald-500/5 transition-all flex justify-center items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">share</span>
                  Send Bill on WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => router.push("/billing")}
                  className="w-full text-zinc-500 py-2 rounded-xl text-sm hover:underline"
                >
                  Save as Draft
                </button>
              </div>

              {/* Confirm Alert note */}
              <div className="bg-amber-50 border border-amber-200/50 p-3.5 rounded-xl flex items-start gap-2 text-amber-800 leading-tight">
                <span className="material-symbols-outlined text-amber-600 text-[18px] mt-0.5">info</span>
                <span className="text-[10px]">
                  Confirming will notify the workshop queue and send a summary to the customer via SMS.
                </span>
              </div>
            </div>
          </section>

          {/* Artisan Widget */}
          <div className="bg-white/40 border border-black/5 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-black/5 bg-zinc-200">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60"
                alt="Artisan Victor"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-zinc-800 text-xs">Artisan Victor</h4>
              <p className="text-[10px] text-zinc-400 font-medium">Master Shoemaker</p>
            </div>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-bold text-emerald-600">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BespokeBillingPage() {
  return (
    <Suspense fallback={<div>Loading Bespoke Commission...</div>}>
      <BespokeBillingContent />
    </Suspense>
  );
}
