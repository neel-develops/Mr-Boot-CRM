"use client";

import React, { useState } from "react";
import { OrderStatus } from "@prisma/client";
import { GlassCard } from "@/components/ui/glass-card";
import { updateOrderStatus, assignArtisan, uploadProofPhoto, logReviewRequest, createInvoiceForOrder } from "@/app/actions/orders";
import { uploadImage } from "@/lib/upload";
import Link from "next/link";

interface OrderDetailWorkspaceProps {
  order: any;
  staff: any[];
  settings: any;
}

export const OrderDetailWorkspace: React.FC<OrderDetailWorkspaceProps> = ({
  order: initialOrder,
  staff,
  settings,
}) => {
  const [order, setOrder] = useState(initialOrder);
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [artisanId, setArtisanId] = useState(order.artisanId || "");
  const [uploading, setUploading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [invoicePaymentMode, setInvoicePaymentMode] = useState("UPI");
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  const customerName = order.customer.firstName;
  const phone = order.customer.phone.replace(/[^0-9]/g, "");

  // Generate WhatsApp links safely without throwing ReferenceError on server-side pre-rendering
  const appUrl = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
  const trackingLink = `${appUrl}/track/${order.publicOrderLinks[0]?.token || ""}`;

  const formattedBillMsg = settings.billReadyTemplate
    .replace("{{customer_first_name}}", customerName)
    .replace("{{invoice_pdf_or_track_link}}", trackingLink);

  const formattedReviewMsg = settings.reviewRequestTemplate
    .replace("{{customer_first_name}}", customerName)
    .replace("{{item_type}}", order.itemType)
    .replace("{{google_review_link}}", settings.googleReviewLink);

  const waBillUrl = `https://wa.me/${phone}?text=${encodeURIComponent(formattedBillMsg)}`;
  const waReviewUrl = `https://wa.me/${phone}?text=${encodeURIComponent(formattedReviewMsg)}`;

  // Handle status transitions
  const handleStatusChange = async (newStatus: OrderStatus) => {
    setUpdatingStatus(true);
    const res = await updateOrderStatus(order.id, newStatus);
    setUpdatingStatus(false);
    if (res.success) {
      setStatus(newStatus);
      // Reload order data to update log
      window.location.reload();
    } else {
      alert("Error changing status: " + res.error);
    }
  };

  // Handle artisan updates
  const handleArtisanChange = async (newArtisanId: string) => {
    setArtisanId(newArtisanId);
    if (!newArtisanId) return;
    const res = await assignArtisan(order.id, newArtisanId);
    if (res.success) {
      window.location.reload();
    } else {
      alert("Error assigning artisan: " + res.error);
    }
  };

  // Handle after photo upload (proof of completion)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const publicUrl = await uploadImage(file, "order-photos");
      // Update item #1 photoUrl (or matching item)
      const itemId = order.items[0]?.id;
      if (itemId) {
        const res = await uploadProofPhoto(itemId, publicUrl, order.id);
        if (res.success) {
          window.location.reload();
        } else {
          alert("Error saving proof photo: " + res.error);
        }
      }
    } catch (err: any) {
      alert("Supabase upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleReviewTrigger = async () => {
    // Log review_requested in activity log
    await logReviewRequest(order.id);
    // Open wa.me in new window
    window.open(waReviewUrl, "_blank");
    // Refresh to show log
    window.location.reload();
  };

  const mainPhoto = order.items[0]?.photoUrl;
  const isInvoiceGenerated = order.invoices.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter w-full">
      {/* Left Column: Order details & logs */}
      <div className="lg:col-span-7 flex flex-col gap-card-gap">
        {/* Order Details Header */}
        <GlassCard className="relative overflow-hidden">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-outline uppercase tracking-wider mb-1">
                  Order #{order.id.slice(-8).toUpperCase()}
                </p>
                <h3 className="font-headline-lg text-body-md font-semibold text-primary dark:text-primary-fixed">
                  {order.itemType}
                </h3>
                <p className="text-on-surface-variant text-sm mt-1">
                  Category: <span className="font-semibold text-on-surface">{order.items[0]?.category || "Shoe Care"}</span>
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full font-label-sm text-label-sm border ${
                  status === OrderStatus.DELIVERED
                    ? "bg-[#e1dfdc] text-[#636360] border-black/5"
                    : status === OrderStatus.READY
                    ? "bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9] status-pulse"
                    : "bg-[#ffdea4]/20 text-[#cb9e3f] border-[#cb9e3f]/20"
                }`}
              >
                {status.replace("_", " ")}
              </span>
            </div>

            {/* Services details */}
            <div className="border-t border-black/5 pt-4">
              <h4 className="font-semibold text-sm mb-3">Intake Services & Checklist:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {order.items[0]?.services.map((srv: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 p-3 bg-white/30 rounded-lg border border-black/5">
                    <span className="material-symbols-outlined text-primary-container text-[18px]">
                      check_circle
                    </span>
                    <span className="text-sm font-medium">{srv}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Photo List */}
            {mainPhoto && (
              <div className="pt-4 border-t border-black/5">
                <h4 className="font-semibold text-sm mb-3">Intake & Proof Images:</h4>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  <div className="w-24 h-24 rounded-lg overflow-hidden border border-black/5 relative">
                    <img src={mainPhoto} alt="Intake shoe" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Activity Logs timeline */}
        <GlassCard>
          <h3 className="font-label-sm text-label-sm text-on-surface-variant mb-6 uppercase tracking-widest">
            Activity Log & Timeline
          </h3>
          <div className="relative pl-4 space-y-6 before:absolute before:inset-y-0 before:left-5 before:w-px before:bg-black/5">
            {order.activityLogs.map((log: any, idx: number) => (
              <div key={log.id} className="relative flex gap-4">
                <div className="absolute -left-6 w-3 h-3 rounded-full bg-primary border-2 border-white flex items-center justify-center top-1.5 z-10"></div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-on-surface">{log.event}</p>
                  <p className="text-xs text-on-surface-variant/80 mt-0.5">
                    {new Date(log.timestamp).toLocaleString("en-IN")} • Actor: {log.actor}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Right Column: Artisan select & fulfillment workspace */}
      <div className="lg:col-span-5 flex flex-col gap-card-gap">
        {/* Artisan Assignment */}
        <GlassCard>
          <h3 className="font-semibold text-sm mb-3 text-primary dark:text-primary-fixed uppercase tracking-wider">
            Assign Artisan
          </h3>
          <select
            value={artisanId}
            onChange={(e) => handleArtisanChange(e.target.value)}
            className="w-full bg-white/50 border border-black/5 rounded-lg py-2.5 px-4 text-sm focus:outline-none"
          >
            <option value="">Unassigned</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} ({member.role})
              </option>
            ))}
          </select>
        </GlassCard>

        {/* Fulfillment Workspace */}
        <GlassCard className="flex flex-col flex-1 justify-between">
          <div>
            <div className="mb-6 pb-6 border-b border-black/5">
              <h3 className="font-headline-lg text-[20px] font-semibold text-on-surface mb-2">
                Fulfillment Workspace
              </h3>
              <p className="text-sm text-on-surface-variant">
                Transition order status and upload a proof photo to complete the fulfillment workflow.
              </p>
            </div>

            {/* Proof Photo Upload */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <label className="font-label-sm text-label-sm text-on-surface font-semibold flex items-center gap-1.5">
                  Proof Photo (After Completion) <span className="text-error">*</span>
                </label>
              </div>
              <label className="w-full h-40 border-2 border-dashed border-black/10 rounded-xl bg-white/30 hover:bg-white/50 transition-colors flex flex-col items-center justify-center gap-3 cursor-pointer group relative overflow-hidden">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="sr-only"
                  disabled={uploading}
                />
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-primary-container">
                    add_a_photo
                  </span>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-on-surface">
                    {uploading ? "Uploading..." : "Click to upload proof photo"}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-1">JPEG, PNG up to 5MB</p>
                </div>
              </label>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3 mt-auto">
            {/* Status change actions */}
            {status === OrderStatus.RECEIVED && (
              <button
                onClick={() => handleStatusChange(OrderStatus.IN_PROGRESS)}
                disabled={updatingStatus}
                className="w-full py-3 bg-primary text-on-primary font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                Mark as In Progress
              </button>
            )}

            {status === OrderStatus.IN_PROGRESS && (
              <button
                onClick={() => handleStatusChange(OrderStatus.READY)}
                disabled={updatingStatus}
                className="w-full py-3 bg-primary text-on-primary font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                Mark as Ready for Pickup
              </button>
            )}

            {status === OrderStatus.READY && (
              <button
                onClick={() => handleStatusChange(OrderStatus.DELIVERED)}
                disabled={updatingStatus}
                className="w-full py-3 bg-primary text-on-primary font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                Mark as Delivered & Closed
              </button>
            )}

            {/* Manual Invoice Generation if missing */}
            {!isInvoiceGenerated && (
              <div className="p-4 bg-error/5 border border-error/20 rounded-xl flex flex-col gap-3 mb-2 mt-4">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-error uppercase tracking-wider">No Bill / Invoice Found</span>
                  <span className="text-xs text-on-surface-variant mt-0.5">Generate a bill to activate payment details and Send Bill triggers.</span>
                </div>
                <div className="flex gap-2 items-center">
                  <select
                    value={invoicePaymentMode}
                    onChange={(e) => setInvoicePaymentMode(e.target.value)}
                    className="bg-white/70 border border-black/5 rounded-lg py-1.5 px-3 text-xs focus:outline-none flex-1 dark:bg-zinc-800 dark:border-zinc-700 text-on-surface"
                  >
                    <option value="UPI">UPI</option>
                    <option value="CASH">CASH</option>
                    <option value="CARD">CARD</option>
                  </select>
                  <button
                    onClick={async () => {
                      setGeneratingInvoice(true);
                      const res = await createInvoiceForOrder(order.id, invoicePaymentMode);
                      setGeneratingInvoice(false);
                      if (res.success) {
                        window.location.reload();
                      } else {
                        alert("Failed to generate invoice: " + res.error);
                      }
                    }}
                    disabled={generatingInvoice}
                    className="py-1.5 px-4 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
                  >
                    {generatingInvoice ? "Generating..." : "Generate Bill"}
                  </button>
                </div>
              </div>
            )}

            {/* TWO distinct WhatsApp Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-4 border-t border-black/5">
              {/* Button 1: Send Bill */}
              <a
                href={isInvoiceGenerated ? waBillUrl : "#"}
                onClick={(e) => {
                  if (!isInvoiceGenerated) {
                    e.preventDefault();
                    alert("Please generate an invoice first.");
                  }
                }}
                target="_blank"
                rel="noopener noreferrer"
                className={`py-2.5 px-3 rounded-lg text-center flex items-center justify-center gap-2 text-xs font-semibold shadow-sm transition-colors ${
                  isInvoiceGenerated
                    ? "bg-[#25D366] text-white hover:bg-[#128C7E]"
                    : "bg-surface-container-high text-outline-variant cursor-not-allowed"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">receipt</span>
                Send Bill
              </a>

              {/* Button 2: Request Review */}
              <button
                onClick={handleReviewTrigger}
                disabled={status !== OrderStatus.DELIVERED}
                className={`py-2.5 px-3 rounded-lg text-center flex items-center justify-center gap-2 text-xs font-semibold transition-colors ${
                  status === OrderStatus.DELIVERED
                    ? "bg-primary text-on-primary hover:opacity-90"
                    : "bg-surface-container-high text-outline-variant cursor-not-allowed"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">star</span>
                Request Review
              </button>
            </div>

            {/* Invoice Print view redirection */}
            {isInvoiceGenerated && (
              <Link
                href={`/invoices/${order.id}`}
                className="w-full py-2 border border-black/5 hover:bg-black/5 text-primary text-center font-medium text-xs rounded-lg transition-colors"
              >
                View / Print Premium Invoice
              </Link>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
