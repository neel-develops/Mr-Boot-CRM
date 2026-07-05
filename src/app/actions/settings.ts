"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function updateSettings(data: {
  orgName: string;
  orgPhone: string;
  orgEmail: string;
  orgAddress: string;
  billReadyTemplate: string;
  reviewRequestTemplate: string;
  googleReviewLink: string;
  darkMode: boolean;
}) {
  try {
    const settings = await prisma.settings.upsert({
      where: { id: "singleton" },
      update: {
        orgName: data.orgName,
        orgPhone: data.orgPhone,
        orgEmail: data.orgEmail,
        orgAddress: data.orgAddress,
        billReadyTemplate: data.billReadyTemplate,
        reviewRequestTemplate: data.reviewRequestTemplate,
        googleReviewLink: data.googleReviewLink,
        darkMode: data.darkMode,
      },
      create: {
        id: "singleton",
        orgName: data.orgName,
        orgPhone: data.orgPhone,
        orgEmail: data.orgEmail,
        orgAddress: data.orgAddress,
        billReadyTemplate: data.billReadyTemplate,
        reviewRequestTemplate: data.reviewRequestTemplate,
        googleReviewLink: data.googleReviewLink,
        darkMode: data.darkMode,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/orders");
    return { success: true, settings };
  } catch (error: any) {
    console.error("Failed to update settings:", error);
    return { success: false, error: error.message };
  }
}

export async function updateDarkMode(darkMode: boolean) {
  try {
    const settings = await prisma.settings.upsert({
      where: { id: "singleton" },
      update: { darkMode },
      create: {
        id: "singleton",
        darkMode,
      },
    });
    revalidatePath("/settings");
    revalidatePath("/orders");
    return { success: true, settings };
  } catch (error: any) {
    console.error("Failed to update dark mode:", error);
    return { success: false, error: error.message };
  }
}

