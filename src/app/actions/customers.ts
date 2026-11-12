"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { deleteFromSheet, syncToSheet } from "@/lib/sheets";

export async function deleteCustomer(formData: FormData) {
  const customerId = formData.get("customerId") as string;
  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  await requireUser();

  try {
    const orders = await prisma.order.findMany({
      where: { customerId },
      select: { id: true, invoices: { select: { id: true } } },
    });
    const orderIds = orders.map((o) => o.id);

    // One transaction: orders (and their items, invoices, links, logs, add-ons) cascade from the customer.
    await prisma.$transaction([
      prisma.notification.deleteMany({ where: { orderId: { in: orderIds } } }),
      prisma.customer.delete({ where: { id: customerId } }),
    ]);

    // Keep the Google Sheet in step (best effort).
    for (const o of orders) {
      for (const inv of o.invoices) await deleteFromSheet({ table: "invoices", id: inv.id }).catch(() => {});
      await deleteFromSheet({ table: "orders", id: o.id }).catch(() => {});
    }
    await deleteFromSheet({ table: "customers", id: customerId }).catch(() => {});
  } catch (error: any) {
    console.error("Failed to delete customer:", error);
    throw new Error(error.message || "Failed to delete customer");
  }

  revalidatePath("/customers");
  redirect("/customers");
}

export async function updateCustomer(
  customerId: string,
  data: {
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
    notes?: string;
    shoeSize?: string;
  }
) {
  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  try {
    await requireUser();
    if (!(data.firstName || "").trim()) throw new Error("First name is required");
    if ((data.phone || "").replace(/\D/g, "").length < 10) throw new Error("Enter a valid 10-digit phone number");
    const updated = await prisma.customer.update({
      where: { id: customerId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        phone: data.phone,
        notes: data.notes || null,
        shoeSize: data.shoeSize || null,
      },
    });

    await syncToSheet({ table: "customers", data: updated });
    revalidatePath(`/customers/${customerId}`);
    revalidatePath("/customers");
    return { success: true, customer: updated };
  } catch (error: any) {
    console.error("Failed to update customer:", error);
    return { success: false, error: error.message || "Failed to update customer" };
  }
}

