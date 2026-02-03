
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

const DATA_DIR = path.join(__dirname, '../data_import');

const MODELS = [
    { model: 'user', file: 'User_rows.csv' },
    { model: 'property', file: 'Property_rows.csv' },
    { model: 'shop', file: 'Shop_rows.csv' },
    { model: 'tenant', file: 'Tenant_rows.csv' },
    { model: 'unit', file: 'Unit_rows.csv' },
    { model: 'contract', file: 'Contract_rows.csv' },
    { model: 'invoice', file: 'Invoice_rows.csv' },
    { model: 'payment', file: 'Payment_rows.csv' },
    { model: 'maintenanceTicket', file: 'MaintenanceTicket_rows.csv' },
    { model: 'activityLog', file: 'ActivityLog_rows.csv' },
    { model: 'passwordReset', file: 'PasswordReset_rows.csv' },
    { model: 'setting', file: 'Setting_rows.csv' },
];

/**
 * Simple CSV escape function
 */
function escapeCSV(val: any): string {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

async function main() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    console.log('Exporting data to CSV...');

    for (const { model, file } of MODELS) {
        console.log(`Exporting ${model}...`);
        const records = await (prisma as any)[model].findMany();

        if (records.length === 0) {
            console.log(`No records found for ${model}, skipping.`);
            continue;
        }

        const headers = Object.keys(records[0]);
        const csvRows = [headers.map(escapeCSV).join(',')];

        for (const record of records) {
            const row = headers.map(header => {
                const val = record[header];
                if (val instanceof Date) {
                    return escapeCSV(val.toISOString());
                }
                return escapeCSV(val);
            });
            csvRows.push(row.join(','));
        }

        fs.writeFileSync(path.join(DATA_DIR, file), csvRows.join('\n'));
        console.log(`Saved ${records.length} records to ${file}`);
    }

    console.log('Export complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
