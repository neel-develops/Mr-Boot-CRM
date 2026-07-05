"use client";

import React, { useState } from "react";
import { restockItem } from "@/app/actions/inventory";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  minThreshold: number;
  cost: number;
}

interface InventoryListProps {
  items: InventoryItem[];
}

export const InventoryList: React.FC<InventoryListProps> = ({ items }) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleRestock = async (id: string) => {
    setLoadingId(id);
    // Add 10 units
    const res = await restockItem(id, 10);
    setLoadingId(null);

    if (res.success) {
      alert("Successfully restocked 10 units!");
    } else {
      alert("Error restocking item: " + res.error);
    }
  };

  return (
    <div className="overflow-x-auto no-scrollbar">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/22 text-on-surface-variant font-label-sm text-label-sm">
            <th className="p-4 font-medium pl-6">Item Name</th>
            <th className="p-4 font-medium">Category</th>
            <th className="p-4 font-medium">Stock Level</th>
            <th className="p-4 font-medium text-right">Cost (Unit)</th>
            <th className="p-4 font-medium text-right pr-6">Actions</th>
          </tr>
        </thead>
        <tbody className="font-body-md text-body-md divide-y divide-black/5">
          {items.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-8 text-center text-on-surface-variant">
                No inventory items found.
              </td>
            </tr>
          ) : (
            items.map((item) => {
              const isLow = item.stock <= item.minThreshold;
              const percent = Math.min(100, Math.round((item.stock / 50) * 100)); // normalized out of 50 units max for display

              return (
                <tr key={item.id} className="hover:bg-white/40 transition-colors">
                  <td className="p-4 pl-6 flex items-center space-x-3">
                    <span className="font-medium text-on-surface">{item.name}</span>
                  </td>
                  <td className="p-4 text-on-surface-variant">{item.category}</td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-full bg-black/5 rounded-full h-1.5 max-w-[120px] overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${isLow ? "bg-error" : "bg-primary"}`}
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                      <span
                        className={`font-label-sm text-label-sm font-semibold ${
                          isLow ? "text-error" : "text-on-surface-variant"
                        }`}
                      >
                        {isLow ? "Low" : "Good"} ({item.stock}/{item.minThreshold})
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-right">₹{item.cost.toLocaleString("en-IN")}</td>
                  <td className="p-4 text-right pr-6">
                    <button
                      onClick={() => handleRestock(item.id)}
                      disabled={loadingId === item.id}
                      className="px-3 py-1 bg-primary text-on-primary text-xs font-semibold rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {loadingId === item.id ? "Adding..." : "+10 Restock"}
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
