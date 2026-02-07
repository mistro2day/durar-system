import { PrismaClient, RenewalStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function updateRenewalStatuses() {
    console.log('🔄 بدء تحديث حالات التجديد للعقود...\n');

    // Get all contracts
    const contracts = await prisma.contract.findMany({
        orderBy: [
            { tenantId: 'asc' },
            { unitId: 'asc' },
            { startDate: 'asc' }
        ],
        include: {
            tenant: { select: { name: true } },
            unit: { select: { number: true, property: { select: { name: true } } } }
        }
    });

    console.log(`📋 إجمالي العقود: ${contracts.length}\n`);

    const now = new Date();
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(now.getDate() + 60);

    let updated = 0;
    let pending = 0;
    let renewed = 0;
    let notRenewing = 0;

    for (const contract of contracts) {
        let newStatus: RenewalStatus | null = null;
        const endDate = new Date(contract.endDate);

        // Check if there's a newer contract for the same tenant and unit
        const hasNewerContract = contracts.some(c =>
            c.id !== contract.id &&
            c.tenantId === contract.tenantId &&
            c.unitId === contract.unitId &&
            new Date(c.startDate) > new Date(contract.startDate)
        );

        if (contract.status === 'ACTIVE') {
            // Active contracts within 60 days of ending should be PENDING
            if (endDate <= sixtyDaysFromNow && endDate > now) {
                newStatus = RenewalStatus.PENDING;
                pending++;
            }
        } else if (contract.status === 'ENDED' || contract.status === 'CANCELLED') {
            if (hasNewerContract) {
                newStatus = RenewalStatus.RENEWED;
                renewed++;
            } else if (endDate < now) {
                newStatus = RenewalStatus.NOT_RENEWING;
                notRenewing++;
            }
        }

        // Update if status changed and different from current
        if (newStatus && contract.renewalStatus !== newStatus) {
            await prisma.contract.update({
                where: { id: contract.id },
                data: { renewalStatus: newStatus }
            });
            updated++;

            const tenantName = contract.tenant?.name || 'غير معروف';
            const unitNumber = contract.unit?.number || 'غير معروف';
            const propertyName = contract.unit?.property?.name || '';

            console.log(`✅ عقد #${contract.id} (${tenantName} - ${propertyName} ${unitNumber}): ${contract.renewalStatus || 'فارغ'} → ${newStatus}`);
        }
    }

    console.log('\n📊 ملخص التحديث:');
    console.log(`   - إجمالي العقود المحدثة: ${updated}`);
    console.log(`   - بانتظار التجديد (PENDING): ${pending}`);
    console.log(`   - تم تجديدها (RENEWED): ${renewed}`);
    console.log(`   - غير مجدد (NOT_RENEWING): ${notRenewing}`);
    console.log('\n✨ اكتمل التحديث بنجاح!');
}

updateRenewalStatuses()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
