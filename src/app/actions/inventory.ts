"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { syncToSheet } from "@/lib/sheets";
import { requireUser } from "@/lib/auth";

function wholeNumber(v: unknown, field: string, min = 0): number {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n) || n < min) throw new Error(`${field} must be ${min} or more`);
  return n;
}

function money(v: unknown, field: string): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${field} must be 0 or more`);
  return Math.round(n * 100) / 100;
}

export async function restockItem(itemId: string, quantity: number) {
  try {
    await requireUser();
    quantity = wholeNumber(quantity, "Quantity", 1);
    const item = await prisma.inventory.update({
      where: { id: itemId },
      data: {
        stockQty: {
          increment: quantity,
        },
      },
    });

    await syncToSheet({ table: "inventory", data: item });
    revalidatePath("/inventory");
    return { success: true, item };
  } catch (error: any) {
    console.error("Failed to restock inventory:", error);
    return { success: false, error: error.message };
  }
}

export async function removeStock(itemId: string, quantity: number) {
  try {
    await requireUser();
    quantity = wholeNumber(quantity, "Quantity", 1);
    // Atomic: never goes below zero even if two people remove stock at once.
    const updated = await prisma.$executeRaw`
      UPDATE inventory SET "stockQty" = GREATEST(0, "stockQty" - ${quantity}), "updatedAt" = NOW()
      WHERE id = ${itemId}`;
    if (updated === 0) return { success: false, error: "Item not found" };
    const item = await prisma.inventory.findUniqueOrThrow({ where: { id: itemId } });

    await syncToSheet({ table: "inventory", data: item });
    revalidatePath("/inventory");
    return { success: true, item };
  } catch (error: any) {
    console.error("Failed to remove stock:", error);
    return { success: false, error: error.message };
  }
}

export async function updateItemStock(itemId: string, newStock: number) {
  try {
    await requireUser();
    const item = await prisma.inventory.update({
      where: { id: itemId },
      data: { stockQty: wholeNumber(newStock, "Stock") },
    });

    await syncToSheet({ table: "inventory", data: item });
    revalidatePath("/inventory");
    return { success: true, item };
  } catch (error: any) {
    console.error("Failed to update stock:", error);
    return { success: false, error: error.message };
  }
}

export async function updateItemPrice(itemId: string, unitCost: number) {
  try {
    await requireUser();
    const item = await prisma.inventory.update({
      where: { id: itemId },
      data: { unitCost: money(unitCost, "Unit cost") },
    });

    await syncToSheet({ table: "inventory", data: item });
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
    await requireUser();
    const item = await prisma.inventory.create({
      data: {
        itemName: itemName.trim(),
        stockQty: wholeNumber(stockQty, "Stock"),
        reorderThreshold: wholeNumber(reorderThreshold, "Reorder threshold"),
        unitCost: money(unitCost, "Unit cost"),
      },
    });

    await syncToSheet({ table: "inventory", data: item });
    revalidatePath("/inventory");
    return { success: true, item };
  } catch (error: any) {
    console.error("Failed to add inventory item:", error);
    if (error?.code === "P2002") return { success: false, error: `"${itemName.trim()}" already exists in inventory` };
    return { success: false, error: error.message };
  }
}

export async function deleteInventoryItem(itemId: string) {
  try {
    await requireUser();
    await prisma.inventory.delete({ where: { id: itemId } });
    revalidatePath("/inventory");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete inventory item:", error);
    return { success: false, error: error.message };
  }
}
