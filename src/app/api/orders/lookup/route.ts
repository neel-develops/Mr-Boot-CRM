import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    if (!query) {
      return NextResponse.json({ error: "Query parameter is required" }, { status: 400 });
    }

    const trimmedQuery = query.trim();

    // 1. Check if the query is a valid UUID (direct Order ID lookup)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(trimmedQuery)) {
      const order = await prisma.order.findUnique({
        where: { id: trimmedQuery },
        select: { id: true },
      });
      if (order) {
        return NextResponse.json({ orderId: order.id });
      }
    }

    // 2. Parse URL if the scanned content is a link
    let lookupToken = trimmedQuery;
    if (trimmedQuery.includes("/track/")) {
      // e.g. https://mr-boot-crm.vercel.app/track/some-token-here -> extract token
      const parts = trimmedQuery.split("/track/");
      if (parts.length > 1) {
        lookupToken = parts[1].split(/[?#]/)[0];
      }
    } else if (trimmedQuery.includes("/invoices/")) {
      // e.g. https://mr-boot-crm.vercel.app/invoices/order-uuid-here -> extract order ID
      const parts = trimmedQuery.split("/invoices/");
      if (parts.length > 1) {
        const potentialOrderId = parts[1].split(/[?#]/)[0];
        if (uuidRegex.test(potentialOrderId)) {
          const order = await prisma.order.findUnique({
            where: { id: potentialOrderId },
            select: { id: true },
          });
          if (order) {
            return NextResponse.json({ orderId: order.id });
          }
        }
      }
    }

    // 3. Check if it's a tracking token
    const publicLink = await prisma.publicOrderLink.findUnique({
      where: { token: lookupToken },
      select: { orderId: true },
    });
    if (publicLink) {
      return NextResponse.json({ orderId: publicLink.orderId });
    }

    // 4. Check if it's an invoice number (with or without #)
    let invoiceNumber = trimmedQuery;
    if (trimmedQuery.startsWith("#")) {
      invoiceNumber = trimmedQuery.substring(1);
    }
    const invoice = await prisma.invoice.findUnique({
      where: { invoiceNumber },
      select: { orderId: true },
    });
    if (invoice) {
      return NextResponse.json({ orderId: invoice.orderId });
    }

    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  } catch (error: any) {
    console.error("Error in /api/orders/lookup:", error);
    return NextResponse.json({ error: error.message || "Failed to lookup order" }, { status: 500 });
  }
}
