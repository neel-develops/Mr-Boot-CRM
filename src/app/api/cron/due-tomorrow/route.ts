import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:mrbootshoelaundrynrepair@gmail.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  process.env.VAPID_PRIVATE_KEY || ""
);

export async function GET(request: Request) {
  try {
    // OWASP A01: CRON_SECRET is now mandatory — always require it
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
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
    
    // 3.5 Fetch all push subscriptions once
    const subscriptions = await prisma.pushSubscription.findMany();

    // 4. Create in-app notifications and send Web Push
    for (const order of dueOrders) {
      // Prevent duplicate notification for same order and event type
      const existingNotification = await prisma.notification.findFirst({
        where: {
          orderId: order.id,
          title: "Order Due Tomorrow",
        },
      });

      if (!existingNotification) {
        const title = "Order Due Tomorrow";
        const message = `Order #${order.id.slice(-6).toUpperCase()} for ${order.customer.firstName} is due tomorrow.`;
        
        await prisma.notification.create({
          data: {
            title,
            message,
            orderId: order.id,
          },
        });
        
        // Send Web Push to all devices
        if (subscriptions.length > 0) {
          const payload = JSON.stringify({
            title,
            body: message,
            url: `/orders/${order.id}`,
          });

          await Promise.all(
            subscriptions.map(async (sub) => {
              try {
                await webpush.sendNotification(
                  {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth },
                  },
                  payload
                );
              } catch (error: any) {
                if (error.statusCode === 404 || error.statusCode === 410) {
                  // Subscription has expired or is no longer valid
                  await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } });
                } else {
                  console.error("Error sending push to", sub.endpoint, error);
                }
              }
            })
          );
        }
        
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
