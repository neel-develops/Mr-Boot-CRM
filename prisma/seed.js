const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Settings singleton
  const settings = await prisma.settings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      orgName: 'Mr. Boot Premium Shoe Care',
      orgPhone: '+919028983659',
      orgEmail: 'info@mrboot.com',
      orgAddress: '12 Luxury Arcade, Mumbai, India',
      billReadyTemplate: 'Hi {{customer_first_name}}, Neel Sonawane here from Mr Boot. Your bill is ready: {{invoice_pdf_or_track_link}}',
      reviewRequestTemplate: "Hi {{customer_first_name}}, hope you're loving your {{item_type}}! Would mean a lot if you could leave us a quick review: {{google_review_link}}",
      googleReviewLink: 'https://g.page/r/your-google-review-link',
      darkMode: false,
    },
  });
  console.log('Upserted settings:', settings.id);

  // 2. Staff members
  const john = await prisma.staff.upsert({
    where: { email: 'john@mrboot.com' },
    update: {},
    create: {
      email: 'john@mrboot.com',
      name: 'John Doe',
      role: 'ADMIN',
    },
  });
  const sarah = await prisma.staff.upsert({
    where: { email: 'sarah@mrboot.com' },
    update: {},
    create: {
      email: 'sarah@mrboot.com',
      name: 'Sarah Connor',
      role: 'MANAGER',
    },
  });
  const arthur = await prisma.staff.upsert({
    where: { email: 'arthur@mrboot.com' },
    update: {},
    create: {
      email: 'arthur@mrboot.com',
      name: 'Artisan Arthur',
      role: 'ARTISAN',
    },
  });
  console.log('Upserted staff: John, Sarah, Arthur');

  // 3. Customers
  const aisha = await prisma.customer.create({
    data: {
      firstName: 'Aisha',
      lastName: 'Patel',
      email: 'aisha@patel.com',
      phone: '+919876543210',
      notes: 'Prefers organic cleaning supplies and extra soft brushing for suede.',
    },
  });
  const jane = await prisma.customer.create({
    data: {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@smith.com',
      phone: '+919876543211',
      notes: 'Bespoke client. Collects antique brogues.',
    },
  });
  console.log('Created customers: Aisha, Jane');

  // 4. Orders
  const order1 = await prisma.order.create({
    data: {
      status: 'IN_PROGRESS',
      serviceType: 'Sole Replacement',
      itemType: 'Chelsea Boots',
      material: 'Leather',
      price: 2450.00,
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Due in 2 days
      customerId: aisha.id,
      artisanId: arthur.id,
      notes: 'Replace worn out crepe sole with Vibram rubber sole.',
      items: {
        create: {
          category: 'Boots',
          brand: 'RM Williams',
          model: 'Comfort Chelsea',
          description: 'Brown leather boots, heavily worn soles.',
          services: ['Sole Change', 'Shoe Polish'],
        },
      },
    },
  });

  const order2 = await prisma.order.create({
    data: {
      status: 'DELIVERED',
      serviceType: 'Deep Clean',
      itemType: 'Sneakers',
      material: 'Suede & Mesh',
      price: 1200.00,
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Completed yesterday
      customerId: aisha.id,
      artisanId: arthur.id,
      notes: 'Waterproof coating added.',
      items: {
        create: {
          category: 'Sneaker',
          brand: 'New Balance',
          model: '990v5',
          description: 'Grey suede sneakers with yellowing soles.',
          services: ['Premium Deep Clean', 'Waterproofing'],
        },
      },
    },
  });

  const order3 = await prisma.order.create({
    data: {
      status: 'READY',
      serviceType: 'Leather Restoration',
      itemType: 'Oxford Brogues',
      material: 'Calfskin Leather',
      price: 3500.00,
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Due tomorrow
      customerId: jane.id,
      artisanId: arthur.id,
      notes: 'Restore scuffed toes and re-finish edge dressing.',
      items: {
        create: {
          category: 'Formal Shoe',
          brand: 'Churchs',
          model: 'Consul Brogue',
          description: 'Black calfskin oxfords, scuffed toe caps.',
          services: ['Stain Removal', 'Shoe Polish'],
        },
      },
    },
  });
  console.log('Created orders');

  // 5. Invoices
  await prisma.invoice.create({
    data: {
      orderId: order1.id,
      invoiceNumber: 'INV-2026-0001',
      amount: 2450.00,
      advancePaid: 1000.00,
      balanceDue: 1450.00,
      paymentMode: 'UPI',
    },
  });

  await prisma.invoice.create({
    data: {
      orderId: order2.id,
      invoiceNumber: 'INV-2026-0002',
      amount: 1200.00,
      advancePaid: 1200.00,
      balanceDue: 0.00,
      paymentMode: 'CARD',
    },
  });

  await prisma.invoice.create({
    data: {
      orderId: order3.id,
      invoiceNumber: 'INV-2026-0003',
      amount: 3500.00,
      advancePaid: 0.00,
      balanceDue: 3500.00,
      paymentMode: 'CASH',
    },
  });
  console.log('Created invoices');

  // 6. Public Order Links
  await prisma.publicOrderLink.create({
    data: {
      orderId: order1.id,
      token: 'track-rm-williams-chelsea-2026',
    },
  });
  await prisma.publicOrderLink.create({
    data: {
      orderId: order2.id,
      token: 'track-nb-990v5-2026',
    },
  });
  await prisma.publicOrderLink.create({
    data: {
      orderId: order3.id,
      token: 'track-churchs-brogues-2026',
    },
  });
  console.log('Created tracking links');

  // 7. Activity Logs
  await prisma.activityLog.create({
    data: {
      orderId: order1.id,
      event: 'Order Created',
      actor: 'sarah@mrboot.com',
    },
  });
  await prisma.activityLog.create({
    data: {
      orderId: order1.id,
      event: 'Artisan Assigned: Artisan Arthur',
      actor: 'sarah@mrboot.com',
    },
  });
  await prisma.activityLog.create({
    data: {
      orderId: order3.id,
      event: 'Order Created',
      actor: 'sarah@mrboot.com',
    },
  });
  await prisma.activityLog.create({
    data: {
      orderId: order3.id,
      event: 'Artisan Assigned: Artisan Arthur',
      actor: 'sarah@mrboot.com',
    },
  });
  await prisma.activityLog.create({
    data: {
      orderId: order3.id,
      event: 'Restoration complete, marked Ready',
      actor: 'arthur@mrboot.com',
    },
  });
  console.log('Created activity logs');

  // 8. Inventory
  await prisma.inventory.createMany({
    data: [
      { itemName: 'Waterproofing Spray (Saphir)', stockQty: 45, reorderThreshold: 10 },
      { itemName: 'Premium Laces (Brown)', stockQty: 12, reorderThreshold: 15 },
      { itemName: 'Sole Glue (Barge)', stockQty: 5, reorderThreshold: 5 },
      { itemName: 'Premium Suede Brush', stockQty: 32, reorderThreshold: 5 },
      { itemName: 'Edge Dressing (Black)', stockQty: 3, reorderThreshold: 8 },
    ],
  });
  console.log('Created inventory');

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
