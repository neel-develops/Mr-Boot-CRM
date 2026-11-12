import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { istDayBounds, daysOverdue } from '@/lib/dates';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Due dates are calendar days: overdue only once the India-time due day has passed.
function dueLabel(dueDate: Date, now: Date): string {
  const late = daysOverdue(dueDate, now);
  return late >= 1 ? `${late}d late` : 'Today';
}

// Data for the "Due Today / Overdue" home-screen widget.
export async function GET() {
  try {
    const now = new Date();
    const { start: startToday, end: endToday } = istDayBounds(now);

    const [overdueCount, dueTodayCount, urgentOrders] = await Promise.all([
      prisma.order.count({
        where: { status: { not: 'DELIVERED' }, dueDate: { lt: startToday } }
      }),
      prisma.order.count({
        where: { status: { not: 'DELIVERED' }, dueDate: { gte: startToday, lt: endToday } }
      }),
      prisma.order.findMany({
        where: { status: { not: 'DELIVERED' }, dueDate: { lt: endToday } },
        orderBy: { dueDate: 'asc' }, // most overdue first
        take: 3,
        include: { customer: true }
      })
    ]);

    const orders = urgentOrders.map((order) => ({
      id: order.id,
      customerName: `${order.customer.firstName} ${order.customer.lastName}`,
      serviceType: order.serviceType,
      itemType: order.itemType,
      isOverdue: order.dueDate.getTime() < startToday.getTime(),
      dueLabel: dueLabel(order.dueDate, now)
    }));

    return NextResponse.json(
      { overdueCount, dueTodayCount, orders },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    console.error('Error fetching due widget data:', error);
    return NextResponse.json({ error: 'Failed to fetch due widget data' }, { status: 500 });
  }
}
