import { PrismaClient } from "../lib/prisma.js";
import { logActivity } from "../utils/activity-log.js";
import { getPagination } from "../utils/pagination.js";
const prisma = new PrismaClient();
// 🆕 إنشاء بلاغ صيانة
export const createTicket = async (req, res) => {
    try {
        const { unitId, description, priority } = req.body;
        const ticket = await prisma.maintenanceTicket.create({
            data: {
                unitId,
                description,
                priority: priority ?? "MEDIUM",
                status: "NEW",
            },
        });
        await logActivity(prisma, req, {
            action: "MAINTENANCE_CREATE",
            description: `إنشاء بلاغ صيانة للوحدة #${unitId}: ${String(description).slice(0, 120)}`,
        });
        res.json(ticket);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};
// 📋 عرض جميع البلاغات
export const getTickets = async (req, res) => {
    const { propertyId } = req.query;
    const where = {};
    if (propertyId)
        where.unit = { propertyId: Number(propertyId) };
    const pg = getPagination(req);
    if (!pg) {
        const tickets = await prisma.maintenanceTicket.findMany({ where, include: { unit: true }, orderBy: { createdAt: "desc" } });
        return res.json(tickets);
    }
    const [items, total] = await Promise.all([
        prisma.maintenanceTicket.findMany({ where, include: { unit: true }, orderBy: { createdAt: "desc" }, skip: pg.skip, take: pg.take }),
        prisma.maintenanceTicket.count({ where }),
    ]);
    res.json({ items, total, page: pg.page, pageSize: pg.pageSize });
};
// 🔄 تحديث حالة البلاغ
export const updateTicketStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await prisma.maintenanceTicket.update({
        where: { id: Number(id) },
        data: { status },
        include: { unit: { select: { number: true } } },
    });
    await logActivity(prisma, req, {
        action: "MAINTENANCE_STATUS_UPDATE",
        description: `تحديث حالة بلاغ الصيانة #${id} إلى ${status} للوحدة ${updated.unit?.number ?? updated.unitId}`,
    });
    res.json(updated);
};
// 🧰 إضافة إجراء صيانة
export const addAction = async (req, res) => {
    const { ticketId, actionTaken, performedBy } = req.body;
    const action = await prisma.maintenanceAction.create({
        data: { ticketId, actionTaken, performedBy },
    });
    await logActivity(prisma, req, {
        action: "MAINTENANCE_ACTION_ADD",
        description: `إضافة إجراء صيانة للبلاغ #${ticketId}: ${String(actionTaken).slice(0, 120)}`,
    });
    res.json(action);
};
// 🗑️ حذف بلاغ صيانة
export const deleteTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const ticketId = Number(id);
        if (!ticketId) {
            return res.status(400).json({ message: "رقم البلاغ غير صالح" });
        }
        const ticket = await prisma.maintenanceTicket.findUnique({
            where: { id: ticketId },
            select: { unitId: true, unit: { select: { number: true } }, description: true },
        });
        await prisma.$transaction([
            prisma.maintenanceAction.deleteMany({ where: { ticketId } }),
            prisma.maintenanceTicket.delete({ where: { id: ticketId } }),
        ]);
        await logActivity(prisma, req, {
            action: "MAINTENANCE_DELETE",
            description: `حذف بلاغ الصيانة #${ticketId} للوحدة ${ticket?.unit?.number ?? ticket?.unitId ?? ""}`.trim(),
        });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};
