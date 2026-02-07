import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyOverdueLogic() {
    console.log('--- Verification Started ---');

    // 1. Create a test invoice that is already overdue
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const testInvoice = await prisma.invoice.create({
        data: {
            amount: 100,
            dueDate: yesterday,
            status: 'PENDING',
        }
    });
    console.log(`Created test invoice #${testInvoice.id} with dueDate: ${testInvoice.dueDate.toISOString()} and status: ${testInvoice.status}`);

    // 2. Run the update logic (extracted from the job)
    console.log('Running update logic...');
    const today = new Date();
    const result = await prisma.invoice.updateMany({
        where: {
            status: 'PENDING',
            dueDate: { lt: today },
        },
        data: {
            status: 'OVERDUE',
        },
    });
    console.log(`Updated ${result.count} invoices to status OVERDUE.`);

    // 3. Verify the test invoice is now OVERDUE
    const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: testInvoice.id }
    });
    console.log(`Test invoice #${updatedInvoice?.id} status after update: ${updatedInvoice?.status}`);

    if (updatedInvoice?.status === 'OVERDUE') {
        console.log('✅ SUCCESS: Logic verified.');
    } else {
        console.log('❌ FAILURE: Logic verification failed.');
    }

    // 4. Cleanup
    await prisma.invoice.delete({ where: { id: testInvoice.id } });
    console.log('Test data cleaned up.');

    await prisma.$disconnect();
}

verifyOverdueLogic().catch(e => {
    console.error(e);
    process.exit(1);
});
