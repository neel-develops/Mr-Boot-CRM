"use client";

import React, { useState } from "react";
import { updateCustomer } from "@/app/actions/customers";

interface CustomerData {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone: string;
  notes?: string | null;
  shoeSize?: string | null;
}

interface EditCustomerButtonProps {
  customer: CustomerData;
  mini?: boolean;
}

export function EditCustomerButton({ customer, mini }: EditCustomerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [firstName, setFirstName] = useState(customer.firstName);
  const [lastName, setLastName] = useState(customer.lastName);
  const [email, setEmail] = useState(customer.email || "");
  const [phone, setPhone] = useState(customer.phone);
  const [shoeSize, setShoeSize] = useState(customer.shoeSize || "");
  const [notes, setNotes] = useState(customer.notes || "");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!firstName.trim() || !phone.trim()) {
      setError("First Name and Phone Number are required.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateCustomer(customer.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        shoeSize: shoeSize.trim(),
        notes: notes.trim(),
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        setError(res.error || "Failed to update profile.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {mini ? (
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 rounded-full border border-black/10 bg-white/50 dark:bg-primary/20 dark:border-white/10 hover:bg-white/75 dark:hover:bg-primary/30 text-on-surface-variant flex items-center justify-center transition-all hover:scale-105 shadow-sm"
          title="Edit Profile"
        >
          <span className="material-symbols-outlined text-[16px]">edit</span>
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex-1 md:flex-none border border-black/10 bg-white/50 dark:bg-primary/20 dark:border-white/10 hover:bg-white/75 dark:hover:bg-primary/30 px-6 py-2.5 rounded-lg font-label-sm text-label-sm font-semibold hover:-translate-y-0.5 hover:shadow-md transition-all duration-250 flex items-center justify-center gap-2 text-center"
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
          Edit Profile
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-[4px] flex justify-center p-4">
          <div 
            className="w-full max-w-[500px] my-auto bg-white/95 dark:bg-primary/95 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.15)] rounded-2xl p-6 relative flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="text-body-lg font-bold text-primary dark:text-primary-fixed mb-4 border-b border-black/5 pb-2">
              Edit Customer Profile
            </h3>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg p-3 text-xs mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full bg-white/50 border border-black/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-white/50 border border-black/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full bg-white/50 border border-black/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/50 border border-black/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Shoe Size
                </label>
                <input
                  type="text"
                  value={shoeSize}
                  onChange={(e) => setShoeSize(e.target.value)}
                  placeholder="e.g. 9 UK, 43 EU"
                  className="w-full bg-white/50 border border-black/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Customer Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-white/50 border border-black/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-black/5 mt-6">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 border border-black/10 text-on-surface-variant hover:bg-black/5 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-primary text-on-primary rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-55 flex items-center gap-1.5"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
