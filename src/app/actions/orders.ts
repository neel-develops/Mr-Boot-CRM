"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { syncToSheet, deleteFromSheet } from "@/lib/sheets";
import { OrderStatus, Role } from "@prisma/client";
import { nanoid } from "nanoid";

async function generateSequentialInvoiceNumber() {
  const latestInvoice = await prisma.invoice.findFirst({
    orderBy: { createdAt: "desc" },
    select: { invoiceNumber: true },
  });

  let nextNum = 1;
  if (latestInvoice) {
    const match = latestInvoice.invoiceNumber.match(/^MB-(\d+)$/i);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  // Safety loop: verify candidate doesn't exist (in case of manual changes or deletion gaps)
  while (true) {
    const candidate = `MB-${String(nextNum).padStart(3, "0")}`;
    const existing = await prisma.invoice.findUnique({
      where: { invoiceNumber: candidate },
      select: { id: true },
    });
    if (!existing) {
      return candidate;
    }
    nextNum++;
  }
}

export async function createOrder(formData: {
  customer: {
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
    // 1. Find or create customer
    let customer = await prisma.customer.findFirst({
      where: { phone: formData.customer.phone },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          firstName: formData.customer.firstName,
          lastName: formData.customer.lastName,
          email: formData.customer.email || null,
          phone: formData.customer.phone,
          notes: formData.customer.notes || null,
        },
      });
      // Sync Customer to Sheet
      syncToSheet({ table: "customers", data: customer });
    }

    // 2. Create the Order
    const order = await prisma.order.create({
      data: {
        status: formData.order.status || OrderStatus.RECEIVED,
        serviceType: formData.order.serviceType,
        itemType: formData.order.itemType,
        material: formData.order.material || null,
        price: formData.order.price,
        dueDate: new Date(formData.order.dueDate),
        customerId: customer.id,
        artisanId: formData.order.artisanId || null,
        notes: formData.order.notes 
          ? `${formData.order.notes}\n\nCreated By: ${formData.createdBy || "Staff"}`
          : `Created By: ${formData.createdBy || "Staff"}`,
        pickupByPorter: formData.order.pickupByPorter || false,
        dropByPorter: formData.order.dropByPorter || false,
        items: {
          create: formData.items.map((item) => ({
            category: item.category,
            brand: item.brand || null,
            model: item.model || null,
            description: item.description || null,
            services: item.services,
            photoUrl: item.photoUrl || null,
            additionalPhotos: item.additionalPhotos || [],
          })),
        },
      },
      include: {
        items: true,
      },
    });
    // Sync Order to Sheet
    syncToSheet({ table: "orders", data: order });

    // 3. Create Invoice
    const invoiceNumber = await generateSequentialInvoiceNumber();
    const finalAmount = formData.order.price;
    const balanceDue = finalAmount - formData.payment.advancePaid;
    const invoice = await prisma.invoice.create({
      data: {
        orderId: order.id,
        invoiceNumber,
        amount: finalAmount,
        advancePaid: formData.payment.advancePaid,
        balanceDue,
        paymentMode: formData.payment.paymentMode,
      },
    });
    // Sync Invoice to Sheet
    syncToSheet({ table: "invoices", data: invoice });


    // 4. Create Public Tracking Link
    const token = nanoid(12);
    await prisma.publicOrderLink.create({
      data: {
        orderId: order.id,
        token,
      },
    });

    // 5. Log Activity
    await prisma.activityLog.create({
      data: {
        orderId: order.id,
        event: "Order Intake Completed",
        actor: formData.createdBy || "Staff",
      },
    });

    revalidatePath("/orders");
    return { success: true, orderId: order.id };
  } catch (error: any) {
    console.error("Failed to create order:", error);
    return { success: false, error: error.message };
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus, actorEmail: string = "sarah@mrboot.com") {
  try {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: { customer: true },
    });

    // Sync to Sheet
    syncToSheet({ table: "orders", data: order });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        orderId,
        event: `Order Status updated to ${status}`,
        actor: actorEmail,
      },
    });

    // If order is Ready, create in-app notification
    if (status === OrderStatus.READY) {
      await prisma.notification.create({
        data: {
          title: "Order Ready for Pickup",
          message: `Order #${orderId.slice(-6).toUpperCase()} for ${order.customer.firstName} is completed and ready for pickup.`,
          orderId,
        },
      });
    }

    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/orders");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update status:", error);
    return { success: false, error: error.message };
  }
}

