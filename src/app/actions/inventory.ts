"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { syncToSheet } from "@/lib/sheets";

export async function restockItem(itemId: string, quantity: number) {
  try {
    const item = await prisma.inventory.update({
      where: { id: itemId },
      data: {
        stockQty: {
          increment: quantity,
        },
      },
    });

    // Sync to Sheets
    syncToSheet({ table: "inventory", data: item });

    revalidatePath("/inventory");
    return { success: true, item };
  } catch (error: any) {
    console.error("Failed to restock inventory:", error);
    return { success: false, error: error.message };
  }
}

export async function updateItemStock(itemId: string, newStock: number) {
  try {
    const item = await prisma.inventory.update({
      where: { id: itemId },
      data: {
        stockQty: newStock,
      },
    });

    // Sync to Sheets
    syncToSheet({ table: "inventory", data: item });

    revalidatePath("/inventory");
    return { success: true, item };
  } catch (error: any) {
    console.error("Failed to update stock:", error);
    return { success: false, error: error.message };
  }
}
