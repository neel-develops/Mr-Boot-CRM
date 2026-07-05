"use client";

import React, { useState } from "react";
import { addAddonToOrder, removeAddonFromOrder } from "@/app/actions/orders";

interface InventoryItem {
  id: string;
  name: string;
  unitCost: number;
}

interface OrderAddon {
  id: string;
  itemName: string;
  qty: number;
  unitCost: number;
  totalCost: number;
}

interface AddonsManagerProps {
  orderId: string;
  existingAddons: OrderAddon[];
  inventoryItems: InventoryItem[];
}

export const AddonsManager: React.FC<AddonsManagerProps> = ({
  orderId,
  existingAddons: initialAddons,
  inventoryItems,
}) => {
  const [addons, setAddons] = useState<OrderAddon[]>(initialAddons);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const [customName, setCustomName] = useState<string>("");
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [useCustom, setUseCustom] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const selectedItem = inventoryItems.find((i) => i.id === selectedItemId);

  const handleAdd = async () => {
    const itemName = useCustom ? customName : selectedItem?.name || "";
    const unitCost = useCustom ? customPrice : selectedItem?.unitCost || 0;

    if (!itemName.trim()) return alert("Please select or enter an item.");
    if (unitCost <= 0) return alert("Unit price must be greater than 0.");
    if (qty < 1) return alert("Quantity must be at least 1.");

    setAdding(true);
    const res = await addAddonToOrder(orderId, itemName, qty, unitCost);
    setAdding(false);

    if (res.success && res.addon) {
      const newAddon: OrderAddon = {
        id: res.addon.id,
        itemName,
        qty,
        unitCost,
        totalCost: qty * unitCost,
      };
      setAddons([...addons, newAddon]);
      setSelectedItemId("");
      setQty(1);
      setCustomName("");
      setCustomPrice(0);
    } else {
      alert("Error adding addon: " + res.error);
    }
  };

  const handleRemove = async (addonId: string) => {
    setRemovingId(addonId);
    const res = await removeAddonFromOrder(addonId, orderId);
    setRemovingId(null);
    if (res.success) {
      setAddons(addons.filter((a) => a.id !== addonId));
    } else {
      alert("Error removing addon: " + res.error);
    }
  };

  const addonsTotal = addons.reduce((sum, a) => sum + Number(a.totalCost), 0);

  return (
    <div className="pt-4 border-t border-black/5">
      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-primary dark:text-primary-fixed uppercase tracking-wider">
        <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
        Bill Add-ons
      </h4>

      {/* Existing addons */}
      {addons.length > 0 && (
        <div className="mb-4 space-y-2">
          {addons.map((addon) => (
            <div key={addon.id} className="flex items-center justify-between p-2.5 bg-white/60 border border-black/5 rounded-lg">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-on-surface">{addon.itemName}</span>
                <span className="text-[10px] text-zinc-400">
                  {addon.qty} × ₹{Number(addon.unitCost).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-primary">₹{Number(addon.totalCost).toLocaleString("en-IN")}</span>
                <button
                  onClick={() => handleRemove(addon.id)}
                  disabled={removingId === addon.id}
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-red-50 hover:bg-red-100 text-error transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {removingId === addon.id ? "hourglass_empty" : "close"}
                  </span>
                </button>
              </div>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2 border-t border-black/5 text-xs font-bold text-on-surface">
            <span className="uppercase tracking-widest text-[10px] text-zinc-400">Add-ons Total</span>
            <span className="text-primary text-sm">₹{addonsTotal.toLocaleString("en-IN")}.00</span>
          </div>
        </div>
      )}

      {/* Add Addon Form */}
      <div className="bg-white/40 border border-black/5 rounded-xl p-3 flex flex-col gap-3">
        {/* Toggle: Inventory item vs Custom */}
        <div className="flex gap-2">
          <button
            onClick={() => setUseCustom(false)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${!useCustom ? "bg-primary text-on-primary" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"}`}
          >
            From Inventory
          </button>
          <button
            onClick={() => setUseCustom(true)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${useCustom ? "bg-primary text-on-primary" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"}`}
          >
            Custom Item
          </button>
        </div>

        {!useCustom ? (
          <select
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            className="w-full bg-white border border-black/5 rounded-lg py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-on-surface"
          >
            <option value="">— Select inventory item —</option>
            {inventoryItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} — ₹{Number(item.unitCost).toLocaleString("en-IN")}
              </option>
            ))}
          </select>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Item name"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="bg-white border border-black/5 rounded-lg py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400">₹</span>
              <input
                type="number"
                placeholder="Price"
                value={customPrice || ""}
                onChange={(e) => setCustomPrice(Number(e.target.value))}
                className="w-full bg-white border border-black/5 rounded-lg py-2 pl-5 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-1 border border-black/5 rounded-lg overflow-hidden bg-white">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-2 py-1.5 text-xs hover:bg-black/5 transition-colors">−</button>
            <span className="px-3 text-xs font-bold">{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="px-2 py-1.5 text-xs hover:bg-black/5 transition-colors">+</button>
          </div>
          {(selectedItem || useCustom) && (
            <span className="text-[10px] text-zinc-400 flex-1">
              Total: ₹{((useCustom ? customPrice : selectedItem?.unitCost || 0) * qty).toLocaleString("en-IN")}
            </span>
          )}
          <button
            onClick={handleAdd}
            disabled={adding}
            className="px-3 py-1.5 bg-primary text-on-primary text-xs font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            {adding ? "Adding..." : "Add to Bill"}
          </button>
        </div>
      </div>
    </div>
  );
};
