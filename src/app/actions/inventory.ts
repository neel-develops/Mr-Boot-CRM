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

    syncToSheet({ table: "inventory", data: item });
    revalidatePath("/inventory");
    return { success: true, item };
  } catch (error: any) {
    console.error("Failed to restock inventory:", error);
    return { success: false, error: error.message };
  }
}

export async function removeStock(itemId: string, quantity: number) {
  try {
    const current = await prisma.inventory.findUnique({ where: { id: itemId } });
    if (!current) return { success: false, error: "Item not found" };
    const newQty = Math.max(0, current.stockQty - quantity);

    const item = await prisma.inventory.update({
      where: { id: itemId },
      data: { stockQty: newQty },
    });

    syncToSheet({ table: "inventory", data: item });
    revalidatePath("/inventory");
    return { success: true, item };
  } catch (error: any) {
    console.error("Failed to remove stock:", error);
    return { success: false, error: error.message };
  }
}

export async function updateItemStock(itemId: string, newStock: number) {
  try {
    const item = await prisma.inventory.update({
      where: { id: itemId },
      data: { stockQty: newStock },
    });

    syncToSheet({ table: "inventory", data: item });
    revalidatePath("/inventory");
    return { success: true, item };
  } catch (error: any) {
    console.error("Failed to update stock:", error);
    return { success: false, error: error.message };
  }
}

export async function updateItemPrice(itemId: string, unitCost: number) {
  try {
    const item = await prisma.inventory.update({
      where: { id: itemId },
      data: { unitCost },
    });

    revalidatePath("/inventory");
    return { success: true, item };
  } catch (error: any) {
    console.error("Failed to update item price:", error);
    return { success: false, error: error.message };
  }
}

export async function addInventoryItem(
  itemName: string,
  stockQty: number,
  reorderThreshold: number,
  unitCost: number
) {
  try {
    const item = await prisma.inventory.create({
      data: { itemName, stockQty, reorderThreshold, unitCost },
    });

    syncToSheet({ table: "inventory", data: item });
    revalidatePath("/inventory");
    return { success: true, item };
  } catch (error: any) {
    console.error("Failed to add inventory item:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteInventoryItem(itemId: string) {
  try {
    await prisma.inventory.delete({ where: { id: itemId } });
    revalidatePath("/inventory");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete inventory item:", error);
    return { success: false, error: error.message };
  }
}
