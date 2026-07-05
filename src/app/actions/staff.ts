"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function createStaffMember(data: {
  name: string;
  email: string;
  role: Role;
}) {
  try {
    const newStaff = await prisma.staff.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
      },
    });

    revalidatePath("/staff");
    return { success: true, staff: newStaff };
  } catch (error: any) {
    console.error("Failed to create staff member:", error);
    return { success: false, error: error.message };
  }
}
