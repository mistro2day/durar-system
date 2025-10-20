import prisma from "../lib/prisma.js";
import prismaPkg from "@prisma/client";
import { logActivity } from "../utils/activity-log.js";
const { Prisma } = prismaPkg;
export async function listProperties(req, res) {
    const { type } = req.query;
    const where = {};
    if (type)
        where.type = String(type).toUpperCase();
    const properties = await prisma.property.findMany({
        where,
        orderBy: { name: "asc" },
        include: { _count: { select: { units: true } } },
    });
    if (properties.length === 0) {
        return res.json([]);
    }
    const propertyIds = properties.map((p) => p.id);
    const tenantCountsRaw = await prisma.$queryRaw(Prisma.sql `
    SELECT u."propertyId" AS "propertyId", COUNT(DISTINCT c."tenantId") AS "tenantsCount"
    FROM "Contract" c
    JOIN "Unit" u ON u.id = c."unitId"
    WHERE u."propertyId" IN (${Prisma.join(propertyIds)})
    GROUP BY u."propertyId"
  `);
    const invoiceCountsRaw = await prisma.$queryRaw(Prisma.sql `
    SELECT u."propertyId" AS "propertyId", COUNT(i.id) AS "invoicesCount"
    FROM "Invoice" i
    JOIN "Contract" c ON c.id = i."contractId"
    JOIN "Unit" u ON u.id = c."unitId"
    WHERE u."propertyId" IN (${Prisma.join(propertyIds)})
    GROUP BY u."propertyId"
  `);
    const tenantMap = new Map(tenantCountsRaw.map((row) => [row.propertyId, Number(row.tenantsCount || 0)]));
    const invoiceMap = new Map(invoiceCountsRaw.map((row) => [row.propertyId, Number(row.invoicesCount || 0)]));
    const results = properties.map((p) => ({
        ...p,
        tenantsCount: tenantMap.get(p.id) ?? 0,
        invoicesCount: invoiceMap.get(p.id) ?? 0,
    }));
    res.json(results);
}
// جلب عقار محدد
export async function getProperty(req, res) {
    const { id } = req.params;
    const p = await prisma.property.findUnique({ where: { id: Number(id) } });
    if (!p)
        return res.status(404).json({ message: "العقار غير موجود" });
    res.json(p);
}
// إنشاء عقار جديد (يدعم إنشاء وحدات اختيارياً)
export async function createProperty(req, res) {
    try {
        const { name, type, address, units } = req.body;
        if (!name)
            return res.status(400).json({ message: "الاسم مطلوب" });
        const data = {
            name,
            type: (type || 'BUILDING').toUpperCase(),
            address: address || null,
        };
        // وحدات اختيارية: يمكن إرسال مصفوفة من الأسماء أو كائنات فيها number,floor,...
        if (Array.isArray(units) && units.length) {
            const createUnits = units.map((u) => {
                const number = typeof u === 'string' ? u : (u?.number ?? u?.unitNumber);
                return {
                    number: String(number),
                    type: ((typeof u === 'object' && u?.type) ? String(u.type).toUpperCase() : 'MONTHLY'),
                    status: 'AVAILABLE',
                    floor: (typeof u === 'object' && u?.floor != null) ? Number(u.floor) : undefined,
                    rooms: (typeof u === 'object' && u?.rooms != null) ? Number(u.rooms) : undefined,
                    baths: (typeof u === 'object' && u?.baths != null) ? Number(u.baths) : undefined,
                    area: (typeof u === 'object' && u?.area != null) ? Number(u.area) : undefined,
                };
            });
            data.units = { create: createUnits };
        }
        const created = await prisma.property.create({ data });
        await logActivity(prisma, req, {
            action: "PROPERTY_CREATE",
            description: `إضافة عقار جديد (${name})`,
        });
        res.json(created);
    }
    catch (e) {
        res.status(500).json({ message: e?.message || 'تعذر إنشاء العقار' });
    }
}
// تحديث عقار
export async function updateProperty(req, res) {
    try {
        const { id } = req.params;
        const { name, type, address } = req.body;
        const data = {};
        if (name !== undefined)
            data.name = name;
        if (type !== undefined)
            data.type = String(type).toUpperCase();
        if (address !== undefined)
            data.address = address;
        const updated = await prisma.property.update({ where: { id: Number(id) }, data });
        await logActivity(prisma, req, {
            action: "PROPERTY_UPDATE",
            description: `تحديث بيانات العقار (${updated.name})`,
        });
        res.json(updated);
    }
    catch (e) {
        res.status(500).json({ message: e?.message || 'تعذر تحديث العقار' });
    }
}
