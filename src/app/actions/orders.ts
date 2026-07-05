"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { syncToSheet } from "@/lib/sheets";
import { OrderStatus, Role } from "@prisma/client";
import { nanoid } from "nanoid";

async function generateSequentialInvoiceNumber() {
  const count = await prisma.invoice.count();
  return `MB-${String(count + 1).padStart(3, '0')}`;
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
    isPorter?: boolean;
    porterCharge?: number;
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
        status: OrderStatus.RECEIVED,
        serviceType: formData.order.serviceType,
        itemType: formData.order.itemType,
        material: formData.order.material || null,
        price: formData.order.price,
        dueDate: new Date(formData.order.dueDate),
        customerId: customer.id,
        artisanId: formData.order.artisanId || null,
        notes: formData.order.notes 
          ? `${formData.order.notes}\n\nCreated By: ${formData.createdBy || "Neel Sonawane"}`
          : `Created By: ${formData.createdBy || "Neel Sonawane"}`,
        isPorter: formData.order.isPorter || false,
        porterCharge: formData.order.porterCharge || 0,
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
        actor: formData.createdBy || "Neel Sonawane",
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

export async function deleteOrder(orderId: string) {
  try {
    await prisma.order.delete({
      where: { id: orderId },
    });
    revalidatePath("/orders");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete order:", error);
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

export async function togglePorterService(orderId: string, isPorter: boolean, porterCharge: number, actorEmail: string = "sarah@mrboot.com") {
  try {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        isPorter,
        porterCharge,
      },
      include: {
        invoices: true,
      }
    });

    if (order.invoices.length > 0) {
      const invoice = order.invoices[0];
      const finalAmount = Number(order.price);
      const balanceDue = finalAmount - Number(invoice.advancePaid);
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          amount: finalAmount,
          balanceDue,
        }
      });
    }

    await prisma.activityLog.create({
      data: {
        orderId,
        event: isPorter 
          ? `Pick & Drop via Porter activated (Charge: ₹${porterCharge})` 
          : "Pick & Drop via Porter deactivated",
        actor: actorEmail,
      }
    });

    revalidatePath(`/orders/${orderId}`);
    revalidatePath(`/invoices/${orderId}`);
    revalidatePath("/logistics");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to toggle Porter service:", error);
    return { success: false, error: error.message };
  }
}

