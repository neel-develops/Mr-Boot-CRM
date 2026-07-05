"use client";

import { deleteCustomer } from "@/app/actions/customers";

interface DeleteCustomerButtonProps {
  customerId: string;
}

export function DeleteCustomerButton({ customerId }: DeleteCustomerButtonProps) {
  return (
    <form
      action={deleteCustomer}
      onSubmit={(e) => {
        if (
          !confirm(
            "Are you sure you want to delete this customer? This will also delete all their orders and bills!"
          )
        )
          e.preventDefault();
      }}
      className="flex-1 md:flex-none"
    >
      <input type="hidden" name="customerId" value={customerId} />
      <button
        type="submit"
        className="w-full border border-error text-error hover:bg-error/5 px-6 py-2.5 rounded-lg font-label-sm text-label-sm font-semibold hover:-translate-y-0.5 hover:shadow-lg transition-all duration-250 flex items-center justify-center gap-2 text-center"
      >
        <span className="material-symbols-outlined text-[18px]">delete</span>
        Delete Customer
      </button>
    </form>
  );
}
