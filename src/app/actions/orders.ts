"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { syncToSheet, deleteFromSheet } from "@/lib/sheets";
import { OrderStatus, Prisma } from "@prisma/client";
import { nanoid } from "nanoid";

type Tx = Prisma.TransactionClient;

function fail(error: any) {
  return { success: false as const, error: error?.message || "Something went wrong" };
}

function toMoney(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${field} must be a positive number`);
  return Math.round(n * 100) / 100;
}

function toQty(value: unknown): number {
  const n = Math.floor(Number(value ?? 1));
  if (!Number.isFinite(n) || n < 1) return 1;
  if (n > 500) throw new Error("Quantity per line can't be more than 500");
  return n;
}

function toDate(value: unknown, field: string): Date {
  const d = new Date(value as any);
  if (isNaN(d.getTime())) throw new Error(`${field} is not a valid date`);
  return d;
}

/** Next invoice number MB-001, MB-002… based on the highest number ever issued. */
async function nextInvoiceNumber(tx: Tx): Promise<string> {
  const rows = await tx.$queryRaw<Array<{ max: number | null }>>`
    SELECT MAX(CAST(SUBSTRING("invoiceNumber" FROM 4) AS INTEGER)) AS max
    FROM invoices
    WHERE "invoiceNumber" ~ '^MB-[0-9]+$'
  `;
  const next = Number(rows[0]?.max ?? 0) + 1;
  return `MB-${String(next).padStart(3, "0")}`;
}

/** Runs fn in a transaction, retrying if two invoices raced for the same number. */
async function withInvoiceRetry<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(fn, { timeout: 15000 });
    } catch (err) {
      const isUniqueClash =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002" &&
        String(err.meta?.target ?? "").includes("invoiceNumber");
      if (!isUniqueClash || attempt >= 4) throw err;
    }
  }
}

/** Single source of truth for invoice totals: order price + add-ons − advance. */
async function recalcInvoice(tx: Tx, orderId: string) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { invoices: true, addons: true },
  });
  if (!order || order.invoices.length === 0) return null;
  const addonTotal = order.addons.reduce((sum, a) => sum + Number(a.totalCost), 0);
  const amount = Number(order.price) + addonTotal;
  const invoice = order.invoices[0];
  return tx.invoice.update({
    where: { id: invoice.id },
    data: { amount, balanceDue: amount - Number(invoice.advancePaid) },
  });
}

function revalidateOrder(orderId: string) {
  revalidatePath(`/orders/${orderId}`);
  revalidatePath(`/invoices/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/");
}

