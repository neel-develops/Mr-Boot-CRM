import React from "react";
import { prisma } from "@/lib/prisma";
import { StaffManagementClient } from "@/components/staff/staff-management-client";

export default async function StaffPage() {
  const staffList = await prisma.staff.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="w-full max-w-[1200px] px-4 md:px-gutter mx-auto py-4">
      {/* Header */}
      <header className="mb-8">
        <h2 className="text-headline-lg font-headline-lg text-primary dark:text-primary-fixed">Staff & Artisans</h2>
        <p className="text-on-surface-variant font-body-md text-body-md">
          Manage system access, artisan roles, and active team directory.
        </p>
      </header>

      <StaffManagementClient staffList={staffList} />
    </div>
  );
}
export const dynamic = 'force-dynamic';
