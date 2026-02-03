
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const tableNames = [
    'User',
    'Property',
    'Unit',
    'Tenant',
    'Booking',
    'Invoice',
    'Payment',
    'Shop',
    'MaintenanceTicket',
    'MaintenanceAction',
    'Contract',
    'ActivityLog',
    'Setting',
    'PasswordReset'
];

async function resetSequences() {
    console.log('Starting sequence reset...');

    for (const tableName of tableNames) {
        try {
            // Try with quotes (PascalCase as in schema)
            const query = `SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'), coalesce(max(id) + 1, 1), false) FROM "${tableName}";`;
            await prisma.$executeRawUnsafe(query);
            console.log(`✅ Reset sequence for table: "${tableName}"`);
        } catch (error: any) {
            console.warn(`⚠️ Could not reset "${tableName}" (trying lowercase...):`, error.message);
            try {
                // Try lowercase fallback
                const queryLower = `SELECT setval(pg_get_serial_sequence('"${tableName.toLowerCase()}"', 'id'), coalesce(max(id) + 1, 1), false) FROM "${tableName.toLowerCase()}";`;
                await prisma.$executeRawUnsafe(queryLower);
                console.log(`✅ Reset sequence for table: "${tableName.toLowerCase()}"`);
            } catch (err2: any) {
                console.error(`❌ Failed to reset sequence for ${tableName}:`, err2.message);
            }
        }
    }
}

resetSequences()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