export async function createOrder(formData: {
  customer: {
    id?: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
    notes?: string;
  };
  order: {
    serviceType: string;
    itemType: string;
    material?: string;
    price: number;
    dueDate: Date;
    notes?: string;
    artisanId?: string;
    pickupByPorter?: boolean;
    dropByPorter?: boolean;
    status?: OrderStatus;
  };
  items: Array<{
    category: string;
    brand?: string;
    model?: string;
    description?: string;
    services: string[];
    price?: number;
    quantity?: number;
    photoUrl?: string;
    additionalPhotos?: string[];
  }>;
  payment: {
    advancePaid: number;
    paymentMode: string;
  };
  createdBy?: string;
}) {
  try {
    const user = await requireUser();
    const actor = user.email;

    const phone = (formData.customer.phone || "").trim();
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) throw new Error("Please enter a valid 10-digit phone number");
    const firstName = (formData.customer.firstName || "").trim();
    if (!firstName) throw new Error("Customer name is required");

    const price = toMoney(formData.order.price, "Price");
    const advancePaid = toMoney(formData.payment.advancePaid || 0, "Advance paid");
    if (advancePaid > price) throw new Error("Advance paid cannot be more than the order total");
    const dueDate = toDate(formData.order.dueDate, "Due date");
    const status =
      formData.order.status && Object.values(OrderStatus).includes(formData.order.status)
        ? formData.order.status
        : OrderStatus.RECEIVED;
    const last10 = phoneDigits.slice(-10);

    const result = await withInvoiceRetry(async (tx) => {
      // 1. Find the customer by phone (ignoring spaces / +91), or create them.
      // Prefer the exact customer picked in the UI (two people can share a phone number).
      let customer = formData.customer.id
        ? await tx.customer.findUnique({ where: { id: formData.customer.id } })
        : null;
      if (!customer) {
        customer = await tx.customer.findFirst({
          where: { OR: [{ phone }, { phone: { endsWith: last10 } }] },
          orderBy: { createdAt: "asc" },
        });
      }
      let customerCreated = false;
      if (!customer) {
        customer = await tx.customer.create({
          data: {
            firstName,
            lastName: (formData.customer.lastName || "").trim(),
            email: formData.customer.email || null,
            phone,
            notes: formData.customer.notes || null,
          },
        });
        customerCreated = true;
      }

      // 2. Order + items
      const order = await tx.order.create({
        data: {
          status,
          serviceType: formData.order.serviceType,
          itemType: formData.order.itemType,
          material: formData.order.material || null,
          price,
          dueDate,
          customerId: customer.id,
          artisanId: formData.order.artisanId || null,
          notes: formData.order.notes ? `${formData.order.notes}\n\nCreated By: ${actor}` : `Created By: ${actor}`,
          pickupByPorter: !!formData.order.pickupByPorter,
          dropByPorter: !!formData.order.dropByPorter,
          items: {
            create: formData.items.map((item) => ({
              category: item.category,
              brand: item.brand || null,
              model: item.model || null,
              description: item.description || null,
              services: item.services || [],
              quantity: toQty(item.quantity),
              // Single pair: the item price is the order price. Otherwise the price per pair.
              price:
                formData.items.length === 1 && toQty(item.quantity) === 1
                  ? price
                  : item.price != null && Number.isFinite(Number(item.price))
                  ? toMoney(item.price, "Item price")
                  : null,
              photoUrl: item.photoUrl || null,
              additionalPhotos: item.additionalPhotos || [],
            })),
          },
        },
        include: { items: true },
      });

      // 3. Invoice
      const invoice = await tx.invoice.create({
        data: {
          orderId: order.id,
          invoiceNumber: await nextInvoiceNumber(tx),
          amount: price,
          advancePaid,
          balanceDue: price - advancePaid,
          paymentMode: formData.payment.paymentMode || "CASH",
        },
      });

      // 4. Public tracking link + 5. activity log
      await tx.publicOrderLink.create({ data: { orderId: order.id, token: nanoid(12) } });
      await tx.activityLog.create({
        data: { orderId: order.id, event: "Order Intake Completed", actor },
      });

      return { customer, customerCreated, order, invoice };
    });

    // Sheet sync only after the DB commit succeeded.
    if (result.customerCreated) await syncToSheet({ table: "customers", data: result.customer });
    await syncToSheet({ table: "orders", data: result.order });
    await syncToSheet({ table: "invoices", data: result.invoice });

    revalidatePath("/orders");
    revalidatePath("/customers");
    revalidatePath("/billing");
    revalidatePath("/");
    return { success: true as const, orderId: result.order.id };
  } catch (error: any) {
    console.error("Failed to create order:", error);
    return fail(error);
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus, _actorEmail?: string) {
  try {
    const { email: actor } = await requireUser();
    if (!Object.values(OrderStatus).includes(status)) throw new Error("Invalid status");

    const order = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: orderId },
        data: { status },
        include: { customer: true },
      });
      await tx.activityLog.create({
        data: { orderId, event: `Order Status updated to ${status}`, actor },
      });
      if (status === OrderStatus.READY) {
        await tx.notification.create({
          data: {
            title: "Order Ready for Pickup",
            message: `Order #${orderId.slice(-6).toUpperCase()} for ${order.customer.firstName} is completed and ready for pickup.`,
            orderId,
          },
        });
      }
      return order;
    });

    await syncToSheet({ table: "orders", data: order });
    revalidateOrder(orderId);
    revalidatePath("/logistics");
    return { success: true as const };
  } catch (error: any) {
    console.error("Failed to update status:", error);
    return fail(error);
  }
}

