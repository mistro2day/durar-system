import { PrismaClient, ContractStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function updateExpiredContractsStatus() {
    console.log('🔄 بدء تحديث حالة العقود المنتهية...\n');

    const now = new Date();

    // Find all ACTIVE contracts where endDate has passed
    const expiredContracts = await prisma.contract.findMany({
        where: {
            status: 'ACTIVE',
            endDate: { lt: now }
        },
        include: {
            tenant: { select: { name: true } },
            unit: { select: { number: true, property: { select: { name: true } } } }
        }
    });

    console.log(`📋 عقود نشطة تجاوزت تاريخ الانتهاء: ${expiredContracts.length}\n`);

    if (expiredContracts.length === 0) {
        console.log('✅ لا توجد عقود تحتاج تحديث.');
        return;
    }

    for (const contract of expiredContracts) {
        await prisma.contract.update({
            where: { id: contract.id },
            data: { status: ContractStatus.ENDED }
        });

        const tenantName = contract.tenant?.name || 'غير معروف';
        const unitNumber = contract.unit?.number || 'غير معروف';
        const propertyName = contract.unit?.property?.name || '';
        const endDate = contract.endDate.toISOString().split('T')[0];

        console.log(`✅ عقد #${contract.id} (${tenantName} - ${propertyName} ${unitNumber})`);
        console.log(`   📅 تاريخ الانتهاء: ${endDate}`);
        console.log(`   🔄 الحالة: ACTIVE → ENDED\n`);
    }

    console.log('📊 ملخص التحديث:');
    console.log(`   - إجمالي العقود المحدثة: ${expiredContracts.length}`);
    console.log('\n✨ اكتمل التحديث بنجاح!');
}

updateExpiredContractsStatus()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
