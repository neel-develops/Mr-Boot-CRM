const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    include: {
      customer: true,
      invoices: true,
      publicOrderLinks: true,
      items: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\n📋 All Orders (${orders.length}):`);
  orders.forEach(o => {
    console.log(`\n  Order ID: ${o.id}`);
    console.log(`  Customer: ${o.customer.firstName} ${o.customer.lastName}`);
    console.log(`  Status: ${o.status}`);
    console.log(`  Price: ₹${o.price}`);
    console.log(`  Invoices: ${o.invoices.length}`);
    if (o.invoices.length > 0) {
      console.log(`  Invoice #: ${o.invoices[0].invoiceNumber}`);
      console.log(`  Invoice Link: /invoices/${o.id}`);
    }
    console.log(`  Tracking token: ${o.publicOrderLinks[0]?.token || 'NONE'}`);
    console.log(`  Items: ${o.items.length}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