export async function assignArtisan(orderId: string, artisanId: string, _actorEmail?: string) {
  try {
    const { email: actor } = await requireUser();
    const artisan = artisanId ? await prisma.staff.findUnique({ where: { id: artisanId } }) : null;
    if (artisanId && !artisan) throw new Error("Artisan not found");

    const order = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({ where: { id: orderId }, data: { artisanId: artisan?.id ?? null } });
      await tx.activityLog.create({
        data: { orderId, event: artisan ? `Assigned artisan: ${artisan.name}` : "Artisan unassigned", actor },
      });
      return order;
    });

    await syncToSheet({ table: "orders", data: order });
    revalidateOrder(orderId);
    return { success: true as const };
  } catch (error: any) {
    console.error("Failed to assign artisan:", error);
    return fail(error);
  }
}

async function saveProofPhotos(orderItemId: string, photoUrls: string[], orderId: string) {
  const { email: actor } = await requireUser();
  if (photoUrls.length === 0) throw new Error("No photo URLs provided");

  const item = await prisma.orderItem.findFirst({
    where: { id: orderItemId, orderId },
    select: { photoUrl: true, additionalPhotos: true },
  });
  if (!item) throw new Error("Order item not found");

  // Keep the intake photo in the gallery; the first new photo becomes the main (after) photo.
  const gallery = [...item.additionalPhotos];
  if (item.photoUrl && !gallery.includes(item.photoUrl)) gallery.push(item.photoUrl);
  for (const url of photoUrls.slice(1)) if (!gallery.includes(url)) gallery.push(url);

  await prisma.$transaction([
    prisma.orderItem.update({
      where: { id: orderItemId },
      data: { photoUrl: photoUrls[0], additionalPhotos: gallery },
    }),
    prisma.activityLog.create({
      data: { orderId, event: "After Photo uploaded as completion proof", actor },
    }),
  ]);
  revalidateOrder(orderId);
}

export async function uploadProofPhoto(orderItemId: string, photoUrl: string, orderId: string, _actorEmail?: string) {
  try {
    await saveProofPhotos(orderItemId, [photoUrl], orderId);
    return { success: true as const };
  } catch (error: any) {
    console.error("Failed to upload proof photo:", error);
    return fail(error);
  }
}

export async function uploadMultipleProofPhotos(orderItemId: string, photoUrls: string[], orderId: string, _actorEmail?: string) {
  try {
    await saveProofPhotos(orderItemId, photoUrls, orderId);
    return { success: true as const };
  } catch (error: any) {
    console.error("Failed to upload proof photos:", error);
    return fail(error);
  }
}

export async function logReviewRequest(orderId: string, _actorEmail?: string) {
  try {
    const { email: actor } = await requireUser();
    await prisma.activityLog.create({
      data: { orderId, event: "Review Request sent to customer via WhatsApp", actor },
    });
    revalidatePath(`/orders/${orderId}`);
    return { success: true as const };
  } catch (error: any) {
    console.error("Failed to log review request:", error);
    return fail(error);
  }
}

export async function createInvoiceForOrder(orderId: string, paymentMode: string = "UPI") {
  try {
    const { email: actor } = await requireUser();

    const invoice = await withInvoiceRetry(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { invoices: true, addons: true },
      });
      if (!order) throw new Error("Order not found");
      if (order.invoices.length > 0) throw new Error("Invoice already exists for this order");

      const amount = Number(order.price) + order.addons.reduce((s, a) => s + Number(a.totalCost), 0);
      const invoice = await tx.invoice.create({
        data: {
          orderId: order.id,
          invoiceNumber: await nextInvoiceNumber(tx),
          amount,
          advancePaid: 0,
          balanceDue: amount,
          paymentMode,
        },
      });
      await tx.activityLog.create({
        data: { orderId, event: `Invoice ${invoice.invoiceNumber} generated`, actor },
      });
      return invoice;
    });

    await syncToSheet({ table: "invoices", data: invoice });
    revalidateOrder(orderId);
    revalidatePath("/billing");
    return { success: true as const, invoice: { id: invoice.id, invoiceNumber: invoice.invoiceNumber } };
  } catch (error: any) {
    console.error("Failed to generate invoice:", error);
    return fail(error);
  }
}

