const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ordersWithoutInvoice = await prisma.order.findMany({
    where: {
      invoices: { none: {} }
    },
    include: {
      customer: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\n📋 Orders WITHOUT invoices: ${ordersWithoutInvoice.length}`);
  if (ordersWithoutInvoice.length > 0) {
    ordersWithoutInvoice.forEach(o => {
      console.log(`  - Order ${o.id.slice(-8).toUpperCase()} | ${o.customer.firstName} ${o.customer.lastName} | ₹${o.price} | ${o.status}`);
    });
  }

  const totalOrders = await prisma.order.count();
  const totalInvoices = await prisma.invoice.count();
  console.log(`\n📊 Total Orders: ${totalOrders}, Total Invoices: ${totalInvoices}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
