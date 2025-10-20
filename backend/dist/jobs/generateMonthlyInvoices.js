import prisma from "../lib/prisma.js";
import cron from "node-cron";
export const startInvoiceScheduler = () => {
    cron.schedule("0 0 1 * *", async () => {
        console.log("📅 بدء إنشاء الفواتير الشهرية ...");
        const today = new Date();
        const activeContracts = await prisma.contract.findMany({
            where: { status: "ACTIVE" },
            include: { tenant: true },
        });
        for (const contract of activeContracts) {
            if (today >= contract.startDate && today <= contract.endDate) {
                const month = today.getMonth() + 1;
                const year = today.getFullYear();
                const existing = await prisma.invoice.findFirst({
                    where: {
                        contractId: contract.id,
                        dueDate: {
                            gte: new Date(`${year}-${month}-01`),
                            lt: new Date(`${year}-${month + 1}-01`),
                        },
                    },
                });
                if (!existing) {
                    await prisma.invoice.create({
                        data: {
                            tenantId: contract.tenantId,
                            contractId: contract.id,
                            amount: contract.rentAmount,
                            dueDate: new Date(`${year}-${month}-01`),
                            status: "PENDING",
                        },
                    });
                    console.log(`💵 تم إنشاء فاتورة لشهر ${month}/${year} للعقد #${contract.id}`);
                }
            }
        }
        console.log("✅ تم فحص وإنشاء الفواتير الشهرية بنجاح.");
    });
};
