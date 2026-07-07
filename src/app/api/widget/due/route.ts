import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// End of "today" in IST, as a UTC Date.
function endOfTodayIst(now: Date): Date {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const startOfDayUtc =
    Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_OFFSET_MS;
  return new Date(startOfDayUtc + 24 * 60 * 60 * 1000);
}

function dueLabel(dueDate: Date, now: Date): string {
  const diffMs = dueDate.getTime() - now.getTime();
  if (diffMs < 0) {
    const daysLate = Math.floor(-diffMs / (24 * 60 * 60 * 1000));
    if (daysLate >= 1) return `${daysLate}d late`;
    const hoursLate = Math.floor(-diffMs / (60 * 60 * 1000));
    return hoursLate >= 1 ? `${hoursLate}h late` : 'Just missed';
  }
  const time = new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata'
  }).format(dueDate);
  return `Today ${time}`;
}

// Data for the "Due Today / Overdue" home-screen widget.
export async function GET() {
  try {
    const now = new Date();
    const endToday = endOfTodayIst(now);

    const [overdueCount, dueTodayCount, urgentOrders] = await Promise.all([
      prisma.order.count({
        where: { status: { not: 'DELIVERED' }, dueDate: { lt: now } }
      }),
      prisma.order.count({
        where: { status: { not: 'DELIVERED' }, dueDate: { gte: now, lt: endToday } }
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
      isOverdue: order.dueDate.getTime() < now.getTime(),
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