export async function assignArtisan(orderId: string, artisanId: string, actorEmail: string = "sarah@mrboot.com") {
  try {
    const artisan = await prisma.staff.findUnique({
      where: { id: artisanId },
    });

    if (!artisan) throw new Error("Artisan not found");

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { artisanId },
    });

    // Sync to Sheet
    syncToSheet({ table: "orders", data: order });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        orderId,
        event: `Assigned artisan: ${artisan.name}`,
        actor: actorEmail,
      },
    });

    revalidatePath(`/orders/${orderId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to assign artisan:", error);
    return { success: false, error: error.message };
  }
}

export async function uploadProofPhoto(orderItemId: string, photoUrl: string, orderId: string, actorEmail: string = "arthur@mrboot.com") {
  try {
    // Fetch the current item to preserve the intake photo in additionalPhotos
    const item = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      select: { photoUrl: true, additionalPhotos: true },
    });

    const additionalPhotos = item?.additionalPhotos || [];
    const newAdditionalPhotos = [...additionalPhotos];
    
    if (item?.photoUrl && !newAdditionalPhotos.includes(item.photoUrl)) {
      newAdditionalPhotos.push(item.photoUrl);
    }

    await prisma.orderItem.update({
      where: { id: orderItemId },
      data: {
        photoUrl, // Sets the after photo as the main photo (replaces it for the bill/receipt)
        additionalPhotos: newAdditionalPhotos, // Adds the original main photo to the gallery
      },
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        orderId,
        event: "After Photo uploaded as completion proof",
        actor: actorEmail,
      },
    });

    revalidatePath(`/orders/${orderId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to upload proof photo:", error);
    return { success: false, error: error.message };
  }
}

