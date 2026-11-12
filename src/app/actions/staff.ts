"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { requireUser } from "@/lib/auth";

export async function createStaffMember(data: {
  name: string;
  email: string;
  role: Role;
}) {
  try {
    await requireUser();
    const name = (data.name || "").trim();
    const email = (data.email || "").trim().toLowerCase();
    if (!name) throw new Error("Name is required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address");
    if (!Object.values(Role).includes(data.role)) throw new Error("Invalid role");
    const newStaff = await prisma.staff.create({
      data: { name, email, role: data.role },
    });

    revalidatePath("/staff");
    return { success: true, staff: newStaff };
  } catch (error: any) {
    console.error("Failed to create staff member:", error);
    if (error?.code === "P2002") return { success: false, error: "A staff member with this email already exists" };
    return { success: false, error: error.message };
  }
}