export async function revertOrderToPending(orderId: string) {
  try {
    const { email: actor } = await requireUser();
    const order = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.RECEIVED },
      });
      await tx.activityLog.create({
        data: { orderId, event: "Order status reverted to Pending (RECEIVED)", actor },
      });
      return order;
    });

    await syncToSheet({ table: "orders", data: order });
    revalidateOrder(orderId);
    return { success: true as const };
  } catch (error: any) {
    console.error("Failed to revert order status:", error);
    return fail(error);
  }
}

export async function updatePorterService(
  orderId: string,
  pickupByPorter: boolean,
  dropByPorter: boolean,
  _actorEmail?: string
) {
  try {
    const { email: actor } = await requireUser();

    let porterLabel = "Self Pickup & Self Drop";
    if (pickupByPorter && dropByPorter) porterLabel = "Porter Pickup & Porter Drop";
    else if (pickupByPorter) porterLabel = "Porter Pickup / Self Drop";
    else if (dropByPorter) porterLabel = "Self Pickup / Porter Drop";

    const order = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: orderId },
        data: { pickupByPorter, dropByPorter },
      });
      await tx.activityLog.create({
        data: { orderId, event: `Delivery mode updated: ${porterLabel}`, actor },
      });
      return order;
    });

    await syncToSheet({ table: "orders", data: order });
    revalidateOrder(orderId);
    revalidatePath("/logistics");
    return { success: true as const };
  } catch (error: any) {
    console.error("Failed to update Porter service:", error);
    return fail(error);
  }
}

// Kept for backwards compatibility.
export async function togglePorterService(orderId: string, isPorter: boolean, _porterCharge?: number, _actorEmail?: string) {
  return updatePorterService(orderId, isPorter, isPorter);
}

export async function updateOrderDetails(orderId: string, price: number, dueDate: string, notes: string) {
  try {
    const { email: actor } = await requireUser();
    const newPrice = toMoney(price, "Price");
    const newDue = toDate(dueDate, "Due date");

    const order = await prisma.$transaction(async (tx) => {
      const before = await tx.order.findUnique({ where: { id: orderId } });
      if (!before) throw new Error("Order not found");
      const order = await tx.order.update({
        where: { id: orderId },
        data: { price: newPrice, dueDate: newDue, notes },
      });
      const items = await tx.orderItem.findMany({ where: { orderId }, select: { id: true, quantity: true } });
      if (items.length === 1 && items[0].quantity === 1) {
        await tx.orderItem.update({ where: { id: items[0].id }, data: { price: newPrice } });
      }
      // Includes add-ons — previously this reset the bill to the base price only.
      const invoice = await recalcInvoice(tx, orderId);
      const changes: string[] = [];
      if (Number(before.price) !== newPrice) changes.push(`price ₹${Number(before.price)} → ₹${newPrice}`);
      if (before.dueDate.getTime() !== newDue.getTime()) changes.push("due date");
      if ((before.notes || "") !== (notes || "")) changes.push("notes");
      if (changes.length) {
        await tx.activityLog.create({
          data: { orderId, event: `Order details edited: ${changes.join(", ")}`, actor },
        });
      }
      return { order, invoice };
    });

    await syncToSheet({ table: "orders", data: order.order });
    if (order.invoice) await syncToSheet({ table: "invoices", data: order.invoice });
    revalidateOrder(orderId);
    revalidatePath("/billing");
    return { success: true as const };
  } catch (error: any) {
    console.error("Failed to update order details:", error);
    return fail(error);
  }
}

