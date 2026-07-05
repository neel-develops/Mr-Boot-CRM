"use client";

import React, { useState } from "react";
import { restockItem, removeStock, updateItemPrice, addInventoryItem, deleteInventoryItem } from "@/app/actions/inventory";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  minThreshold: number;
  unitCost: number;
}

interface InventoryListProps {
  items: InventoryItem[];
}

export const InventoryList: React.FC<InventoryListProps> = ({ items: initialItems }) => {
  const [items, setItems] = useState(initialItems);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [editPriceId, setEditPriceId] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState<number>(0);
  const [removeQtyId, setRemoveQtyId] = useState<string | null>(null);
  const [removeQtyValue, setRemoveQtyValue] = useState<number>(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ itemName: "", stockQty: 1, reorderThreshold: 5, unitCost: 0 });
  const [addLoading, setAddLoading] = useState(false);

  const reload = () => window.location.reload();

  const handleRestock = async (id: string) => {
    setLoadingId(id + "_restock");
    const res = await restockItem(id, 10);
    setLoadingId(null);
    if (res.success) reload();
    else alert("Error restocking: " + res.error);
  };

  const handleRemoveStock = async (id: string) => {
    setLoadingId(id + "_remove");
    const res = await removeStock(id, removeQtyValue);
    setLoadingId(null);
    if (res.success) { setRemoveQtyId(null); reload(); }
    else alert("Error removing stock: " + res.error);
  };

  const handleSavePrice = async (id: string) => {
    setLoadingId(id + "_price");
    const res = await updateItemPrice(id, editPriceValue);
    setLoadingId(null);
    if (res.success) { setEditPriceId(null); reload(); }
    else alert("Error updating price: " + res.error);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from inventory permanently?`)) return;
    setLoadingId(id + "_delete");
    const res = await deleteInventoryItem(id);
    setLoadingId(null);
    if (res.success) reload();
    else alert("Error deleting item: " + res.error);
  };

  const handleAddItem = async () => {
    if (!addForm.itemName.trim()) return alert("Item name is required.");
    setAddLoading(true);
    const res = await addInventoryItem(addForm.itemName, addForm.stockQty, addForm.reorderThreshold, addForm.unitCost);
    setAddLoading(false);
    if (res.success) { setShowAddForm(false); setAddForm({ itemName: "", stockQty: 1, reorderThreshold: 5, unitCost: 0 }); reload(); }
    else alert("Error adding item: " + res.error);
  };

  return (
    <div>
      {/* Add Item Banner */}
      <div className="p-4 border-b border-black/5 flex justify-end">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add New Item
        </button>
      </div>

      {/* Add Item Form */}
      {showAddForm && (
        <div className="p-5 border-b border-black/5 bg-primary/5">
          <h4 className="font-bold text-sm mb-4 text-primary">New Inventory Item</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Item Name</label>
              <input
                type="text"
                placeholder="e.g. Premium Laces"
                value={addForm.itemName}
                onChange={(e) => setAddForm({ ...addForm, itemName: e.target.value })}
                className="w-full bg-white border border-black/5 rounded-lg py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Initial Stock</label>
              <input
                type="number"
                value={addForm.stockQty}
                onChange={(e) => setAddForm({ ...addForm, stockQty: Number(e.target.value) })}
                className="w-full bg-white border border-black/5 rounded-lg py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Low Stock Alert At</label>
              <input
                type="number"
                value={addForm.reorderThreshold}
                onChange={(e) => setAddForm({ ...addForm, reorderThreshold: Number(e.target.value) })}
                className="w-full bg-white border border-black/5 rounded-lg py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Unit Price (₹)</label>
              <input
                type="number"
                value={addForm.unitCost}
                onChange={(e) => setAddForm({ ...addForm, unitCost: Number(e.target.value) })}
                className="w-full bg-white border border-black/5 rounded-lg py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => setShowAddForm(false)} className="px-4 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-xs font-bold rounded-lg transition-colors">Cancel</button>
            <button onClick={handleAddItem} disabled={addLoading} className="px-4 py-1.5 bg-primary text-on-primary text-xs font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
              {addLoading ? "Adding..." : "Add to Inventory"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/22 text-on-surface-variant font-label-sm text-label-sm">
              <th className="p-4 font-medium pl-6">Item Name</th>
              <th className="p-4 font-medium">Category</th>
              <th className="p-4 font-medium">Stock Level</th>
              <th className="p-4 font-medium">Unit Price</th>
              <th className="p-4 font-medium text-right pr-6">Actions</th>
            </tr>
          </thead>
          <tbody className="font-body-md text-body-md divide-y divide-black/5">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-on-surface-variant">
                  No inventory items. Add one above.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const isLow = item.stock <= item.minThreshold;
                const percent = Math.min(100, Math.round((item.stock / 50) * 100));

                return (
                  <tr key={item.id} className="hover:bg-white/40 transition-colors">
                    <td className="p-4 pl-6">
                      <span className="font-medium text-on-surface">{item.name}</span>
                    </td>
                    <td className="p-4 text-on-surface-variant text-xs">{item.category}</td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-full bg-black/5 rounded-full h-1.5 max-w-[100px] overflow-hidden">
                          <div className={`h-1.5 rounded-full ${isLow ? "bg-error" : "bg-primary"}`} style={{ width: `${percent}%` }} />
                        </div>
                        <span className={`font-label-sm text-label-sm font-semibold ${isLow ? "text-error" : "text-on-surface-variant"}`}>
                          {isLow ? "Low" : "OK"} ({item.stock}/{item.minThreshold})
                        </span>
                      </div>
                    </td>

                    {/* Unit Price cell with inline edit */}
                    <td className="p-4">
                      {editPriceId === item.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-zinc-400">₹</span>
                          <input
                            type="number"
                            value={editPriceValue}
                            onChange={(e) => setEditPriceValue(Number(e.target.value))}
                            className="w-20 bg-white border border-primary/30 rounded py-1 px-2 text-xs focus:outline-none"
                            autoFocus
                          />
                          <button onClick={() => handleSavePrice(item.id)} disabled={loadingId === item.id + "_price"} className="text-primary hover:opacity-70">
                            <span className="material-symbols-outlined text-[16px]">check</span>
                          </button>
                          <button onClick={() => setEditPriceId(null)} className="text-zinc-400 hover:opacity-70">
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditPriceId(item.id); setEditPriceValue(item.unitCost); }}
                          className="text-xs font-semibold text-on-surface hover:text-primary flex items-center gap-1 group"
                        >
                          ₹{Number(item.unitCost).toLocaleString("en-IN")}
                          <span className="material-symbols-outlined text-[14px] opacity-0 group-hover:opacity-60 transition-opacity">edit</span>
                        </button>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right pr-6">
                      {removeQtyId === item.id ? (
                        <div className="flex items-center gap-1 justify-end">
                          <input
                            type="number"
                            min={1}
                            value={removeQtyValue}
                            onChange={(e) => setRemoveQtyValue(Number(e.target.value))}
                            className="w-14 bg-white border border-error/30 rounded py-1 px-2 text-xs focus:outline-none text-right"
                          />
                          <button onClick={() => handleRemoveStock(item.id)} disabled={loadingId === item.id + "_remove"} className="px-2 py-1 bg-error text-white text-xs font-bold rounded hover:opacity-90 disabled:opacity-50">
                            {loadingId === item.id + "_remove" ? "..." : "Remove"}
                          </button>
                          <button onClick={() => setRemoveQtyId(null)} className="px-2 py-1 bg-zinc-200 text-xs font-bold rounded hover:bg-zinc-300">✕</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 justify-end flex-wrap">
                          <button onClick={() => handleRestock(item.id)} disabled={loadingId === item.id + "_restock"} className="px-2.5 py-1 bg-primary text-on-primary text-xs font-semibold rounded hover:opacity-90 disabled:opacity-50">
                            {loadingId === item.id + "_restock" ? "..." : "+10"}
                          </button>
                          <button
                            onClick={() => { setRemoveQtyId(item.id); setRemoveQtyValue(1); }}
                            className="px-2.5 py-1 bg-zinc-100 text-error text-xs font-semibold rounded hover:bg-red-50 border border-error/20"
                          >
                            −
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.name)}
                            disabled={loadingId === item.id + "_delete"}
                            title="Delete item"
                            className="px-2 py-1 text-zinc-400 hover:text-error text-xs rounded hover:bg-red-50"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
