import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const attachments = await prisma.tenantAttachment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
    });
    console.log(JSON.stringify(attachments, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
