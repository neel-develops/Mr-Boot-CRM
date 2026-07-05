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
    await prisma.customer.delete({
      where: { id: customerId },
    });
  } catch (error: any) {
    console.error("Failed to delete customer:", error);
    throw new Error(error.message || "Failed to delete customer");
  }

  revalidatePath("/customers");
  redirect("/customers");
}
