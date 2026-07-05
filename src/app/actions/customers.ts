"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function deleteCustomer(formData: FormData) {
  const customerId = formData.get("customerId") as string;
  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  try {
    // Manually cascade: delete order addons, activity logs, invoices, order items, public links, then orders, then customer
    const orders = await prisma.order.findMany({
      where: { customerId },
      select: { id: true },
    });

    for (const order of orders) {
      await prisma.orderAddon.deleteMany({ where: { orderId: order.id } });
      await prisma.activityLog.deleteMany({ where: { orderId: order.id } });
      await prisma.invoice.deleteMany({ where: { orderId: order.id } });
      await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
      await prisma.publicOrderLink.deleteMany({ where: { orderId: order.id } });
    }

    await prisma.order.deleteMany({ where: { customerId } });
    await prisma.customer.delete({ where: { id: customerId } });
  } catch (error: any) {
    console.error("Failed to delete customer:", error);
    throw new Error(error.message || "Failed to delete customer");
  }

  revalidatePath("/customers");
  redirect("/customers");
}
