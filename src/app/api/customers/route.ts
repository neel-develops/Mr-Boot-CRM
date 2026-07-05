import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const customers = await prisma.customer.findMany({
      where: search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
            ],
          }
        : undefined,
      orderBy: { firstName: 'asc' },
      take: 10,
    });

    return NextResponse.json(customers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { firstName, lastName, email, phone, notes } = await request.json();

    // Check if customer with EXACT same name and phone already exists
    const existing = await prisma.customer.findFirst({
      where: {
        firstName: { equals: firstName, mode: 'insensitive' },
        phone: phone,
      }
    });

    if (existing) {
      return NextResponse.json({ error: "Customer with this name and phone already exists." }, { status: 409 });
    }

    const newCustomer = await prisma.customer.create({
      data: { firstName, lastName, email, phone, notes },
    });
    return NextResponse.json(newCustomer);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
