"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createOrder } from "@/app/actions/orders";
import { uploadImage } from "@/lib/upload";

export default function ReadymadeBillingPage() {
  const router = useRouter();

  // Customer Identity
  const [customerName, setCustomerName] = useState("");
  const [contactNumber, setContactNumber] = useState("");

  // Shoe Details
  const [shoeName, setShoeName] = useState("Oxford Heritage Dark Tan");
  const [shoeSize, setShoeSize] = useState("UK 8");
  const [isHandmade, setIsHandmade] = useState(false);
  const [freeServicePeriod, setFreeServicePeriod] = useState("6 Months");

  // Image Upload
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  // Financials
  const [totalPrice, setTotalPrice] = useState(12500);
  const [adjustment, setAdjustment] = useState(0);
  const paymentMade = totalPrice - adjustment;
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fallbackShoeImg = "https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=150&auto=format&fit=crop&q=60";

  // Auto redirect to bespoke if handmade toggle is turned ON
  useEffect(() => {
    if (isHandmade) {
      // Pass states to Bespoke workspace via query parameters or local storage
      const params = new URLSearchParams({
        name: customerName,
        phone: contactNumber,
        shoeName,
        shoeSize,
      });
      router.push(`/billing/bespoke?${params.toString()}`);
    }
  }, [isHandmade, router]);

  // Listen for voice-parse prefill query parameters
  useEffect(() => {
    const prefillStr = new URLSearchParams(window.location.search).get("prefill");
    if (prefillStr) {
      try {
        const data = JSON.parse(decodeURIComponent(prefillStr));
        if (data.firstName || data.lastName) {
          setCustomerName(`${data.firstName || ""} ${data.lastName || ""}`.trim());
        }
        if (data.phone) {
          setContactNumber(data.phone);
        }
        if (data.itemType) {
          setShoeName(data.itemType);
        }
        if (data.price) {
          setTotalPrice(Number(data.price));
        }
      } catch (e) {
        console.error("Failed to parse prefill data", e);
      }
    }
  }, []);

  // Listen for QR scan prefill events
  useEffect(() => {
    const handleQrPrefill = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === "string") {
        const digits = detail.replace(/\D/g, "");
        if (digits.length >= 10) {
          setContactNumber(digits.slice(-10));
        } else if (detail.length < 20) {
          setCustomerName(detail);
        } else {
          setShoeName(detail);
        }
      }
    };
    window.addEventListener("qr-prefill", handleQrPrefill);
    return () => window.removeEventListener("qr-prefill", handleQrPrefill);
  }, []);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);
    setUploading(true);
    try {
      const url = await uploadImage(file, "before-images");
      setPhotoUrl(url);
    } catch (err) {
      console.error("Photo upload failed:", err);
      setPhotoUrl(URL.createObjectURL(file));
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateBill = async () => {
    if (!customerName || !contactNumber) {
      alert("Customer Name and Contact Number are required.");
      return;
    }
    if (!photoUrl) {
      alert("Please upload the shoe image (compulsory).");
      return;
    }

    setIsSubmitting(true);

    // Split name
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
        serviceType: `Readymade Shoe (${freeServicePeriod} free service)`,
        itemType: shoeName,
        price: totalPrice - adjustment,
        dueDate: new Date(),
        status: "DELIVERED" as any,
        notes: `Shoe size: ${shoeSize}. Free service period: ${freeServicePeriod}.`,
      },
      items: [
        {
          category: "Formal Shoe",
          brand: "Mr. Boot",
          model: shoeName,
          description: `Size: ${shoeSize}. Free service period: ${freeServicePeriod}.`,
          services: [`Free Service (${freeServicePeriod})`],
          price: totalPrice - adjustment,
          photoUrl: photoUrl,
        },
      ],
      payment: {
        advancePaid: paymentMade,
        paymentMode: paymentMode,
      },
    };

    try {
      const res = await createOrder(payload);
      if (res.success) {
        router.push(`/invoices/${res.orderId}?print=1`);
      } else {
        alert("Failed to save transaction: " + res.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const balanceDue = Math.max(0, totalPrice - adjustment - paymentMade);

  return (
    <div className="w-full max-w-6xl mx-auto py-6 px-4">
      {/* Top Header / Breadcrumb */}
      <div className="text-xs text-on-surface-variant/70 mb-2">
        New Transaction &gt; <span className="font-semibold text-primary">Readymade Shoes</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form Panel */}
        <div className="lg:col-span-8 space-y-6">
          {/* Customer Identity Card */}
          <section className="bg-white/60  backdrop-blur-xl border border-white/20  rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-black/5 pb-4">
              <span className="material-symbols-outlined text-primary p-2 bg-primary/10 rounded-lg">
                person
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
                  placeholder="John Doe"
                  className="w-full bg-white/50 border border-black/5 rounded-xl py-3 px-4 font-body-md text-sm focus:outline-none focus:ring-1 focus:ring-[#361f1a]/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Contact Number</label>
                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="+91  98765 43210"
                  className="w-full bg-white/50 border border-black/5 rounded-xl py-3 px-4 font-body-md text-sm focus:outline-none focus:ring-1 focus:ring-[#361f1a]/50"
                />
              </div>
            </div>
          </section>

          {/* Shoe Details Card */}
          <section className="bg-white/60  backdrop-blur-xl border border-white/20  rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-black/5 pb-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary p-2 bg-primary/10 rounded-lg">
                  shopping_bag
                </span>
                <h2 className="text-lg font-bold text-[#361f1a]">Shoe Details</h2>
              </div>

              {/* Handmade toggle */}
              <div className="flex items-center gap-3 bg-zinc-50  p-2 rounded-xl border border-black/5">
                <div className="text-right">
                  <p className="text-xs font-bold text-zinc-800">Handmade shoe?</p>
                  <p className="text-[10px] text-zinc-400">Transition to Bespoke Workspace</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isHandmade}
                    onChange={(e) => setIsHandmade(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Shoe Name / Model</label>
                <input
                  type="text"
                  value={shoeName}
                  onChange={(e) => setShoeName(e.target.value)}
                  placeholder="Oxford Heritage Dark Tan"
                  className="w-full bg-white/50 border border-black/5 rounded-xl py-3 px-4 font-body-md text-sm focus:outline-none focus:ring-1 focus:ring-[#361f1a]/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Shoe Size</label>
                <input
                  type="text"
                  value={shoeSize}
                  onChange={(e) => setShoeSize(e.target.value)}
                  placeholder="UK 8"
                  className="w-full bg-white/50 border border-black/5 rounded-xl py-3 px-4 font-body-md text-sm focus:outline-none focus:ring-1 focus:ring-[#361f1a]/50"
                />
              </div>
            </div>

            {/* Free Servicing Period Selector */}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-3">Free Servicing Period</label>
              <div className="grid grid-cols-3 gap-3">
                {["6 Months", "1 Year", "1.5 Years"].map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setFreeServicePeriod(period)}
                    className={`py-3.5 rounded-xl text-center text-sm font-semibold border transition-all ${
                      freeServicePeriod === period
                        ? "bg-[#361f1a] text-white border-[#361f1a] shadow-sm"
                        : "bg-white/50 border-black/5 text-zinc-600 hover:bg-black/5"
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Upload Shoe Image */}
          <section className="bg-white/60  backdrop-blur-xl border border-white/20  rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-black/5 pb-4">
              <span className="material-symbols-outlined text-primary p-2 bg-primary/10 rounded-lg">
                photo_camera
              </span>
              <h2 className="text-lg font-bold text-[#361f1a]">Upload Shoe Image</h2>
            </div>
            
            <label className="relative w-full h-48 border-2 border-dashed border-primary/20 rounded-2xl bg-white/30 hover:bg-white/50 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer overflow-hidden">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handlePhotoSelect}
              />
              {photoUrl ? (
                <img src={photoUrl} alt="Uploaded Shoe" className="w-full h-full object-cover absolute inset-0" />
              ) : (
                <>
                  <div className="w-12 h-12 rounded-xl bg-[#361f1a]/5 flex items-center justify-center text-[#361f1a]">
                    <span className="material-symbols-outlined text-[28px]">upload_file</span>
                  </div>
                  <span className="text-sm font-bold text-[#361f1a]">Drop shoe image here</span>
                  <span className="text-xs text-zinc-400">Supports JPG, PNG up to 10MB</span>
                  {uploading && <span className="text-xs text-zinc-500 animate-pulse">Uploading to Supabase Storage...</span>}
                </>
              )}
            </label>
          </section>
        </div>

        {/* Right Financials Sidebar */}
        <div className="lg:col-span-4 sticky top-6 space-y-4">
          <section className="bg-white/60  backdrop-blur-xl border border-white/20  rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-black/5 pb-4">
              <span className="material-symbols-outlined text-primary">payments</span>
              <h3 className="font-bold text-[#361f1a] text-lg">Payment</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Total Price (₹)</label>
                <input
                  type="number"
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(Number(e.target.value))}
                  className="w-full bg-white border border-black/10 rounded-xl py-3 px-4 font-bold text-zinc-800 text-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Payment Made (₹)</label>
                <input
                  type="number"
                  value={paymentMade}
                  readOnly
                  className="w-full bg-zinc-50 border border-black/10 rounded-xl py-3 px-4 font-bold text-zinc-400 text-lg focus:outline-none cursor-not-allowed"
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
                      className={`py-2.5 rounded-xl text-center text-xs font-bold border transition-all ${
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

              <div className="pt-4 space-y-2 border-t border-black/5 text-sm text-zinc-500">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{totalPrice.toLocaleString("en-IN")}.00</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Adjustment / Discount</span>
                  <div className="relative w-28">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-xs">- ₹</span>
                    <input
                      type="number"
                      value={adjustment || ""}
                      onChange={(e) => setAdjustment(Number(e.target.value))}
                      className="w-full bg-white/65 border border-black/5 rounded-lg py-1 pl-7 pr-2 text-right text-xs focus:outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-end pt-4 border-t border-black/5">
                <span className="text-sm font-semibold text-zinc-500">Balance Due</span>
                <span className="text-2xl font-black text-[#361f1a]">
                  ₹{balanceDue.toLocaleString("en-IN")}.00
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 space-y-3">
                <button
                  type="button"
                  onClick={handleGenerateBill}
                  disabled={isSubmitting || uploading}
                  className="w-full bg-[#361f1a] hover:bg-[#361f1a]/95 text-white py-3.5 rounded-xl text-sm font-semibold flex justify-center items-center gap-2 shadow-sm disabled:opacity-50 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">receipt</span>
                  {isSubmitting ? "Generating..." : "Generate Bill"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/billing")}
                  className="w-full border border-[#361f1a]/25 text-[#361f1a] py-3 rounded-xl text-sm font-semibold hover:bg-black/5 transition-all flex justify-center items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Save as Draft
                </button>
              </div>
            </div>
          </section>

          {/* Live Preview Card */}
          {customerName && (
            <div className="bg-white/40 border border-black/5 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-black/5 bg-white flex-shrink-0">
                <img src={photoUrl || fallbackShoeImg} alt="Preview" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">LIVE PREVIEW</span>
                <h4 className="font-bold text-zinc-800 text-xs truncate leading-tight">{shoeName}</h4>
                <span className="text-[10px] font-bold text-emerald-600 tracking-wider uppercase">READY TO BILL</span>
              </div>
              <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
