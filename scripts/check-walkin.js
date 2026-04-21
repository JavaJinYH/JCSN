const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function check() {
  const walkIns = await db.contact.findMany({
    where: { name: '散客' },
  });
  console.log(`🔍 当前数据库中有 ${walkIns.length} 个"散客"联系人`);
  for (const w of walkIns) {
    console.log(`   - ID: ${w.id}, 创建时间: ${w.createdAt}`);
  }
  await db.$disconnect();
}

check().catch(console.error);
