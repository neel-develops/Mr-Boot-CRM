import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    // 1. Verify Vercel Cron security header if CRON_SECRET is configured
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    // 2. Calculate time bounds (next 24 hours)
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24);

    // 3. Find orders due tomorrow that are not delivered
    const dueOrders = await prisma.order.findMany({
      where: {
        dueDate: {
          gte: now,
          lte: tomorrow,
        },
        status: {
          not: "DELIVERED",
        },
      },
      include: {
        customer: true,
      },
    });

    let createdCount = 0;

    // 4. Create in-app notifications
    for (const order of dueOrders) {
      // Prevent duplicate notification for same order and event type
      const existingNotification = await prisma.notification.findFirst({
        where: {
          orderId: order.id,
          title: "Order Due Tomorrow",
        },
      });

      if (!existingNotification) {
        await prisma.notification.create({
          data: {
            title: "Order Due Tomorrow",
            message: `Order #${order.id.slice(-6).toUpperCase()} for ${order.customer.firstName} is due tomorrow.`,
            orderId: order.id,
          },
        });
        createdCount++;
      }
    }

    return NextResponse.json({
      success: true,
      scannedCount: dueOrders.length,
      notificationsCreated: createdCount,
    });
  } catch (error: any) {
    console.error("Vercel Cron Due Tomorrow Job Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
