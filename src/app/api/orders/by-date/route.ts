import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date"); // Expects YYYY-MM-DD
    if (!dateStr) {
      return NextResponse.json({ error: "Date parameter is required" }, { status: 400 });
    }

    const dateParts = dateStr.split("-");
    if (dateParts.length !== 3) {
      return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 });
    }

    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1; // 0-indexed month
    const day = parseInt(dateParts[2]);

    // OWASP A03: Validate date ranges strictly before using in DB query
    if (
      isNaN(year) || isNaN(month) || isNaN(day) ||
      year < 2000 || year > 2100 ||
      month < 0 || month > 11 ||
      day < 1 || day > 31
    ) {
      return NextResponse.json({ error: "Date values are out of range" }, { status: 400 });
    }

    // Query range in local time (Asia/Kolkata timezone - UTC+5:30)
    // To handle timezone correctly, let's build the UTC timestamps matching the IST day
    // IST start of day (00:00:00) is (UTC - 5h 30m) of that calendar day
    const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - (5.5 * 60 * 60 * 1000));
    // IST end of day (23:59:59.999) is (UTC - 5h 30m) of next calendar day minus 1ms
    const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - (5.5 * 60 * 60 * 1000));

    // 1. Fetch orders collected on this date (createdAt)
    const collectedOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        customer: true,
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // 2. Fetch orders due for delivery on this date (dueDate)
    const deliveryOrders = await prisma.order.findMany({
      where: {
        dueDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        customer: true,
        items: true,
      },
      orderBy: { dueDate: "asc" },
    });

    // Map database results to client format
    const mapOrder = (o: any) => ({
      id: o.id,
      status: o.status,
      price: o.price.toString(),
      dueDate: o.dueDate.toISOString(),
      createdAt: o.createdAt.toISOString(),
      customerName: `${o.customer.firstName} ${o.customer.lastName}`,
      itemSummary: o.items.map((item: any) => `${item.brand || ""} ${item.model || item.category}`.trim()).join(", ") || o.itemType,
    });

    return NextResponse.json({
      collected: collectedOrders.map(mapOrder),
      deliveries: deliveryOrders.map(mapOrder),
    });
  } catch (error: any) {
    // OWASP A09: Do not expose internal error details to clients
    console.error("Error in /api/orders/by-date:", error);
    return NextResponse.json({ error: "Failed to fetch orders for the requested date" }, { status: 500 });
  }
}
