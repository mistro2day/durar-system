
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient({
    log: ['info', 'warn', 'error'], // Log everything
});

const DATA_DIR = path.join(__dirname, '../data_import');

const IMPORT_ORDER = [
    { file: 'User_rows.csv', model: 'user' },
    { file: 'Property_rows.csv', model: 'property' },
    { file: 'Shop_rows.csv', model: 'shop' },
    { file: 'Tenant_rows.csv', model: 'tenant' },
    { file: 'Unit_rows.csv', model: 'unit' },
    { file: 'Contract_rows.csv', model: 'contract' },
    { file: 'Invoice_rows.csv', model: 'invoice' },
    { file: 'Payment_rows.csv', model: 'payment' },
    { file: 'MaintenanceTicket_rows.csv', model: 'maintenanceTicket' },
    { file: 'ActivityLog_rows.csv', model: 'activityLog' },
    { file: 'PasswordReset_rows.csv', model: 'passwordReset' },
    { file: 'Setting_rows.csv', model: 'setting' },
];

// Helper to convert empty string to null or undefined
function clean(value: any) {
    if (value === '') return undefined;
    if (value === 'null') return undefined;
    return value;
}

async function main() {
    console.log('Using database URL:', process.env.DATABASE_URL);

    for (const { file, model } of IMPORT_ORDER) {
        const filePath = path.join(DATA_DIR, file);

        if (!fs.existsSync(filePath)) {
            console.warn(`Skipping ${model}: File ${file} not found.`);
            continue;
        }

        console.log(`\n--- Importing ${model} from ${file} ---`);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            relax_quotes: true,
            trim: true,
        });

        let successCount = 0;
        let errorCount = 0;

        for (const record of records) {
            // Transform record
            const data: any = {};
            for (const key in record) {
                const val = clean(record[key]);
                if (val === undefined) continue;

                // Force number conversion for IDs and known numeric fields
                if (key.endsWith('Id') || key === 'id' ||
                    ['amount', 'total', 'area', 'rooms', 'baths', 'floor', 'rentAmount', 'deposit', 'priority', 'status'].includes(key)
                ) {
                    const num = Number(val);
                    if (!isNaN(num)) {
                        // CAUTION: Enum fields like 'status' or 'priority' might be strings in CSV but Prisma mapped to Enums.
                        // If 'status' is 'ACTIVE' in CSV, keep it string.
                        if (['status', 'priority', 'role', 'type', 'method', 'rentalType'].some(k => key.toLowerCase().includes(k))) {
                            // It's likely an Enum string, keep as string.
                            // EXCEPT if it is purely numeric and the enum expects something else? No, enums are strings in Prisma.
                            data[key] = val;
                        } else {
                            data[key] = num;
                        }
                    } else {
                        data[key] = val; // Keep as string if NaN
                    }
                }
                // Boolean
                else if (val.toLowerCase() === 'true' || val.toLowerCase() === 't') data[key] = true;
                else if (val.toLowerCase() === 'false' || val.toLowerCase() === 'f') data[key] = false;
                // Date
                else if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) {
                    data[key] = new Date(val);
                }
                else {
                    data[key] = val;
                }
            }

            try {
                await (prisma as any)[model].create({
                    data: data,
                });
                successCount++;
            } catch (e: any) {
                // Check if it's a unique constraint violation (code P2002)
                if (e.code === 'P2002') {
                    // Ignore duplicates quietly or log info
                    // console.log(`Skipping duplicate ${model} ID ${data.id}`);
                } else {
                    console.error(`Failed to import ${model} ID ${data.id || '?'}: ${e.message}`);
                    errorCount++;
                }
            }
        }
        console.log(`Finished ${model}: ${successCount} inserted, ${errorCount} errors.`);
    }
}

main()
    .catch((e) => {
        console.error("Critical error in script:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
