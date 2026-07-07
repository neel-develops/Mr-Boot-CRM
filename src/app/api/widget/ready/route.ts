import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Data for the "Ready for Pickup" home-screen widget.
// Returns READY orders with customer name + phone so the widget
// can offer tap-to-call buttons.
export async function GET() {
  try {
    const [readyCount, readyOrders] = await Promise.all([
      prisma.order.count({ where: { status: 'READY' } }),
      prisma.order.findMany({
        where: { status: 'READY' },
        orderBy: { updatedAt: 'asc' }, // waiting longest first
        take: 3,
        include: { customer: true }
      })
    ]);

    const orders = readyOrders.map((order) => ({
      id: order.id,
      customerName: `${order.customer.firstName} ${order.customer.lastName}`,
      phone: order.customer.phone || '',
      serviceType: order.serviceType,
      itemType: order.itemType,
      price: order.price.toString()
    }));

    return NextResponse.json(
      { readyCount, orders },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    console.error('Error fetching ready widget data:', error);
    return NextResponse.json({ error: 'Failed to fetch ready widget data' }, { status: 500 });
  }
}
