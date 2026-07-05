"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createOrder } from "@/app/actions/orders";
import { uploadImage } from "@/lib/upload";

const categories = [
  "Boots", "Sneakers", "Formal Shoe", "Heels", "Sandals", "Loafers", "Slippers", "Bags", "Other"
];

const availableServices = [
  { id: "srv_laundry", label: "Standard Laundry", price: 600 },
  { id: "srv_deepclean", label: "Premium Deep Clean", price: 1200 },
  { id: "srv_polish", label: "Shoe Polish", price: 300 },
  { id: "srv_waterproof", label: "Waterproofing", price: 500 },
  { id: "srv_stain", label: "Stain Removal", price: 400 },
  { id: "srv_odor", label: "Odor Treatment", price: 300 },
  { id: "srv_sole_p", label: "Sole Pasting", price: 800 },
  { id: "srv_sole_c", label: "Sole Change", price: 2000 },
  { id: "srv_heel_c", label: "Heel Change", price: 1500 },
  { id: "srv_heel_r", label: "Heel Repair", price: 1000 },
];

interface OrderItemState {
  category: string;
  brand: string;
  model: string;
  description: string;
  services: string[];
  photoFile: File | null;
  photoUrl?: string;
  uploading: boolean;
}

export default function NewOrderPage() {
  const router = useRouter();
  const [artisans, setArtisans] = useState<any[]>([]);

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
  const [orderPrice, setOrderPrice] = useState(0);
  const [advancePaid, setAdvancePaid] = useState(0);
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [dueDate, setDueDate] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [artisanId, setArtisanId] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Multi-item state
  const [items, setItems] = useState<OrderItemState[]>([
    {
      category: "",
      brand: "",
      model: "",
      description: "",
      services: [],
      photoFile: null,
      uploading: false,
    },
  ]);

  // Load artisans
  useEffect(() => {
    fetch("/api/staff")
      .then((res) => res.json())
      .then((data) => setArtisans(data.filter((s: any) => s.role === "ARTISAN" || s.role === "MANAGER")))
      .catch((err) => console.error("Error loading staff:", err));
  }, []);

  // Customer search
  useEffect(() => {
    if (customerSearch.trim().length > 1) {
      fetch(`/api/customers?search=${encodeURIComponent(customerSearch)}`)
        .then((res) => res.json())
        .then((data) => setSearchResults(data))
        .catch((err) => console.error(err));
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
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        category: "",
        brand: "",
        model: "",
        description: "",
        services: [],
        photoFile: null,
        uploading: false,
      },
    ]);
  };

  const handleItemChange = (index: number, field: keyof OrderItemState, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
    recalculatePrice(updated);
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
    recalculatePrice(updated);
  };

  const recalculatePrice = (updatedItems: OrderItemState[]) => {
    let total = 0;
    updatedItems.forEach((item) => {
      item.services.forEach((srvLabel) => {
        const matched = availableServices.find((s) => s.label === srvLabel);
        if (matched) total += matched.price;
      });
    });
    setOrderPrice(total);
  };

  const handleFileUpload = async (index: number, file: File) => {
    const updated = [...items];
    updated[index].uploading = true;
    updated[index].photoFile = file;
    setItems(updated);

    try {
      const publicUrl = await uploadImage(file, "order-photos");
      updated[index].photoUrl = publicUrl;
      console.log("Photo uploaded to Supabase:", publicUrl);
    } catch (err) {
      console.error("Supabase Storage upload failed, fallback used:", err);
      // fallback mock URL for local testing if no Supabase URL set
      updated[index].photoUrl = "https://images.unsplash.com/photo-1542291026-7eec264c27ff";
    } finally {
      updated[index].uploading = false;
      setItems([...updated]);
    }
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

    setIsSubmitting(true);

    const payload = {
      customer: {
        firstName: selectedCustomer.firstName,
        lastName: selectedCustomer.lastName,
        email: selectedCustomer.email || undefined,
        phone: selectedCustomer.phone,
        notes: selectedCustomer.notes || undefined,
      },
      order: {
        serviceType: items.length > 0 && items[0].services.length > 0 ? items[0].services[0] : orderType,
        itemType: items.map((i) => `${i.brand || ""} ${i.model || i.category}`).join(", "),
        price: orderPrice,
        dueDate: new Date(dueDate),
        notes: orderNotes,
        artisanId: artisanId || undefined,
      },
      items: items.map((i) => ({
        category: i.category,
        brand: i.brand,
        model: i.model,
        description: i.description,
        services: i.services,
        photoUrl: i.photoUrl,
      })),
      payment: {
        advancePaid,
        paymentMode,
      },
    };

    const res = await createOrder(payload);
    setIsSubmitting(false);

    if (res.success) {
      // Redirect to invoice page with auto-print flag
      router.push(`/invoices/${res.orderId}?print=1`);
    } else {
      alert("Error creating order: " + res.error);
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

          {/* Dynamic Items */}
          {items.map((item, itemIdx) => (
            <div key={itemIdx} className="bg-white/65 dark:bg-primary/65 backdrop-blur-xl border border-white/22 dark:border-white/10 rounded-xl p-8 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-black/5 pb-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary-container p-2 bg-primary-fixed/20 rounded-lg">
                    steps
                  </span>
                  <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-primary dark:text-primary-fixed">
                    Item #{itemIdx + 1}
                  </h2>
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const updated = items.filter((_, idx) => idx !== itemIdx);
                      setItems(updated);
                      recalculatePrice(updated);
                    }}
                    className="text-error font-medium hover:underline text-sm"
                  >
                    Remove Item
                  </button>
                )}
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

              {/* Service Selection */}
              <div>
                <label className="block text-sm font-medium text-on-surface mb-3">Select Services</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-surface-container-low rounded-xl border border-black/5">
                  {availableServices.map((service) => {
                    const isChecked = item.services.includes(service.label);
                    return (
                      <label key={service.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleServiceToggle(itemIdx, service.label)}
                          className="rounded text-primary focus:ring-primary border-black/10 w-4 h-4"
                        />
                        <div className="flex-1 flex justify-between text-sm">
                          <span className="font-medium">{service.label}</span>
                          <span className="text-on-surface-variant font-semibold">₹{service.price}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Upload Intake Photo */}
              <div>
                <label className="block text-sm font-medium text-on-surface mb-3">Upload Intake Photo</label>
                <div className="flex items-center gap-6">
                  <label className="w-full h-40 border-2 border-dashed border-black/10 dark:border-white/10 rounded-xl bg-white/30 hover:bg-white/50 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(itemIdx, file);
                      }}
                    />
                    <span className="material-symbols-outlined text-primary-container text-[28px]">
                      add_a_photo
                    </span>
                    <span className="text-sm font-medium text-primary">Click to upload intake image</span>
                    {item.uploading && <span className="text-xs text-on-surface-variant">Uploading...</span>}
                  </label>
                  {item.photoUrl && (
                    <div className="w-40 h-40 rounded-xl overflow-hidden border border-black/5 flex-shrink-0 relative">
                      <img src={item.photoUrl} alt="Uploaded intake preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddItem}
            className="w-full py-4 border-2 border-dashed border-primary-container/30 rounded-xl text-primary font-semibold flex items-center justify-center gap-2 hover:bg-primary-fixed/10 transition-colors"
          >
            <span className="material-symbols-outlined">add_circle</span> + Add Another Item
          </button>
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

                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm text-on-surface">Subtotal</span>
                  <span className="font-semibold text-primary dark:text-primary-fixed">₹{orderPrice}</span>
                </div>

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
                    ₹{orderPrice - advancePaid}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleFormSubmit}
                  disabled={isSubmitting}
                  className="w-full mt-4 bg-primary text-on-primary hover:bg-primary/95 transition-all py-4 rounded-xl font-label-sm text-label-sm font-semibold flex justify-center items-center gap-2 shadow-lg shadow-primary-container/20 disabled:opacity-50"
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
