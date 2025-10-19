import { PrismaClient } from "../lib/prisma.js";
import { logActivity } from "../utils/activity-log.js";
import { getPagination } from "../utils/pagination.js";
const prisma = new PrismaClient();
export const getInvoices = async (req, res) => {
    const { propertyId } = req.query;
    const where = {};
    if (propertyId) {
        where.contract = { is: { unit: { propertyId: Number(propertyId) } } };
    }
    const pg = getPagination(req);
    const include = {
        contract: {
            include: {
                unit: {
                    include: {
                        property: true,
                    },
                },
            },
        },
    };
    if (!pg) {
        const invoices = await prisma.invoice.findMany({ where, include, orderBy: { dueDate: "asc" } });
        return res.json(invoices);
    }
    const [items, total] = await Promise.all([
        prisma.invoice.findMany({ where, include, orderBy: { dueDate: "asc" }, skip: pg.skip, take: pg.take }),
        prisma.invoice.count({ where }),
    ]);
    res.json({ items, total, page: pg.page, pageSize: pg.pageSize });
};
export const updateInvoiceStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const invoice = await prisma.invoice.update({
        where: { id: Number(id) },
        data: { status },
    });
    await logActivity(prisma, req, {
        action: "INVOICE_STATUS_UPDATE",
        description: `تحديث حالة فاتورة #${id} إلى ${status}`,
        contractId: invoice.contractId ?? null,
    });
    res.json(invoice);
};
export const createInvoice = async (req, res) => {
    try {
        const { contractId, tenantId, amount, dueDate, status } = req.body;
        const data = {
            amount: Number(amount),
            dueDate: new Date(dueDate || Date.now()),
            status: status || "PENDING",
        };
        if (contractId)
            data.contractId = Number(contractId);
        if (tenantId)
            data.tenantId = Number(tenantId);
        const inv = await prisma.invoice.create({ data });
        await logActivity(prisma, req, {
            action: "INVOICE_CREATE",
            description: `إضافة فاتورة جديدة بقيمة ${Number(amount).toLocaleString("ar-SA")} ريال`,
            contractId: inv.contractId ?? null,
        });
        res.json(inv);
    }
    catch (e) {
        res.status(500).json({ message: e?.message || "تعذر إنشاء الفاتورة" });
    }
};
