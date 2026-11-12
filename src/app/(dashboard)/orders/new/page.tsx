"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createOrder } from "@/app/actions/orders";
import { uploadImage } from "@/lib/upload";

const categories = [
  "Sneaker", "Sport Shoe", "Formal Shoe", "Boots", "Heels", "Sandals", "Loafers", "Slippers",
  "Bags", "Handbag", "Backpack", "Jacket", "Leather Jacket", "Suede Shoes", "Canvas Shoes",
  "Running Shoes", "Trekking Shoes", "Other"
];

// Up to this many pairs: one card per pair (with Repeat). Above it: quantity lines.
const BULK_THRESHOLD = 7;

const availableServices = [
  "Standard Laundry",
  "Premium Deep Clean",
  "Shoe Polish",
  "Waterproofing",
  "Stain Removal",
  "Odor Treatment",
  "Sole Pasting",
  "Sole Change",
  "Heel Change",
  "Heel Repair",
  "Counter Change",
  "Zipper Repair",
  "Zipper Change",
  "Net Change",
  "Patch Work",
  "Stitching Repair",
  "Grip Rubber",
  "Grip TPR",
  "Tongue Change",
  "Insole Change",
  "Lace Replacement",
  "Buckle Repair",
  "Strap Repair",
  "Bag Chain Change",
  "Bag Zipper Repair",
  "Bag Handle Repair",
  "Colour Dye",
  "Color Restoration",
  "Whitening Treatment",
  "Suede Cleaning",
  "Canvas Cleaning",
  "Leather Conditioning",
  "Full Restoration",
  "Customization",
  "Repair",
  "Other"
];

interface OrderItemState {
  category: string;
  brand: string;
  model: string;
  description: string;
  services: string[];
  customService?: string; // Textbox input if "Other" is selected
  price: number; // price per pair
  qty: number; // number of identical pairs on this line (always 1 in single mode)
}

const blankItem = (): OrderItemState => ({
  category: "",
  brand: "",
  model: "",
  description: "",
  services: [],
  price: 0,
  qty: 1,
});

const sameItem = (a: OrderItemState, b: OrderItemState) =>
  a.category === b.category &&
  a.brand === b.brand &&
  a.model === b.model &&
  a.description === b.description &&
  a.price === b.price &&
  (a.customService || "") === (b.customService || "") &&
  [...a.services].sort().join("|") === [...b.services].sort().join("|");

/** Combine identical pairs into one line with a quantity. */
const mergeIntoLines = (list: OrderItemState[]): OrderItemState[] => {
  const out: OrderItemState[] = [];
  for (const it of list) {
    const match = out.find((o) => sameItem(o, it));
    if (match) match.qty += it.qty || 1;
    else out.push({ ...it, services: [...it.services], qty: it.qty || 1 });
  }
  return out;
};