export async function addAddonToOrder(orderId: string, itemName: string, qty: number, unitCost: number) {
  try {
    const { email: actor } = await requireUser();
    const name = (itemName || "").trim();
    if (!name) throw new Error("Add-on name is required");
    const quantity = Math.floor(Number(qty));
    if (!Number.isFinite(quantity) || quantity < 1) throw new Error("Quantity must be at least 1");
    const cost = toMoney(unitCost, "Unit cost");

    const { addon, invoice } = await prisma.$transaction(async (tx) => {
      const addon = await tx.orderAddon.create({
        data: { orderId, itemName: name, qty: quantity, unitCost: cost, totalCost: quantity * cost },
      });
      const invoice = await recalcInvoice(tx, orderId);
      await tx.activityLog.create({
        data: { orderId, event: `Add-on added: ${name} × ${quantity} (₹${quantity * cost})`, actor },
      });
      return { addon, invoice };
    });

    if (invoice) await syncToSheet({ table: "invoices", data: invoice });
    revalidateOrder(orderId);
    revalidatePath("/billing");
    return { success: true as const, addon: { id: addon.id } };
  } catch (error: any) {
    console.error("Failed to add addon:", error);
    return fail(error);
  }
}

export async function removeAddonFromOrder(addonId: string, orderId: string) {
  try {
    const { email: actor } = await requireUser();
    const invoice = await prisma.$transaction(async (tx) => {
      const addon = await tx.orderAddon.findFirst({ where: { id: addonId, orderId } });
      if (!addon) throw new Error("Add-on not found");
      await tx.orderAddon.delete({ where: { id: addonId } });
      const invoice = await recalcInvoice(tx, orderId);
      await tx.activityLog.create({
        data: { orderId, event: `Add-on removed: ${addon.itemName}`, actor },
      });
      return invoice;
    });

    if (invoice) await syncToSheet({ table: "invoices", data: invoice });
    revalidateOrder(orderId);
    revalidatePath("/billing");
    return { success: true as const };
  } catch (error: any) {
    console.error("Failed to remove addon:", error);
    return fail(error);
  }
}

export async function deleteOrder(orderId: string) {
  try {
    await requireUser();
    const invoices = await prisma.invoice.findMany({ where: { orderId }, select: { id: true } });

    // Delete from the DB first (cascades items, invoices, links, logs, add-ons)…
    await prisma.$transaction([
      prisma.notification.deleteMany({ where: { orderId } }),
      prisma.order.delete({ where: { id: orderId } }),
    ]);

    // …then clean the sheet. A sheet failure must not leave the order half-deleted.
    for (const inv of invoices) await deleteFromSheet({ table: "invoices", id: inv.id }).catch(() => {});
    await deleteFromSheet({ table: "orders", id: orderId }).catch(() => {});

    revalidatePath("/orders");
    revalidatePath("/billing");
    revalidatePath("/");
    return { success: true as const };
  } catch (err: any) {
    console.error("Error deleting order:", err);
    return fail(err);
  }
}

/** Record money received against an order's bill (e.g. balance paid at pickup). */
export async function recordPayment(orderId: string, amount: number, paymentMode: string) {
  try {
    const { email: actor } = await requireUser();
    const paid = toMoney(amount, "Amount");
    if (paid <= 0) throw new Error("Amount must be more than ₹0");
    const mode = ["CASH", "UPI", "CARD"].includes(paymentMode) ? paymentMode : "CASH";

    const invoice = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({ where: { orderId }, orderBy: { createdAt: "asc" } });
      if (!invoice) throw new Error("Generate a bill for this order first");
      const balance = Number(invoice.balanceDue);
      if (paid > balance + 0.001) throw new Error(`Amount is more than the balance due (₹${balance})`);
      const advancePaid = Number(invoice.advancePaid) + paid;
      const updated = await tx.invoice.update({
        where: { id: invoice.id },
        data: { advancePaid, balanceDue: Number(invoice.amount) - advancePaid, paymentMode: mode },
      });
      await tx.activityLog.create({
        data: {
          orderId,
          event: `Payment received: ₹${paid} via ${mode}${Number(updated.balanceDue) <= 0 ? " (fully paid)" : ` (₹${Number(updated.balanceDue)} still due)`}`,
          actor,
        },
      });
      return updated;
    });

    await syncToSheet({ table: "invoices", data: invoice });
    revalidateOrder(orderId);
    revalidatePath("/billing");
    revalidatePath("/financials");
    return { success: true as const };
  } catch (error: any) {
    console.error("Failed to record payment:", error);
    return fail(error);
  }
}
