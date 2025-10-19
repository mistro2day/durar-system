import { PrismaClient } from "../lib/prisma.js";
const prisma = new PrismaClient();
// هيكل افتراضي لصلاحيات الواجهة (يتطابق مع الواجهة الأمامية)
const DEFAULT_PERMISSIONS = {
    roles: ["ADMIN", "MANAGER", "STAFF"],
    permissions: {
        ADMIN: "*",
        MANAGER: [
            "dashboard.view",
            "contracts.view",
            "contracts.edit",
            "contracts.end",
            "invoices.view",
            "invoices.edit",
            "units.view",
            "units.edit",
            "maintenance.view",
            "maintenance.edit",
            "users.view",
            "settings.view",
        ],
        STAFF: [
            "dashboard.view",
            "contracts.view",
            "invoices.view",
            "units.view",
            "maintenance.view",
        ],
    },
};
export async function getPermissions(_req, res) {
    const row = await prisma.setting.findUnique({ where: { key: "permissions" } });
    if (!row)
        return res.json(DEFAULT_PERMISSIONS);
    return res.json(row.value);
}
export async function updatePermissions(req, res) {
    const payload = req.body;
    if (!payload || typeof payload !== "object") {
        return res.status(400).json({ message: "بيانات غير صالحة" });
    }
    const row = await prisma.setting.upsert({
        where: { key: "permissions" },
        update: { value: payload },
        create: { key: "permissions", value: payload },
    });
    return res.json({ message: "تم حفظ الصلاحيات", updatedAt: row.updatedAt });
}
