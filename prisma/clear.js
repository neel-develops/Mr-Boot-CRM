const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Starting database cleanup...");

  // 1. Delete all transactional mock data
  console.log("Deleting invoices...");
  await prisma.invoice.deleteMany({});

  console.log("Deleting public order tracking links...");
  await prisma.publicOrderLink.deleteMany({});

  console.log("Deleting activity logs...");
  await prisma.activityLog.deleteMany({});

  console.log("Deleting order items...");
  await prisma.orderItem.deleteMany({});

  console.log("Deleting orders...");
  await prisma.order.deleteMany({});

  console.log("Deleting customers...");
  await prisma.customer.deleteMany({});

  console.log("Deleting old staff members...");
  await prisma.staff.deleteMany({});

  // 2. Insert your active Supabase staff members
  console.log("Registering active Supabase staff...");
  await prisma.staff.createMany({
    data: [
      {
        name: "Neel Sonawane",
        email: "neel@mrboot.com",
        role: "ADMIN",
      },
      {
        name: "Pankaj",
        email: "pankaj@mrboot.com",
        role: "ADMIN",
      },
      {
        name: "Vinita",
        email: "vinita@mrboot.com",
        role: "ADMIN",
      },
    ],
  });

  // 3. Ensure Settings singleton exists
  const settingsCount = await prisma.settings.count();
  if (settingsCount === 0) {
    console.log("Creating default settings singleton...");
    await prisma.settings.create({
      data: {
        id: "singleton",
        orgName: "Mr. Boot Premium Shoe Care",
        orgPhone: "+919028983659",
        orgEmail: "info@mrboot.com",
        orgAddress: "12 Luxury Arcade, Mumbai, India",
        billReadyTemplate: "Hi {{customer_first_name}}, Neel Sonawane here from Mr Boot. Your bill is ready: {{invoice_pdf_or_track_link}}",
        reviewRequestTemplate: "Hi {{customer_first_name}}, hope you're loving your {{item_type}}! Would mean a lot if you could leave us a quick review: {{google_review_link}}",
        googleReviewLink: "https://g.page/r/your-google-review-link",
        darkMode: true,
      },
    });
  }

  console.log("Database clean-up and setup completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error clearing database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
