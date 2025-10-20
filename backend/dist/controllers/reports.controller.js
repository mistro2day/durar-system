import prisma from "../lib/prisma.js";
/** 🔹 تقرير العقود */
export async function getContractsReport(req, res) {
    try {
        const contracts = await prisma.contract.findMany({
            include: {
                unit: { include: { property: true } },
                tenant: true
            }
        });
        const report = contracts.map((contract) => ({
            id: contract.id,
            propertyName: contract.unit.property.name,
            unitNumber: contract.unit.number,
            tenantName: contract.tenant?.name ?? contract.tenantName ?? "غير محدد",
            startDate: contract.startDate,
            endDate: contract.endDate,
            amount: contract.rentAmount, // ✅ الاسم الصحيح في الـ schema
            status: contract.status
        }));
        res.json(report);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "فشل في توليد تقرير العقود" });
    }
}
/** 🔹 التقرير المالي (الفواتير والمدفوعات) */
export async function getFinancialReport(req, res) {
    try {
        const invoices = await prisma.invoice.findMany({
            include: {
                contract: {
                    include: {
                        unit: { include: { property: true } },
                        tenant: true
                    }
                },
                payments: { orderBy: { paidAt: "asc" } }
            }
        });
        const report = invoices.map((invoice) => {
            const firstPayment = invoice.payments[0];
            return {
                id: invoice.id,
                propertyName: invoice.contract?.unit.property.name ?? "N/A",
                unitNumber: invoice.contract?.unit.number ?? "N/A",
                tenantName: invoice.contract?.tenant?.name ?? "N/A",
                amount: invoice.amount,
                dueDate: invoice.dueDate,
                status: invoice.status,
                paidAt: firstPayment?.paidAt ?? null,
                paymentMethod: firstPayment ? firstPayment.method : null // ENUM مثل CASH / TRANSFER
            };
        });
        res.json(report);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "فشل في توليد التقرير المالي" });
    }
}
/** 🔹 تقرير الصيانة */
export async function getMaintenanceReport(req, res) {
    try {
        const maintenance = await prisma.maintenanceTicket.findMany({
            include: {
                unit: { include: { property: true } },
                actions: true
            }
        });
        const report = maintenance.map((ticket) => ({
            id: ticket.id,
            propertyName: ticket.unit.property.name,
            unitNumber: ticket.unit.number,
            description: ticket.description,
            status: ticket.status,
            priority: ticket.priority,
            createdAt: ticket.createdAt,
            completedAt: ticket.actions.length > 0
                ? ticket.actions[ticket.actions.length - 1].performedAt
                : null,
            actions: ticket.actions.map((action) => ({
                actionTaken: action.actionTaken,
                performedBy: action.performedBy,
                performedAt: action.performedAt
            }))
        }));
        res.json(report);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "فشل في توليد تقرير الصيانة" });
    }
}
