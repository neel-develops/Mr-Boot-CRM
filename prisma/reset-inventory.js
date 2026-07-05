const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Wiping current inventory mock data...");
  await prisma.inventory.deleteMany({});

  console.log("Seeding real inventory addons...");
  await prisma.inventory.createMany({
    data: [
      { itemName: "Premium Laces (Black)", stockQty: 100, reorderThreshold: 10 },
      { itemName: "Premium Laces (Brown)", stockQty: 100, reorderThreshold: 10 },
      { itemName: "Premium Laces (White)", stockQty: 50, reorderThreshold: 5 },
      { itemName: "Soft Insoles (Standard)", stockQty: 40, reorderThreshold: 5 },
      { itemName: "Soft Insoles (Gel Cushion)", stockQty: 25, reorderThreshold: 5 },
      { itemName: "Addon: Heel Cushions", stockQty: 30, reorderThreshold: 5 },
      { itemName: "Addon: Cedar Shoe Trees", stockQty: 15, reorderThreshold: 2 },
    ],
  });

  console.log("Real inventory seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error resetting inventory:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
