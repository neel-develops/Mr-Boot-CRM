import React from "react";
import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/ui/glass-card";
import { InventoryList } from "@/components/inventory/inventory-list";

export default async function InventoryPage() {
  // 1. Fetch inventory items
  const dbItems = await prisma.inventory.findMany({
    orderBy: { itemName: "asc" },
  });

  // Map to frontend interface
  const items = dbItems.map((item) => {
    let category = "Workshop Supply";
    if (item.itemName.includes("Spray")) category = "Protective";
    else if (item.itemName.includes("Laces") || item.itemName.includes("lace")) category = "Accessory";
    else if (item.itemName.includes("Glue")) category = "Adhesive";
    else if (item.itemName.includes("Brush")) category = "Tool";
    else if (item.itemName.includes("Dressing")) category = "Restoration";
    else if (item.itemName.includes("Insole") || item.itemName.includes("insole")) category = "Accessory";
    else if (item.itemName.includes("Sole")) category = "Component";

    return {
      id: item.id,
      name: item.itemName,
      category,
      stock: item.stockQty,
      minThreshold: item.reorderThreshold,
      unitCost: Number(item.unitCost),
    };
  });

  // 2. Aggregate statistics
  const lowStockCount = items.filter((item) => item.stock <= item.minThreshold).length;

  let totalValue = 0;
  items.forEach((item) => {
    totalValue += item.stock * item.unitCost;
  });

  return (
    <div className="w-full max-w-[1200px] px-4 md:px-gutter mx-auto py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h2 className="text-headline-lg font-headline-lg font-bold text-primary dark:text-primary-fixed">Inventory</h2>
          <p className="text-body-md font-body-md text-on-surface-variant mt-1">
            Manage premium leather dyes, soles, and workshop supplies.
          </p>
        </div>
      </div>

      {/* Bento Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-card-gap">
        {/* Low Stock Alert */}
        <div className="glass-card rounded-xl p-6 flex flex-col justify-between border-l-4 border-l-error">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-error-container rounded-lg">
              <span className="material-symbols-outlined text-error">warning</span>
            </div>
            <span className="font-label-sm text-label-sm text-error font-bold">Action Needed</span>
          </div>
          <div>
            <h3 className="font-numeral-xl text-numeral-xl text-on-surface font-bold">{lowStockCount}</h3>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Items Low on Stock</p>
          </div>
        </div>

        {/* Total Value */}
        <div className="glass-card rounded-xl p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-tertiary-fixed rounded-lg">
              <span className="material-symbols-outlined text-tertiary">account_balance_wallet</span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Est. Value</span>
          </div>
          <div>
            <h3 className="font-numeral-xl text-numeral-xl text-on-surface font-bold">
              ₹{totalValue.toLocaleString("en-IN")}
            </h3>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Current Inventory Asset</p>
          </div>
        </div>

        {/* Total Items */}
        <div className="glass-card rounded-xl p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-surface-variant rounded-lg">
              <span className="material-symbols-outlined text-on-surface-variant">category</span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">Catalog</span>
          </div>
          <div>
            <h3 className="font-numeral-xl text-numeral-xl text-on-surface font-bold">{items.length}</h3>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Unique Supply SKU Types</p>
          </div>
        </div>
      </div>

      {/* Stock Levels List */}
      <div className="glass-card rounded-xl overflow-hidden mt-8">
        <div className="p-6 border-b border-black/5 flex justify-between items-center bg-surface-bright/30">
          <h3 className="font-headline-lg text-headline-lg font-bold text-primary text-[20px]">Stock Levels</h3>
        </div>
        <InventoryList items={items} />
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