export default function NewOrderPage() {
  const router = useRouter();
  const [artisans, setArtisans] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState("Active Staff");

  // Load current logged in user to pass to createdBy
  useEffect(() => {
    import("@/lib/supabase").then(({ supabase }) => {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          // Check metadata first
          const metaName = data.user.user_metadata?.full_name || data.user.user_metadata?.name;
          if (metaName) {
            setCurrentUser(metaName);
            return;
          }
          // Fallback to email
          const email = data.user.email;
          if (email) {
            const username = email.split('@')[0];
            const name = username.split(/[._-]/).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
            setCurrentUser(name);
          }
        }
      });
    });
  }, []);

  // Customer state
  const [customerSearch, setCustomerSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    notes: "",
  });

  // Order state
  const [orderType, setOrderType] = useState("Sole Replacement");
  const [advancePaid, setAdvancePaid] = useState(0);
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [dueDate, setDueDate] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [artisanId, setArtisanId] = useState("");
  const [isPorter, setIsPorter] = useState(false);
  const [porterCharge, setPorterCharge] = useState(150);


  // Unified Order Intake Photos state (uploaded at the end of all items)
  const [mainPhotoUrl, setMainPhotoUrl] = useState("");
  const [mainUploading, setMainUploading] = useState(false);
  const [additionalPhotos, setAdditionalPhotos] = useState<{ url: string; uploading: boolean }[]>([]);

  // Multi-item state
  const [items, setItems] = useState<OrderItemState[]>([blankItem()]);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkNotice, setBulkNotice] = useState(false);

  // Dropdown open states per item
  const [openDropdownIdx, setOpenDropdownIdx] = useState<number | null>(null);

  // Computed subtotal
  const subtotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0);
  const totalPairs = items.reduce((sum, item) => sum + (item.qty || 1), 0);

  // Set items; switch to quantity lines automatically once the order passes 7 pairs.
  const applyItems = (next: OrderItemState[]) => {
    const pairs = next.reduce((sum, i) => sum + (i.qty || 1), 0);
    if (!bulkMode && pairs > BULK_THRESHOLD) {
      setBulkMode(true);
      setBulkNotice(true);
      setItems(mergeIntoLines(next));
    } else {
      setItems(next);
    }
  };

  // Single mode: copy a pair (same type, services, price) right below it.
  const handleRepeatItem = (index: number) => {
    const copy = { ...items[index], services: [...items[index].services], qty: 1 };
    applyItems([...items.slice(0, index + 1), copy, ...items.slice(index + 1)]);
  };

  const handleRemoveItem = (index: number) => {
    const next = items.filter((_, idx) => idx !== index);
    setItems(next.length ? next : [blankItem()]);
  };

  const setLineQty = (index: number, qty: number) => {
    const q = Math.max(1, Math.min(500, Math.floor(qty) || 1));
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, qty: q } : it)));
  };

  const toggleBulkMode = () => {
    if (bulkMode) {
      if (totalPairs > BULK_THRESHOLD) {
        alert(`Orders with more than ${BULK_THRESHOLD} pairs use quantity lines.`);
        return;
      }
      // Back to one card per pair.
      setItems(items.flatMap((it) => Array.from({ length: it.qty || 1 }, () => ({ ...it, services: [...it.services], qty: 1 }))));
      setBulkMode(false);
      setBulkNotice(false);
    } else {
      setItems(mergeIntoLines(items));
      setBulkMode(true);
    }
  };

  // Load artisans
  useEffect(() => {
    fetch("/api/staff")
      .then((res) => res.json())
      .then((data) => setArtisans(data.filter((s: any) => s.role === "ARTISAN" || s.role === "MANAGER")))
      .catch((err) => console.error("Error loading staff:", err));
  }, []);

  // Listen for voice-parse prefill query parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const prefillStr = searchParams.get("prefill");
    if (prefillStr) {
      try {
        const data = JSON.parse(decodeURIComponent(prefillStr));
        setShowAddCustomer(true);
        setNewCustomer((prev) => ({
          ...prev,
          firstName: data.firstName || prev.firstName,
          lastName: data.lastName || prev.lastName,
          phone: data.phone || prev.phone,
        }));
        setItems((prev) => {
          const newItems = [...prev];
          if (newItems[0]) {
            newItems[0] = {
              ...newItems[0],
              model: data.itemType || newItems[0].model,
              price: data.price ? Number(data.price) : newItems[0].price,
              category: "Formal Shoe",
            };
          }
          return newItems;
        });
      } catch (e) {
        console.error("Failed to parse prefill data", e);
      }
    } else {
      // Fallback: direct simple params
      const name = searchParams.get("name");
      const phone = searchParams.get("phone");
      const price = searchParams.get("price");
      const item = searchParams.get("item");

      if (name || phone || price || item) {
        setShowAddCustomer(true);
        if (name) {
          const parts = name.trim().split(/\s+/);
          setNewCustomer((prev) => ({
            ...prev,
            firstName: parts[0] || "",
            lastName: parts.slice(1).join(" ") || "",
          }));
        }
        if (phone) {
          setNewCustomer((prev) => ({ ...prev, phone }));
        }
        if (price || item) {
          setItems((prev) => {
            const newItems = [...prev];
            if (newItems[0]) {
              newItems[0] = {
                ...newItems[0],
                model: item || newItems[0].model,
                price: price ? Number(price) : newItems[0].price,
                category: "Formal Shoe",
              };
            }
            return newItems;
          });
        }
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
          const last10 = digits.slice(-10);
          setCustomerSearch(last10);
          setShowAddCustomer(true);
          setNewCustomer((prev) => ({ ...prev, phone: last10 }));
        } else {
          setCustomerSearch(detail);
        }
      }
    };
    window.addEventListener("qr-prefill", handleQrPrefill);
    return () => window.removeEventListener("qr-prefill", handleQrPrefill);
  }, []);

  // Customer search
  useEffect(() => {
    if (customerSearch.trim().length > 1) {
      let cancelled = false;
      fetch(`/api/customers?search=${encodeURIComponent(customerSearch)}`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) setSearchResults(Array.isArray(data) ? data : []);
        })
        .catch((err) => console.error(err));
      return () => {
        cancelled = true;
      };
    } else {
      setSearchResults([]);
    }
  }, [customerSearch]);

  const handleSelectCustomer = (cust: any) => {
    setSelectedCustomer(cust);
    setCustomerSearch("");
    setSearchResults([]);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomer),
      });
      if (res.ok) {
        const cust = await res.json();
        setSelectedCustomer(cust);
        setShowAddCustomer(false);
      } else if (res.status === 409) {
        const errorData = await res.json();
        alert(errorData.error || "Customer already exists.");
      } else {
        alert("Failed to create customer. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error occurred.");
    }
  };

  const handleAddItem = () => {
    applyItems([...items, blankItem()]);
  };

  const handleItemChange = (index: number, field: keyof OrderItemState, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleServiceToggle = (itemIndex: number, serviceLabel: string) => {
    const updated = [...items];
    const currentServices = updated[itemIndex].services;
    if (currentServices.includes(serviceLabel)) {
      updated[itemIndex].services = currentServices.filter((s) => s !== serviceLabel);
    } else {
      updated[itemIndex].services = [...currentServices, serviceLabel];
    }
    setItems(updated);
  };

  // Unified photo handlers
  const handleMainPhotoUpload = async (file: File) => {
    setMainUploading(true);
    try {
      const url = await uploadImage(file, "before-images");
      setMainPhotoUrl(url);
    } catch (err) {
      console.error("Main photo upload failed:", err);
      setMainPhotoUrl("");
      alert("Photo upload failed: " + ((err as any)?.message || "please try again"));
    } finally {
      setMainUploading(false);
    }
  };

  const handleAdditionalPhotosUpload = async (files: FileList) => {
    const fileArray = Array.from(files);
    const newPhotos = fileArray.map(() => ({ url: "", uploading: true }));
    setAdditionalPhotos((prev) => [...prev, ...newPhotos]);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const photoIdx = additionalPhotos.length + i;
      try {
        const url = await uploadImage(file, "before-images");
        setAdditionalPhotos((prev) => {
          const copy = [...prev];
          if (copy[photoIdx]) {
            copy[photoIdx] = { url, uploading: false };
          }
          return copy;
        });
      } catch (err: any) {
        setAdditionalPhotos((prev) => {
          const copy = [...prev];
          if (copy[photoIdx]) copy[photoIdx] = { ...copy[photoIdx], uploading: false };
          return copy;
        });
        alert("A photo failed to upload: " + (err?.message || "please try again"));
      }
    }
  };

  const handleRemoveAdditionalPhoto = (photoIdx: number) => {
    setAdditionalPhotos((prev) => prev.filter((_, idx) => idx !== photoIdx));
  };

  const handleFormSubmit = async () => {
    if (!selectedCustomer) {
      alert("Please select or add a customer.");
      return;
    }
    if (!dueDate) {
      alert("Please select a due date.");
      return;
    }
    if (items.some((item) => !item.category)) {
      alert("Please select a category for all items.");
      return;
    }
    if (mainUploading || additionalPhotos.some((p) => p.uploading)) {
      alert("Please wait for the photos to finish uploading.");
      return;
    }
    if (advancePaid < 0 || advancePaid > subtotal) {
      alert("Advance paid must be between ₹0 and the order total.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      customer: {
        id: selectedCustomer.id as string | undefined,
        firstName: selectedCustomer.firstName,
        lastName: selectedCustomer.lastName,
        email: selectedCustomer.email || undefined,
        phone: selectedCustomer.phone,
        notes: selectedCustomer.notes || undefined,
      },
      order: {
        serviceType: items.length > 0 && items[0].services.length > 0 ? items[0].services[0] : orderType,
        itemType: items
          .map((i) => `${`${i.brand || ""} ${i.model || i.category}`.trim()}${(i.qty || 1) > 1 ? ` ×${i.qty}` : ""}`)
          .join(", "),
        price: subtotal,
        dueDate: new Date(dueDate),
        notes: orderNotes,
        pickupByPorter: isPorter,
        dropByPorter: isPorter,
        artisanId: artisanId || undefined,
      },
      items: items.map((i, idx) => {
        // Map services list, replacing "Other" with textbox content if populated
        const finalServices = i.services.map(s => {
          if (s === "Other" && i.customService) return `Other: ${i.customService}`;
          return s;
        });

        return {
          category: i.category,
          brand: i.brand,
          model: i.model,
          description: i.description,
          services: finalServices,
          price: i.price,
          quantity: i.qty || 1,
          // Single main photo & additional photos are attached to the first item
          photoUrl: idx === 0 ? mainPhotoUrl : undefined,
          additionalPhotos: idx === 0 ? additionalPhotos.filter(p => p.url).map(p => p.url) : [],
        };
      }),
      payment: {
        advancePaid,
        paymentMode,
      },
      createdBy: currentUser,
    };

    try {
      const res = await createOrder(payload);
      if (res.success) {
        router.push(`/invoices/${res.orderId}?print=1`);
      } else {
        alert("Error creating order: " + res.error);
        setIsSubmitting(false);
      }
    } catch (err: any) {
      alert("Error creating order: " + (err?.message || "network error"));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-4">
      {/* Header */}
      <header className="w-full flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/65 dark:bg-primary/65 border border-white/20 shadow-sm flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-primary dark:text-primary-fixed">New Service Order</h1>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Drafting intake for client items.</p>
          </div>
        </div>
      </header>

      {/* Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-20">
        <div className="lg:col-span-8 flex flex-col gap-card-gap">
          {/* Customer Profile */}
          <section className="bg-white/65 dark:bg-primary/65 backdrop-blur-xl border border-white/22 dark:border-white/10 rounded-xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary-container p-2 bg-primary-fixed/20 rounded-lg">
                person_search
              </span>
              <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-primary dark:text-primary-fixed">
                Customer Profile
              </h2>
            </div>

            {selectedCustomer ? (
              <div className="p-4 bg-white/30 rounded-lg border border-black/5 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-primary dark:text-primary-fixed">
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </p>
                  <p className="text-sm text-on-surface-variant">{selectedCustomer.phone} • {selectedCustomer.email || "No email"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="text-error font-medium text-sm hover:underline"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                  search
                </span>
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full bg-white/50 border border-black/5 rounded-full py-3 pl-12 pr-4 font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-tertiary-fixed-dim/50"
                  placeholder="Search existing customers or enter phone number..."
                />
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-primary-container border border-black/10 rounded-xl shadow-lg z-50 overflow-hidden">
                    {searchResults.map((cust) => (
                      <div
                        key={cust.id}
                        onClick={() => handleSelectCustomer(cust)}
                        className="px-4 py-3 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer border-b border-black/5 last:border-none"
                      >
                        <p className="font-semibold text-sm">
                          {cust.firstName} {cust.lastName}
                        </p>
                        <p className="text-xs text-on-surface-variant">{cust.phone}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!selectedCustomer && !showAddCustomer && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-outline-variant/30">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Customer not in database?</span>
                <button
                  type="button"
                  onClick={() => setShowAddCustomer(true)}
                  className="font-label-sm text-label-sm text-tertiary-container hover:text-primary-container font-medium flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span> Add New Customer
                </button>
              </div>
            )}

            {showAddCustomer && (
              <form onSubmit={handleCreateCustomer} className="mt-6 p-4 bg-white/30 rounded-xl border border-black/5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1">First Name</label>
                    <input
                      required
                      type="text"
                      className="w-full bg-white/50 border border-black/5 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim"
                      value={newCustomer.firstName}
                      onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1">Last Name</label>
                    <input
                      required
                      type="text"
                      className="w-full bg-white/50 border border-black/5 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim"
                      value={newCustomer.lastName}
                      onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1">Phone Number</label>
                    <input
                      required
                      type="text"
                      className="w-full bg-white/50 border border-black/5 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1">Email</label>
                    <input
                      type="email"
                      className="w-full bg-white/50 border border-black/5 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1">Internal Notes</label>
                  <textarea
                    className="w-full bg-white/50 border border-black/5 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim h-20"
                    value={newCustomer.notes}
                    onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddCustomer(false)}
                    className="px-4 py-2 border rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg text-sm">
                    Create Customer
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* Items header: pair count + bulk mode switch */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div>
              <h2 className="text-lg font-bold text-primary dark:text-primary-fixed">
                Shoes & Items <span className="text-on-surface-variant font-semibold">· {totalPairs} {totalPairs === 1 ? "pair" : "pairs"}</span>
              </h2>
              <p className="text-xs text-on-surface-variant">
                {bulkMode ? "Bulk order — one line per type, set how many pairs." : `Up to ${BULK_THRESHOLD} pairs: one card each. Tap Repeat for an identical pair.`}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleBulkMode}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${bulkMode ? "bg-[#361f1a] text-white border-[#361f1a]" : "border-[#361f1a]/30 text-[#361f1a] hover:bg-[#361f1a]/5"}`}
            >
              {bulkMode ? "Bulk mode ON" : `Bulk order (${BULK_THRESHOLD + 1}+ pairs)`}
            </button>
          </div>
          {bulkNotice && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <span className="material-symbols-outlined text-[16px]">info</span>
              <span>More than {BULK_THRESHOLD} pairs — switched to quantity lines. Identical pairs were combined into one line.</span>
              <button type="button" onClick={() => setBulkNotice(false)} className="ml-auto font-bold">OK</button>
            </div>
          )}

          {bulkMode ? (
            <>
          {items.map((item, itemIdx) => (
            <div key={itemIdx} className="bg-white/65 dark:bg-primary/65 backdrop-blur-xl border border-white/22 dark:border-white/10 rounded-xl p-4 md:p-5 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-primary dark:text-primary-fixed">Line {itemIdx + 1}</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => applyItems([...items.slice(0, itemIdx + 1), { ...item, services: [...item.services], qty: 1 }, ...items.slice(itemIdx + 1)])}
                    className="flex items-center gap-1 text-primary font-semibold text-xs hover:underline"
                    title="Copy this line"
                  >
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    Copy
                  </button>
                  {items.length > 1 && (
                    <button type="button" onClick={() => handleRemoveItem(itemIdx)} className="text-error font-medium hover:underline text-xs">
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  className="w-full bg-white/50 border border-black/5 rounded-lg py-2.5 px-3 text-sm"
                  value={item.category}
                  onChange={(e) => handleItemChange(itemIdx, "category", e.target.value)}
                >
                  <option value="" disabled>Product type</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              {/* Cool Custom Select Services Dropdown List with multi-checkbox */}
              <div className="relative">
                
                <button
                  type="button"
                  onClick={() => setOpenDropdownIdx(openDropdownIdx === itemIdx ? null : itemIdx)}
                  className="w-full bg-white/50 border border-black/5 rounded-lg py-2.5 px-4 text-left font-body-md text-sm flex justify-between items-center"
                >
                  <span className="truncate">
                    {item.services.length === 0
                      ? "Select services..."
                      : item.services.map(s => s === "Other" && item.customService ? `Other: ${item.customService}` : s).join(", ")
                    }
                  </span>
                  <span className="material-symbols-outlined text-[20px] transition-transform duration-200" style={{ transform: openDropdownIdx === itemIdx ? "rotate(180deg)" : "rotate(0)" }}>
                    keyboard_arrow_down
                  </span>
                </button>

                {openDropdownIdx === itemIdx && (
                  <>
                    {/* Backdrop to close */}
                    <div className="fixed inset-0 z-30" onClick={() => setOpenDropdownIdx(null)} />
                    
                    {/* Dropdown Card */}
                    <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-black/10 rounded-xl shadow-xl z-40 max-h-60 overflow-y-auto p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {availableServices.map((service) => {
                        const isChecked = item.services.includes(service);
                        return (
                          <label key={service} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleServiceToggle(itemIdx, service)}
                              className="rounded text-primary focus:ring-primary border-black/10 w-4 h-4"
                            />
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{service}</span>
                          </label>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Conditional Textbox if "Other" service is selected */}
                {item.services.includes("Other") && (
                  <div className="mt-3 animate-fadeIn">
                    <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1.5">Specify Other Service</label>
                    <input
                      type="text"
                      value={item.customService || ""}
                      onChange={(e) => handleItemChange(itemIdx, "customService", e.target.value)}
                      placeholder="e.g. Custom logo engraving"
                      className="w-full bg-white/50 border border-black/5 rounded-lg py-2.5 px-4 font-body-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}
              </div>

              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <span className="block text-[11px] font-semibold text-on-surface-variant uppercase mb-1">Pairs</span>
                  <div className="flex items-center rounded-lg border border-black/10 bg-white/60 overflow-hidden">
                    <button type="button" onClick={() => setLineQty(itemIdx, item.qty - 1)} className="w-10 h-10 text-lg font-bold text-primary hover:bg-black/5" aria-label="One less">−</button>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={item.qty}
                      onChange={(e) => setLineQty(itemIdx, Number(e.target.value))}
                      className="w-14 h-10 text-center font-bold bg-transparent border-x border-black/10 focus:outline-none"
                    />
                    <button type="button" onClick={() => setLineQty(itemIdx, item.qty + 1)} className="w-10 h-10 text-lg font-bold text-primary hover:bg-black/5" aria-label="One more">+</button>
                  </div>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold text-on-surface-variant uppercase mb-1">Price per pair</span>
                  <div className="relative w-28">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-semibold">₹</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={item.price || ""}
                      onChange={(e) => handleItemChange(itemIdx, "price", Number(e.target.value))}
                      className="w-full h-10 bg-white/50 border border-black/10 rounded-lg pl-7 pr-2 font-bold focus:outline-none focus:border-primary"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="ml-auto text-right">
                  <span className="block text-[11px] font-semibold text-on-surface-variant uppercase mb-1">Line total</span>
                  <span className="text-lg font-bold text-primary dark:text-primary-fixed">
                    ₹{((item.price || 0) * (item.qty || 1)).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <details className="text-sm">
                <summary className="cursor-pointer text-xs text-on-surface-variant font-medium select-none">Brand, model & notes (optional)</summary>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                  <input type="text" placeholder="Brand" value={item.brand} onChange={(e) => handleItemChange(itemIdx, "brand", e.target.value)} className="bg-white/50 border border-black/5 rounded-lg py-2 px-3 text-sm" />
                  <input type="text" placeholder="Model / style" value={item.model} onChange={(e) => handleItemChange(itemIdx, "model", e.target.value)} className="bg-white/50 border border-black/5 rounded-lg py-2 px-3 text-sm" />
                  <input type="text" placeholder="Notes (scuffs, colour…)" value={item.description} onChange={(e) => handleItemChange(itemIdx, "description", e.target.value)} className="bg-white/50 border border-black/5 rounded-lg py-2 px-3 text-sm" />
                </div>
              </details>
            </div>
          ))}
            </>
          ) : (
            <>
          {items.map((item, itemIdx) => (
            <div key={itemIdx} className="bg-white/65 dark:bg-primary/65 backdrop-blur-xl border border-white/22 dark:border-white/10 rounded-xl p-8 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-black/5 pb-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary-container p-2 bg-primary-fixed/20 rounded-lg">
                    steps
                  </span>
                  <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-primary dark:text-primary-fixed">
                    Pair #{itemIdx + 1}
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleRepeatItem(itemIdx)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-semibold text-sm hover:bg-primary/15"
                    title="Add another pair exactly like this one"
                  >
                    <span className="material-symbols-outlined text-[18px]">content_copy</span>
                    Repeat
                  </button>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(itemIdx)}
                      className="text-error font-medium hover:underline text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Item Details Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-2">Item Category</label>
                  <select
                    className="w-full bg-white/50 border border-black/5 rounded-lg py-2.5 px-4 font-body-md text-body-md"
                    value={item.category}
                    onChange={(e) => handleItemChange(itemIdx, "category", e.target.value)}
                  >
                    <option value="" disabled>Select Category</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-2">Brand</label>
                  <input
                    type="text"
                    className="w-full bg-white/50 border border-black/5 rounded-lg py-2.5 px-4 font-body-md text-body-md"
                    placeholder="e.g. Churchs, New Balance"
                    value={item.brand}
                    onChange={(e) => handleItemChange(itemIdx, "brand", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-2">Model / Style</label>
                  <input
                    type="text"
                    className="w-full bg-white/50 border border-black/5 rounded-lg py-2.5 px-4 font-body-md text-body-md"
                    placeholder="e.g. Air Force 1, Consul Brogue"
                    value={item.model}
                    onChange={(e) => handleItemChange(itemIdx, "model", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-2">Item Description & Scuffs</label>
                  <textarea
                    className="w-full bg-white/50 border border-black/5 rounded-lg py-2.5 px-4 font-body-md text-body-md h-32"
                    placeholder="e.g. Scuff marks on back leather heels"
                    value={item.description}
                    onChange={(e) => handleItemChange(itemIdx, "description", e.target.value)}
                  />
                </div>
              </div>

              {/* Cool Custom Select Services Dropdown List with multi-checkbox */}
              <div className="relative">
                <label className="block text-sm font-medium text-on-surface mb-2">Select Services</label>
                
                <button
                  type="button"
                  onClick={() => setOpenDropdownIdx(openDropdownIdx === itemIdx ? null : itemIdx)}
                  className="w-full bg-white/50 border border-black/5 rounded-lg py-2.5 px-4 text-left font-body-md text-sm flex justify-between items-center"
                >
                  <span className="truncate">
                    {item.services.length === 0
                      ? "Select services..."
                      : item.services.map(s => s === "Other" && item.customService ? `Other: ${item.customService}` : s).join(", ")
                    }
                  </span>
                  <span className="material-symbols-outlined text-[20px] transition-transform duration-200" style={{ transform: openDropdownIdx === itemIdx ? "rotate(180deg)" : "rotate(0)" }}>
                    keyboard_arrow_down
                  </span>
                </button>

                {openDropdownIdx === itemIdx && (
                  <>
                    {/* Backdrop to close */}
                    <div className="fixed inset-0 z-30" onClick={() => setOpenDropdownIdx(null)} />
                    
                    {/* Dropdown Card */}
                    <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-black/10 rounded-xl shadow-xl z-40 max-h-60 overflow-y-auto p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {availableServices.map((service) => {
                        const isChecked = item.services.includes(service);
                        return (
                          <label key={service} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleServiceToggle(itemIdx, service)}
                              className="rounded text-primary focus:ring-primary border-black/10 w-4 h-4"
                            />
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{service}</span>
                          </label>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Conditional Textbox if "Other" service is selected */}
                {item.services.includes("Other") && (
                  <div className="mt-3 animate-fadeIn">
                    <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1.5">Specify Other Service</label>
                    <input
                      type="text"
                      value={item.customService || ""}
                      onChange={(e) => handleItemChange(itemIdx, "customService", e.target.value)}
                      placeholder="e.g. Custom logo engraving"
                      className="w-full bg-white/50 border border-black/5 rounded-lg py-2.5 px-4 font-body-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}
              </div>

              {/* Per-Item Custom Price input */}
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">Price for this item</label>
                <div className="relative w-48">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-semibold">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={item.price || ""}
                    onChange={(e) => handleItemChange(itemIdx, "price", Number(e.target.value))}
                    className="w-full bg-white/50 border-2 border-primary/20 rounded-xl py-3 pl-8 pr-4 text-lg font-bold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          ))}

            </>
          )}

          {/* Add Another Pair / Item Button */}
          <button
            type="button"
            onClick={handleAddItem}
            className="w-full py-4 border-2 border-dashed border-primary-container/30 rounded-xl text-primary font-semibold flex items-center justify-center gap-2 hover:bg-primary-fixed/10 transition-colors"
          >
            <span className="material-symbols-outlined">add_circle</span> {bulkMode ? "Add another line" : "Add a different pair / item"}
          </button>

          {/* Unified Order Intake Photos Card (after all shoes are added) */}
          <section className="bg-white/65 dark:bg-primary/65 backdrop-blur-xl border border-white/22 dark:border-white/10 rounded-xl p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-black/5 pb-4">
              <span className="material-symbols-outlined text-primary-container p-2 bg-primary-fixed/20 rounded-lg">
                photo_camera
              </span>
              <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-primary dark:text-primary-fixed">
                Order Intake Photos
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Main Photo (compulsory) */}
              <div>
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Main Photo (For Bill)</p>
                <label className="block w-full h-40 border-2 border-dashed border-primary/20 rounded-xl bg-white/30 hover:bg-white/50 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer relative overflow-hidden">
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleMainPhotoUpload(file);
                    }}
                  />
                  {mainPhotoUrl ? (
                    <img src={mainPhotoUrl} alt="Main photo" className="w-full h-full object-cover absolute inset-0 rounded-xl" />
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-primary-container text-[32px]">add_a_photo</span>
                      <span className="text-sm font-medium text-primary">Click to upload main photo</span>
                      {mainUploading && <span className="text-xs text-on-surface-variant">Uploading...</span>}
                    </>
                  )}
                </label>
                {mainPhotoUrl && (
                  <button
                    type="button"
                    onClick={() => setMainPhotoUrl("")}
                    className="text-xs text-error mt-1 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Additional Photos */}
              <div>
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Additional Photos</p>
                <label className="block w-full h-40 border-2 border-dashed border-black/10 rounded-xl bg-white/20 hover:bg-white/40 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      if (e.target.files?.length) handleAdditionalPhotosUpload(e.target.files);
                    }}
                  />
                  <span className="material-symbols-outlined text-on-surface-variant text-[32px]">photo_library</span>
                  <span className="text-sm font-medium text-on-surface-variant">Upload more 'Before' photos</span>
                  <span className="text-xs text-on-surface-variant opacity-70">Multiple files allowed</span>
                </label>

                {/* Thumbnails */}
                {additionalPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {additionalPhotos.map((photo, photoIdx) => (
                      <div key={photoIdx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-black/10 flex-shrink-0">
                        {photo.uploading ? (
                          <div className="w-full h-full bg-black/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                          </div>
                        ) : (
                          <>
                            <img
                              src={photo.url || ""}
                              alt={`Extra ${photoIdx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveAdditionalPhoto(photoIdx)}
                              className="absolute top-0 right-0 bg-black/60 text-white rounded-bl-lg w-5 h-5 flex items-center justify-center text-[10px]"
                            >
                              ✕
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Order Summary Card */}
        <div className="lg:col-span-4 relative">
          <div className="sticky top-20 flex flex-col gap-card-gap">
            <section className="bg-white/65 dark:bg-primary/65 backdrop-blur-xl border border-white/22 dark:border-white/10 rounded-xl p-6 shadow-sm">
              <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-primary dark:text-primary-fixed mb-6 border-b border-black/5 pb-4">
                Order Summary
              </h3>

              <div className="space-y-4 mb-6 pb-6 border-b border-black/5">
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1">Expected Due Date</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                      event
                    </span>
                    <input
                      required
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-white/50 border border-black/5 rounded-lg py-2.5 pl-10 pr-4 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase mb-1">Assign Artisan</label>
                  <select
                    value={artisanId}
                    onChange={(e) => setArtisanId(e.target.value)}
                    className="w-full bg-white/50 border border-black/5 rounded-lg py-2.5 px-4 text-sm"
                  >
                    <option value="">Auto assign / Select Artisan</option>
                    {artisans.map((art) => (
                      <option key={art.id} value={art.id}>{art.name} ({art.role})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase mb-1">Order Notes</label>
                  <textarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full bg-white/50 border border-black/5 rounded-lg py-2 px-3 text-sm h-20"
                    placeholder="e.g. Rush order requested."
                  />
                </div>
              </div>

              {/* Billing and Payments */}
              <div className="space-y-4">
                <h4 className="font-label-sm text-label-sm text-on-surface font-semibold mb-2">Payment Mode</h4>
                <div className="grid grid-cols-3 gap-2">
                  {["CASH", "UPI", "CARD"].map((mode) => (
                    <label
                      key={mode}
                      className={`border rounded-lg py-2 text-center cursor-pointer transition-all ${
                        paymentMode === mode
                          ? "border-primary bg-primary/10 text-primary font-semibold"
                          : "border-black/5 bg-white/50 text-on-surface-variant hover:bg-white/80"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_mode"
                        value={mode}
                        checked={paymentMode === mode}
                        onChange={() => setPaymentMode(mode)}
                        className="sr-only"
                      />
                      <span className="text-xs">{mode}</span>
                    </label>
                  ))}
                </div>

                {/* Per-item breakdown */}
                {(items.length > 1 || totalPairs > 1) && (
                  <div className="bg-white/30 rounded-lg p-3 space-y-1 border border-black/5 max-h-48 overflow-y-auto">
                    {items.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs text-on-surface-variant gap-2">
                        <span className="truncate">
                          {bulkMode ? `Line ${i + 1}` : `Pair #${i + 1}`} — {item.category || "Unset"}
                          {(item.qty || 1) > 1 ? ` × ${item.qty}` : ""}
                        </span>
                        <span>₹{((item.price || 0) * (item.qty || 1)).toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs font-semibold text-on-surface pt-1 border-t border-black/5">
                      <span>{totalPairs} pairs</span>
                      <span>₹{subtotal.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                )}

                {/* Pick & Drop (via Porter) Checkbox */}
                <div className="flex flex-col gap-2 p-3 bg-white/30 rounded-lg border border-black/5">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPorter}
                      onChange={(e) => setIsPorter(e.target.checked)}
                      className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-on-surface">Pick & Drop Service (via Porter)</span>
                      <span className="text-[10px] text-on-surface-variant">Adds courier fee to the bill & tracks in Logistics</span>
                    </div>
                  </label>
                  {isPorter && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5">
                      <span className="text-xs text-on-surface-variant">Porter Service Charge</span>
                      <div className="relative w-24">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-xs">₹</span>
                        <input
                          type="number"
                          value={porterCharge || ""}
                          onChange={(e) => setPorterCharge(Number(e.target.value))}
                          className="w-full bg-white/50 border border-black/5 rounded-md py-1 pl-5 pr-2 text-xs text-right focus:outline-none"
                          placeholder="150"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm text-on-surface">Subtotal</span>
                  <span className="font-semibold text-primary dark:text-primary-fixed">₹{subtotal.toLocaleString("en-IN")}</span>
                </div>

                {isPorter && (
                  <div className="flex justify-between items-center text-xs text-on-surface-variant bg-zinc-50 p-2 rounded border border-black/5">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">local_shipping</span>
                      Porter Service Active
                    </span>
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">PAID SEPARATELY</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-sm text-on-surface">Advance Paid</span>
                  <div className="relative w-24">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">₹</span>
                    <input
                      type="number"
                      value={advancePaid || ""}
                      onChange={(e) => setAdvancePaid(Number(e.target.value))}
                      className="w-full bg-white/50 border border-black/5 rounded-md py-1 pl-6 pr-2 text-sm text-right focus:outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-end pt-4 border-t border-black/5">
                  <span className="text-sm text-on-surface-variant">Balance Due</span>
                  <span className="font-numeral-xl text-numeral-xl text-primary dark:text-primary-fixed">
                    ₹{(subtotal - advancePaid).toLocaleString("en-IN")}
                  </span>
                </div>

                {/* Created By Info */}
                <div className="text-[10px] text-on-surface-variant font-bold text-center mt-2">
                  Order will be logged under: {currentUser}
                </div>

                <button
                  type="button"
                  onClick={handleFormSubmit}
                  disabled={isSubmitting || mainUploading || additionalPhotos.some((p) => p.uploading)}
                  className="w-full mt-2 bg-primary text-on-primary hover:bg-primary/95 transition-all py-4 rounded-xl font-label-sm text-label-sm font-semibold flex justify-center items-center gap-2 shadow-lg shadow-primary-container/20 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[20px]">save</span>
                  {isSubmitting ? "Saving..." : "Save Order"}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
