"use client";

import React, { useState } from "react";
import { OrderStatus } from "@prisma/client";
import { GlassCard } from "@/components/ui/glass-card";
import { updateOrderStatus, assignArtisan, uploadProofPhoto, uploadMultipleProofPhotos, logReviewRequest, createInvoiceForOrder, deleteOrder, revertOrderToPending, updatePorterService, updateOrderDetails, addAddonToOrder, removeAddonFromOrder } from "@/app/actions/orders";
import { uploadImage } from "@/lib/upload";
import { normalizeIndianPhone } from "@/lib/whatsapp";
import Link from "next/link";
import { AddonsManager } from "@/components/invoices/addons-manager";

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
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [invoicePaymentMode, setInvoicePaymentMode] = useState("UPI");
  const [pickupByPorter, setPickupByPorter] = useState(order.pickupByPorter || false);
  const [dropByPorter, setDropByPorter] = useState(order.dropByPorter || false);
  const [updatingPorter, setUpdatingPorter] = useState(false);

  const getPorterLabel = (pickup: boolean, drop: boolean) => {
    if (pickup && drop) return "Porter Pickup & Drop";
    if (pickup) return "Porter Pickup / Self Drop";
    if (drop) return "Self Pickup / Porter Drop";
    return "Self Pickup & Self Drop";
  };

  const handlePorterChange = async (newPickup: boolean, newDrop: boolean) => {
    setPickupByPorter(newPickup);
    setDropByPorter(newDrop);
    setUpdatingPorter(true);
    const res = await updatePorterService(order.id, newPickup, newDrop);
    setUpdatingPorter(false);
    if (!res.success) {
      alert("Error updating delivery mode: " + res.error);
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editPrice, setEditPrice] = useState(Number(order.price));
  const [editDueDate, setEditDueDate] = useState(new Date(order.dueDate).toISOString().split('T')[0]);
  const [editNotes, setEditNotes] = useState(order.notes || "");
  const [savingEdit, setSavingEdit] = useState(false);

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    const res = await updateOrderDetails(order.id, editPrice, editDueDate, editNotes);
    setSavingEdit(false);
    if (res.success) {
      setIsEditing(false);
      window.location.reload();
    } else {
      alert("Error saving order details: " + res.error);
    }
  };

  const [isDeleting, setIsDeleting] = useState(false);
  const handleDeleteOrder = async () => {
    if (confirm("Are you sure you want to permanently delete this order? This will remove it from the database and Google Sheets.")) {
      setIsDeleting(true);
      const res = await deleteOrder(order.id);
      if (res.success) {
        window.location.href = "/orders";
      } else {
        alert("Error deleting order: " + res.error);
        setIsDeleting(false);
      }
    }
  };

  const customerName = order.customer.firstName;
  const phone = normalizeIndianPhone(order.customer.phone);

  // Generate WhatsApp links safely without throwing ReferenceError on server-side pre-rendering
  const appUrl = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || "https://mr-boot-crm.vercel.app");
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

  // WhatsApp "Order Ready" blast message
  const readyMsg = `Hi ${customerName}! 🎉 Great news — your ${order.itemType} is ready for pickup/delivery at *Mr. Boot*! Please let us know when you're coming or if you need pick & drop. 👟✨`;
  const waReadyUrl = `https://wa.me/${phone}?text=${encodeURIComponent(readyMsg)}`;

  const hasAfterPhoto = order.activityLogs.some(
    (log: any) => log.event === "After Photo uploaded as completion proof"
  );

  // Handle status transitions
  const handleStatusChange = async (newStatus: OrderStatus) => {
    if ((newStatus === OrderStatus.READY || newStatus === OrderStatus.DELIVERED) && !hasAfterPhoto) {
      alert("Error: You cannot close this entry or mark it as Ready/Delivered without uploading an After Photo (proof of completion). Please upload a proof photo first.");
      return;
    }
    setUpdatingStatus(true);
    const res = await updateOrderStatus(order.id, newStatus);
    setUpdatingStatus(false);
    if (res.success) {
      setStatus(newStatus);
      // Auto-offer the WhatsApp "ready" blast the moment an order goes READY
      if (
        newStatus === OrderStatus.READY &&
        phone &&
        confirm(`Order marked READY ✅\nSend WhatsApp pickup message to ${customerName}?`)
      ) {
        window.open(waReadyUrl, "_blank");
      }
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
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map((file) => uploadImage(file, "after-images"));
      const publicUrls = await Promise.all(uploadPromises);
      
      // Update item #1 photoUrl (or matching item)
      const itemId = order.items[0]?.id;
      if (itemId) {
        const res = await uploadMultipleProofPhotos(itemId, publicUrls, order.id);
        if (res.success) {
          window.location.reload();
        } else {
          alert("Error saving proof photos: " + res.error);
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
              <div className="flex gap-2">
                {!isEditing && (
                  <>
                    <button
                      onClick={handleDeleteOrder}
                      disabled={isDeleting}
                      className="px-3 py-1 bg-error/10 text-error font-semibold text-sm rounded-lg hover:bg-error hover:text-white flex items-center gap-1 shadow-sm transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-3 py-1 bg-primary text-on-primary font-semibold text-sm rounded-lg hover:opacity-90 flex items-center gap-1 shadow-sm transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                      Edit
                    </button>
                  </>
                )}
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
            </div>

            {/* Price, Due Date & Notes Section */}
            {!isEditing ? (
              <div className="flex flex-col gap-3 bg-zinc-50 rounded-xl p-4 border border-zinc-100/50">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-widest block font-bold mb-0.5">Price / Cost</span>
                    <span className="text-sm font-bold text-primary">₹{Number(order.price).toLocaleString("en-IN")}.00</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-widest block font-bold mb-0.5">Expected Due Date</span>
                    <span className="text-sm font-bold text-on-surface">{new Date(order.dueDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
                <div className="border-t border-black/5 pt-2 flex flex-col gap-1">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest block font-bold">Order Notes</span>
                  <span className="text-xs text-on-surface-variant leading-relaxed">
                    {order.notes || "No special instructions recorded."}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 bg-zinc-50 rounded-xl p-4 border border-zinc-100/50">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase tracking-widest block font-bold mb-1">Price (₹)</label>
                    <input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(Number(e.target.value))}
                      className="w-full bg-white border border-black/5 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-on-surface"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase tracking-widest block font-bold mb-1">Due Date</label>
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="w-full bg-white border border-black/5 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-on-surface"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase tracking-widest block font-bold mb-1">Order Notes</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full bg-white border border-black/5 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-on-surface h-16 resize-none"
                  />
                </div>
                <div className="flex gap-2 justify-end mt-1 border-t border-black/5 pt-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    disabled={savingEdit}
                    className="py-1 px-3 bg-zinc-200 hover:bg-zinc-300 text-on-surface text-[11px] font-bold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={savingEdit}
                    className="py-1 px-3 bg-primary text-on-primary text-[11px] font-bold rounded-lg hover:opacity-90 transition-opacity"
                  >
                    {savingEdit ? "Saving..." : "Save Details"}
                  </button>
                </div>
              </div>
            )}

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
            {(mainPhoto || (order.items[0]?.additionalPhotos && order.items[0].additionalPhotos.length > 0)) && (
              <div className="pt-4 border-t border-black/5">
                <h4 className="font-semibold text-sm mb-3 font-medium text-primary dark:text-primary-fixed uppercase tracking-wider">Intake & Proof Images:</h4>
                <div className="flex flex-wrap gap-4">
                  {mainPhoto && (
                    <div className="flex flex-col gap-1 items-center">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Main</span>
                      <div className="w-24 h-24 rounded-xl overflow-hidden border border-black/5 relative bg-white">
                        <img src={mainPhoto} alt="Intake shoe" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                  {order.items[0]?.additionalPhotos?.map((url: string, idx: number) => (
                    <div key={idx} className="flex flex-col gap-1 items-center">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Extra #{idx + 1}</span>
                      <div className="w-24 h-24 rounded-xl overflow-hidden border border-black/5 relative bg-white">
                        <img src={url} alt={`Additional ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Addons Section — after photos */}
            {(order.addons || []).length >= 0 && order.inventoryItems !== undefined || true ? (
              <AddonsManager
                orderId={order.id}
                existingAddons={(order.addons || []).map((a: any) => ({
                  id: a.id,
                  itemName: a.itemName,
                  qty: a.qty,
                  unitCost: Number(a.unitCost),
                  totalCost: Number(a.totalCost),
                }))}
                inventoryItems={(order.inventoryItems || []).map((i: any) => ({
                  id: i.id,
                  name: i.itemName || i.name,
                  unitCost: Number(i.unitCost),
                }))}
              />
            ) : null}
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

        {/* Logistics & Delivery */}
        <GlassCard>
          <h3 className="font-semibold text-sm mb-3 text-primary dark:text-primary-fixed uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">local_shipping</span>
            Logistics & Delivery
          </h3>
          <div className="flex flex-col gap-3">
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-1">
              Current: <span className="text-primary font-bold">{getPorterLabel(pickupByPorter, dropByPorter)}</span>
            </p>
            {/* Pickup row */}
            <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg hover:bg-black/5 transition-colors">
              <input
                type="checkbox"
                checked={pickupByPorter}
                onChange={(e) => handlePorterChange(e.target.checked, dropByPorter)}
                disabled={updatingPorter}
                className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-on-surface">Porter Pickup</span>
                <span className="text-[10px] text-on-surface-variant">Porter picks up from customer's address</span>
              </div>
            </label>
            {/* Drop row */}
            <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg hover:bg-black/5 transition-colors">
              <input
                type="checkbox"
                checked={dropByPorter}
                onChange={(e) => handlePorterChange(pickupByPorter, e.target.checked)}
                disabled={updatingPorter}
                className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-on-surface">Porter Drop</span>
                <span className="text-[10px] text-on-surface-variant">Porter delivers back to customer's address</span>
              </div>
            </label>
            {updatingPorter && (
              <p className="text-[10px] text-zinc-400 italic">Saving delivery mode...</p>
            )}
          </div>
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
                  Proof Photos (After Completion) <span className="text-error">*</span>
                </label>
              </div>
              <label className="w-full h-40 border-2 border-dashed border-black/10 rounded-xl bg-white/30 hover:bg-white/50 transition-colors flex flex-col items-center justify-center gap-3 cursor-pointer group relative overflow-hidden">
                <input
                  type="file"
                  accept="image/*"
                  multiple
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
                    {uploading ? "Uploading..." : "Click to upload after photos (multiple allowed)"}
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

            {/* WhatsApp Order Ready Blast — shown prominently when READY */}
            {status === OrderStatus.READY && (
              <a
                href={waReadyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold rounded-lg flex items-center justify-center gap-2 text-sm transition-colors shadow-md animate-pulse-once"
              >
                <span className="material-symbols-outlined text-[20px]">notifications_active</span>
                📦 Notify Customer — Order Ready!
              </a>
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

            {/* Undo to Pending */}
            {status !== OrderStatus.RECEIVED && (
              <button
                onClick={async () => {
                  if (confirm("Are you sure you want to revert this order back to RECEIVED / Pending?")) {
                    const res = await revertOrderToPending(order.id);
                    if (res.success) {
                      window.location.reload();
                    } else {
                      alert("Error reverting order: " + res.error);
                    }
                  }
                }}
                className="w-full py-2 border border-[#cb9e3f]/40 hover:bg-[#cb9e3f]/5 text-[#cb9e3f] text-center font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[14px]">undo</span>
                Undo to Pending
              </button>
            )}

            {/* Delete Order */}
            <button
              onClick={async () => {
                if (confirm("🚨 WARNING: Are you sure you want to delete this order? This will permanently remove the order, invoices, photos, and all logs. This action cannot be undone.")) {
                  const res = await deleteOrder(order.id);
                  if (res.success) {
                    window.location.href = "/orders";
                  } else {
                    alert("Error deleting order: " + res.error);
                  }
                }
              }}
              className="w-full py-2 border border-red-200 hover:bg-red-50 text-red-600 text-center font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 dark:border-red-900/30 dark:hover:bg-red-950/20"
            >
              <span className="material-symbols-outlined text-[14px]">delete</span>
              Delete Order
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
