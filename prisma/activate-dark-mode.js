const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Activating dark mode in database settings...");
  await prisma.settings.upsert({
    where: { id: "singleton" },
    update: { darkMode: true },
    create: {
      id: "singleton",
      orgName: "Mr. Boot Premium Shoe Care",
      orgPhone: "+919028983659", // also update official shop number
      orgEmail: "info@mrboot.com",
      orgAddress: "12 Luxury Arcade, Mumbai, India",
      darkMode: true,
    },
  });
  console.log("Dark mode activated and official shop number updated!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
