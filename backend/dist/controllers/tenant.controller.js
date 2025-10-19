import { PrismaClient } from "../lib/prisma.js";
import { getPagination } from "../utils/pagination.js";
const prisma = new PrismaClient();
export async function listTenants(req, res) {
    const { propertyId } = req.query;
    const pg = getPagination(req);
    const pid = propertyId ? Number(propertyId) : undefined;
    const where = pid
        ? {
            contracts: {
                some: { unit: { propertyId: pid } },
            },
        }
        : undefined;
    const contractFilter = pid ? { unit: { propertyId: pid } } : undefined;
    const invoiceFilter = pid ? { contract: { unit: { propertyId: pid } } } : undefined;
    const query = prisma.tenant.findMany({
        where,
        orderBy: { name: "asc" },
        ...(pg ? { skip: pg.skip, take: pg.take } : {}),
        include: {
            contracts: {
                where: contractFilter,
                include: {
                    unit: { include: { property: true } },
                },
                orderBy: { startDate: "desc" },
            },
            invoices: {
                where: invoiceFilter,
                select: { id: true, status: true, amount: true, dueDate: true },
                orderBy: { dueDate: "desc" },
            },
        },
    });
    if (pg) {
        const [items, total] = await Promise.all([query, prisma.tenant.count({ where })]);
        return res.json({
            items: items.map((tenant) => enrichTenant(tenant)),
            total,
            page: pg.page,
            pageSize: pg.pageSize,
        });
    }
    const tenants = await query;
    return res.json(tenants.map((tenant) => enrichTenant(tenant)));
}
export async function getTenantById(req, res) {
    const { id } = req.params;
    const tenantId = Number(id);
    if (!tenantId) {
        return res.status(400).json({ message: "معرّف المستأجر غير صالح" });
    }
    const { propertyId } = req.query;
    const pid = propertyId ? Number(propertyId) : undefined;
    const contractFilter = pid ? { unit: { propertyId: pid } } : undefined;
    const invoiceFilter = pid ? { contract: { unit: { propertyId: pid } } } : undefined;
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
            contracts: {
                where: contractFilter,
                include: {
                    unit: { include: { property: true } },
                },
                orderBy: { startDate: "desc" },
            },
            invoices: {
                where: invoiceFilter,
                select: { id: true, status: true, amount: true, dueDate: true },
                orderBy: { dueDate: "desc" },
            },
        },
    });
    if (!tenant) {
        return res.status(404).json({ message: "المستأجر غير موجود" });
    }
    if (pid) {
        const belongsToProperty = tenant.contracts.some((contract) => contract.unit?.propertyId === pid);
        if (!belongsToProperty) {
            return res.status(404).json({ message: "المستأجر غير مرتبط بهذا العقار" });
        }
    }
    return res.json(enrichTenant(tenant));
}
export async function updateTenant(req, res) {
    const { id } = req.params;
    const tenantId = Number(id);
    if (!tenantId) {
        return res.status(400).json({ message: "معرّف المستأجر غير صالح" });
    }
    const data = {};
    const allowed = [
        "name",
        "phone",
        "email",
        "nationalId",
        "birthDate",
        "gender",
        "nationality",
        "address",
        "city",
        "country",
        "employer",
        "emergencyContactName",
        "emergencyContactPhone",
        "notes",
    ];
    for (const key of allowed) {
        if (req.body[key] !== undefined) {
            data[key] = req.body[key];
        }
    }
    if (data.birthDate) {
        const dt = new Date(String(data.birthDate));
        if (Number.isNaN(dt.getTime())) {
            return res.status(400).json({ message: "تاريخ الميلاد غير صالح" });
        }
        data.birthDate = dt;
    }
    try {
        const updated = await prisma.tenant.update({
            where: { id: tenantId },
            data,
        });
        res.json({ message: "تم تحديث بيانات المستأجر بنجاح", tenant: updated });
    }
    catch (e) {
        if (e?.code === "P2002") {
            return res.status(409).json({ message: "الهوية الوطنية مستخدمة بالفعل" });
        }
        res.status(500).json({ message: e?.message || "تعذر تحديث المستأجر" });
    }
}
export async function deleteTenant(req, res) {
    const { id } = req.params;
    const tenantId = Number(id);
    if (!tenantId) {
        return res.status(400).json({ message: "معرّف المستأجر غير صالح" });
    }
    try {
        await prisma.$transaction(async (tx) => {
            await tx.contract.deleteMany({ where: { tenantId } });
            await tx.invoice.deleteMany({ where: { tenantId } });
            await tx.booking.deleteMany({ where: { tenantId } });
            await tx.tenant.delete({ where: { id: tenantId } });
        });
        res.json({ message: "تم حذف المستأجر بنجاح" });
    }
    catch (e) {
        res.status(500).json({ message: e?.message || "تعذر حذف المستأجر" });
    }
}
function enrichTenant(tenant) {
    const { contracts, invoices, birthDate, createdAt, ...rest } = tenant;
    const activeContracts = contracts.filter((c) => c.status === "ACTIVE");
    const latestContract = contracts[0] || null;
    const pendingInvoices = invoices.filter((inv) => inv.status === "PENDING");
    const receivables = pendingInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const lastInvoice = invoices[0] || null;
    const contractPayload = contracts.map((contract) => ({
        id: contract.id,
        status: contract.status,
        rentalType: contract.rentalType,
        startDate: contract.startDate.toISOString(),
        endDate: contract.endDate.toISOString(),
        unitNumber: contract.unit?.number || contract.unit?.unitNumber || null,
        propertyName: contract.unit?.property?.name || null,
        propertyId: contract.unit?.propertyId ?? null,
        rentAmount: contract.rentAmount,
        amount: contract.amount,
        deposit: contract.deposit ?? null,
        ejarContractNumber: contract.ejarContractNumber || null,
        paymentMethod: contract.paymentMethod || null,
        paymentFrequency: contract.paymentFrequency || null,
        servicesIncluded: contract.servicesIncluded || null,
        notes: contract.notes || null,
    }));
    const invoicePayload = invoices.map((invoice) => ({
        id: invoice.id,
        status: invoice.status,
        amount: invoice.amount,
        dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
    }));
    return {
        ...rest,
        birthDate: birthDate ? birthDate.toISOString() : null,
        createdAt: createdAt.toISOString(),
        stats: {
            totalContracts: contracts.length,
            activeContracts: activeContracts.length,
            totalInvoices: invoices.length,
            pendingInvoices: pendingInvoices.length,
            lastInvoiceDueDate: lastInvoice?.dueDate ? lastInvoice.dueDate.toISOString() : null,
            receivables,
            latestContract: latestContract
                ? {
                    id: latestContract.id,
                    status: latestContract.status,
                    rentalType: latestContract.rentalType,
                    startDate: latestContract.startDate.toISOString(),
                    endDate: latestContract.endDate.toISOString(),
                    unitNumber: latestContract.unit?.number || latestContract.unit?.unitNumber || null,
                    propertyName: latestContract.unit?.property?.name || null,
                    propertyId: latestContract.unit?.propertyId ?? null,
                    rentAmount: latestContract.rentAmount,
                    amount: latestContract.amount,
                    deposit: latestContract.deposit ?? null,
                    ejarContractNumber: latestContract.ejarContractNumber || null,
                    paymentMethod: latestContract.paymentMethod || null,
                    paymentFrequency: latestContract.paymentFrequency || null,
                    servicesIncluded: latestContract.servicesIncluded || null,
                    notes: latestContract.notes || null,
                }
                : null,
        },
        recentContracts: contractPayload.slice(0, 3),
        contracts: contractPayload,
        invoices: invoicePayload,
    };
}
