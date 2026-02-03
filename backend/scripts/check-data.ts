
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
    try {
        const userCount = await prisma.user.count();
        const propertyCount = await prisma.property.count();
        const unitCount = await prisma.unit.count();
        const tenantCount = await prisma.tenant.count();
        const contractCount = await prisma.contract.count();

        console.log("--- Database Record Counts ---");
        console.log(`Users: ${userCount}`);
        console.log(`Properties: ${propertyCount}`);
        console.log(`Units: ${unitCount}`);
        console.log(`Tenants: ${tenantCount}`);
        console.log(`Contracts: ${contractCount}`);
        console.log("------------------------------");

        if (contractCount > 0) {
            const firstContract = await prisma.contract.findFirst();
            console.log("Sample Contract:", JSON.stringify(firstContract, null, 2));
        }

    } catch (error) {
        console.error("Error checking data:", error);
    } finally {
        await prisma.$disconnect();
    }
}

checkData();
