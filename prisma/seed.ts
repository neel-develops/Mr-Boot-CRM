import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding staff roles...');

  // Upsert Pankaj as ADMIN
  const pankaj = await prisma.staff.upsert({
    where: { email: 'pankaj@mrboot.com' },
    update: { role: Role.ADMIN },
    create: {
      name: 'Pankaj',
      email: 'pankaj@mrboot.com',
      role: Role.ADMIN,
    },
  });
  console.log(`✅ Pankaj: ${pankaj.role}`);

  // Upsert Vinita as ADMIN
  const vinita = await prisma.staff.upsert({
    where: { email: 'vinita@mrboot.com' },
    update: { role: Role.ADMIN },
    create: {
      name: 'Vinita',
      email: 'vinita@mrboot.com',
      role: Role.ADMIN,
    },
  });
  console.log(`✅ Vinita: ${vinita.role}`);

  console.log('🌱 Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
