import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const pendingCount = await prisma.order.count({
      where: {
        status: { in: ['RECEIVED', 'IN_PROGRESS'] }
      }
    });

    const upcomingOrders = await prisma.order.findMany({
      where: {
        status: { not: 'DELIVERED' }
      },
      orderBy: {
        dueDate: 'asc'
      },
      take: 2,
      include: { customer: true }
    });

    // Format dates slightly for easier parsing in Kotlin if needed, 
    // or just pass strings
    const formattedOrders = upcomingOrders.map(order => ({
      id: order.id,
      dueDate: order.dueDate.toISOString(),
      customerName: `${order.customer.firstName} ${order.customer.lastName}`,
      serviceType: order.serviceType,
      itemType: order.itemType,
      price: order.price.toString()
    }));

    return NextResponse.json({
      pendingCount,
      upcomingOrders: formattedOrders
    }, {
      headers: {
        // Prevent aggressive caching so widget gets fresh data
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error) {
    console.error('Error fetching widget data:', error);
    return NextResponse.json({ error: 'Failed to fetch widget data' }, { status: 500 });
  }
}