export async function logReviewRequest(orderId: string, actorEmail: string = "sarah@mrboot.com") {
  try {
    await prisma.activityLog.create({
      data: {
        orderId,
        event: "Review Request sent to customer via WhatsApp",
        actor: actorEmail,
      },
    });

    revalidatePath(`/orders/${orderId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to log review request:", error);
    return { success: false, error: error.message };
  }
}

export async function createInvoiceForOrder(orderId: string, paymentMode: string = "UPI") {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { invoices: true },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    if (order.invoices.length > 0) {
      return { success: false, error: "Invoice already exists for this order" };
    }

    const invoiceNumber = await generateSequentialInvoiceNumber();
    const invoice = await prisma.invoice.create({
      data: {
        orderId: order.id,
        invoiceNumber,
        amount: order.price,
        advancePaid: 0,
        balanceDue: order.price,
        paymentMode,
      },
    });

    // Sync to Sheets
    syncToSheet({ table: "invoices", data: invoice });

    revalidatePath(`/orders/${orderId}`);
    return { success: true, invoice };
  } catch (error: any) {
    console.error("Failed to generate invoice:", error);
    return { success: false, error: error.message };
  }
}

export async function revertOrderToPending(orderId: string) {
  try {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.RECEIVED },
    });

    // Sync to sheet
    syncToSheet({ table: "orders", data: order });

    await prisma.activityLog.create({
      data: {
        orderId,
        event: "Order status reverted to Pending (RECEIVED)",
        actor: "sarah@mrboot.com",
      },
    });

    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/orders");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to revert order status:", error);
    return { success: false, error: error.message };
  }
}

export async function updatePorterService(
  orderId: string,
  pickupByPorter: boolean,
  dropByPorter: boolean,
  actorEmail: string = "sarah@mrboot.com"
) {
  try {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { pickupByPorter, dropByPorter },
      include: { invoices: true },
    });

    // Determine label for log
    let porterLabel = "Self Pickup & Self Drop";
    if (pickupByPorter && dropByPorter) porterLabel = "Porter Pickup & Porter Drop";
    else if (pickupByPorter) porterLabel = "Porter Pickup / Self Drop";
    else if (dropByPorter) porterLabel = "Self Pickup / Porter Drop";

    await prisma.activityLog.create({
      data: {
        orderId,
        event: `Delivery mode updated: ${porterLabel}`,
        actor: actorEmail,
      },
    });

    revalidatePath(`/orders/${orderId}`);
    revalidatePath(`/invoices/${orderId}`);
    revalidatePath("/logistics");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update Porter service:", error);
    return { success: false, error: error.message };
  }
}

// Keep legacy function for backwards compat (used internally)
export async function togglePorterService(orderId: string, isPorter: boolean, porterCharge: number, actorEmail: string = "sarah@mrboot.com") {
  return updatePorterService(orderId, isPorter, isPorter, actorEmail);
}

export async function updateOrderDetails(orderId: string, price: number, dueDate: string, notes: string) {
  try {
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        price,
        dueDate: new Date(dueDate),
        notes,
      },
      include: {
        invoices: true,
      }
    });

    if (updatedOrder.invoices.length > 0) {
      const invoice = updatedOrder.invoices[0];
      const finalAmount = price;
      const balanceDue = finalAmount - Number(invoice.advancePaid);
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          amount: finalAmount,
          balanceDue,
        }
      });
    }

    revalidatePath(`/orders/${orderId}`);
    revalidatePath(`/invoices/${orderId}`);
    revalidatePath("/orders");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update order details:", error);
    return { success: false, error: error.message };
  }
}

export async function addAddonToOrder(
  orderId: string,
  itemName: string,
  qty: number,
  unitCost: number
) {
  try {
    const totalCost = qty * unitCost;
    const addon = await prisma.orderAddon.create({
      data: { orderId, itemName, qty, unitCost, totalCost },
    });

    // Recalculate invoice total
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { invoices: true, addons: true },
    });
    if (order && order.invoices.length > 0) {
      const addonTotal = order.addons.reduce((sum, a) => sum + Number(a.totalCost), 0);
      const basePrice = Number(order.price);
      const newTotal = basePrice + addonTotal;
      const invoice = order.invoices[0];
      const newBalance = newTotal - Number(invoice.advancePaid);
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { amount: newTotal, balanceDue: newBalance },
      });
    }

    revalidatePath(`/orders/${orderId}`);
    revalidatePath(`/invoices/${orderId}`);
    return { success: true, addon };
  } catch (error: any) {
    console.error("Failed to add addon:", error);
    return { success: false, error: error.message };
  }
}

export async function removeAddonFromOrder(addonId: string, orderId: string) {
  try {
    await prisma.orderAddon.delete({ where: { id: addonId } });

    // Recalculate invoice total
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { invoices: true, addons: true },
    });
    if (order && order.invoices.length > 0) {
      const addonTotal = order.addons.reduce((sum, a) => sum + Number(a.totalCost), 0);
      const basePrice = Number(order.price);
      const newTotal = basePrice + addonTotal;
      const invoice = order.invoices[0];
      const newBalance = newTotal - Number(invoice.advancePaid);
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { amount: newTotal, balanceDue: newBalance },
      });
    }

    revalidatePath(`/orders/${orderId}`);
    revalidatePath(`/invoices/${orderId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to remove addon:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteOrder(orderId: string) {
  try {
    // Check if invoices exist to delete them from sheets too
    const invoices = await prisma.invoice.findMany({ where: { orderId } });
    for (const inv of invoices) {
      await deleteFromSheet({ table: "invoices", id: inv.id });
    }

    // Delete order from sheets
    await deleteFromSheet({ table: "orders", id: orderId });

    // Delete from DB (cascades invoices, notifications, public links, items)
    await prisma.order.delete({
      where: { id: orderId },
    });

    revalidatePath("/orders");
    revalidatePath("/billing");
    return { success: true };
  } catch (err: any) {
    console.error("Error deleting order:", err);
    return { success: false, error: err.message || "Failed to delete order" };
  }
}
