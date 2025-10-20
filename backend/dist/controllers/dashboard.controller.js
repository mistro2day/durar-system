import prisma from "../lib/prisma.js";
const cache = new Map();
const TTL_MS = Number(process.env.DASHBOARD_CACHE_TTL_MS || 10_000);
function getCache(key) {
    const e = cache.get(key);
    if (e && e.expire > Date.now())
        return e.payload;
    if (e)
        cache.delete(key);
    return null;
}
function setCache(key, payload) {
    cache.set(key, { expire: Date.now() + TTL_MS, payload });
}
// 📊 لوحة التحكم الرئيسية
export const getDashboardStats = async (req, res) => {
    try {
        const { propertyId } = req.query;
        const cacheKey = `stats:${propertyId || 'all'}`;
        const cached = getCache(cacheKey);
        if (cached)
            return res.json(cached);
        const unitScope = propertyId ? { propertyId: Number(propertyId) } : undefined;
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const [activeContracts, endedContracts, availableUnits, occupiedUnits, openTickets, inProgressTickets, newContractsThisMonth,] = await prisma.$transaction([
            prisma.contract.count({ where: { status: "ACTIVE", unit: unitScope } }),
            prisma.contract.count({ where: { status: "ENDED", unit: unitScope } }),
            prisma.unit.count({
                where: { status: "AVAILABLE", ...(unitScope ? { propertyId: unitScope.propertyId } : {}) },
            }),
            prisma.unit.count({
                where: { status: "OCCUPIED", ...(unitScope ? { propertyId: unitScope.propertyId } : {}) },
            }),
            prisma.maintenanceTicket.count({ where: { status: "NEW", unit: unitScope } }),
            prisma.maintenanceTicket.count({
                where: { status: "IN_PROGRESS", unit: unitScope },
            }),
            prisma.contract.count({
                where: { createdAt: { gte: startOfMonth }, unit: unitScope },
            }),
        ]);
        // 💵 الإيرادات الشهرية
        const monthlyRevenue = await prisma.payment.aggregate({
            _sum: { amount: true },
            where: {
                paidAt: { gte: startOfMonth },
                ...(propertyId
                    ? { invoice: { contract: { unit: { propertyId: Number(propertyId) } } } }
                    : {}),
            },
        });
        // 🕒 آخر 5 أنشطة من جدول ActivityLog
        const recentActivities = await prisma.activityLog.findMany({
            where: propertyId ? { contract: { unit: unitScope } } : undefined,
            orderBy: { createdAt: "desc" },
            take: 5,
            include: { user: true },
        });
        const payload = {
            summary: {
                contracts: {
                    active: activeContracts,
                    ended: endedContracts,
                    newThisMonth: newContractsThisMonth,
                },
                units: {
                    available: availableUnits,
                    occupied: occupiedUnits,
                },
                maintenance: {
                    open: openTickets,
                    inProgress: inProgressTickets,
                },
                revenue: monthlyRevenue._sum.amount || 0,
            },
            activities: recentActivities.map((a) => ({
                id: a.id,
                action: a.action,
                description: a.description,
                createdAt: a.createdAt,
                user: a.user ? a.user.name : "نظام تلقائي",
            })),
            lastUpdated: new Date(),
        };
        setCache(cacheKey, payload);
        res.json(payload);
    }
    catch (err) {
        console.error("❌ خطأ في لوحة التحكم:", err);
        res.status(500).json({ message: err.message });
    }
};
// نسخة موسّعة لواجهة ملخص لوحة التحكم + بيانات للمخططات
export const getDashboardSummary = async (req, res) => {
    try {
        const { propertyId } = req.query;
        const cacheKey = `summary:${propertyId || 'all'}`;
        const cached = getCache(cacheKey);
        if (cached)
            return res.json(cached);
        const unitScope = propertyId ? { propertyId: Number(propertyId) } : undefined;
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        // سلسلة الإيرادات لآخر 6 أشهر (حسب الفواتير)
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const invoices = await prisma.invoice.findMany({
            where: {
                dueDate: { gte: sixMonthsAgo },
                ...(propertyId ? { contract: { unit: { propertyId: Number(propertyId) } } } : {}),
            },
            select: { amount: true, dueDate: true },
        });
        const buckets = new Map();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            buckets.set(`${d.getFullYear()}-${d.getMonth() + 1}`, 0);
        }
        for (const inv of invoices) {
            const d = inv.dueDate;
            const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
            if (buckets.has(key))
                buckets.set(key, (buckets.get(key) || 0) + Number(inv.amount || 0));
        }
        const revenueSeries = Array.from(buckets.entries()).map(([key, value]) => ({ key, value }));
        // إشغال الوحدات (توزيع الحالات)
        // العقود القريبة الانتهاء (عدّاد أسبوع/شهر)
        const endWeek = new Date(now);
        endWeek.setDate(endWeek.getDate() + 7);
        const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0); // نهاية الشهر
        const [activeContracts, endedContracts, availableUnits, occupiedUnits, openTickets, inProgressTickets, newContractsThisMonth, maintUnits, weekCount, monthCount,] = await prisma.$transaction([
            prisma.contract.count({ where: { status: "ACTIVE", unit: unitScope } }),
            prisma.contract.count({ where: { status: "ENDED", unit: unitScope } }),
            prisma.unit.count({
                where: { status: "AVAILABLE", ...(unitScope ? { propertyId: unitScope.propertyId } : {}) },
            }),
            prisma.unit.count({
                where: { status: "OCCUPIED", ...(unitScope ? { propertyId: unitScope.propertyId } : {}) },
            }),
            prisma.maintenanceTicket.count({ where: { status: "NEW", unit: unitScope } }),
            prisma.maintenanceTicket.count({
                where: { status: "IN_PROGRESS", unit: unitScope },
            }),
            prisma.contract.count({ where: { createdAt: { gte: startOfMonth }, unit: unitScope } }),
            prisma.unit.count({
                where: { status: "MAINTENANCE", ...(unitScope ? { propertyId: unitScope.propertyId } : {}) },
            }),
            prisma.contract.count({
                where: { status: "ACTIVE", endDate: { gte: now, lte: endWeek }, unit: unitScope },
            }),
            prisma.contract.count({
                where: { status: "ACTIVE", endDate: { gte: now, lte: endMonth }, unit: unitScope },
            }),
        ]);
        // أحدث 5 أنشطة (للتوافق مع الواجهة)
        const recentActivities = await prisma.activityLog.findMany({
            where: propertyId ? { contract: { unit: unitScope } } : undefined,
            orderBy: { createdAt: "desc" },
            take: 5,
            include: { user: true },
        });
        const payload = {
            summary: {
                contracts: { active: activeContracts, ended: endedContracts, newThisMonth: newContractsThisMonth },
                units: { available: availableUnits, occupied: occupiedUnits, maintenance: maintUnits },
                maintenance: { open: openTickets, inProgress: inProgressTickets },
                revenue: revenueSeries[revenueSeries.length - 1]?.value || 0,
            },
            charts: {
                revenueLast6Months: revenueSeries,
                occupancy: {
                    labels: ["متاحة", "مشغولة", "صيانة"],
                    values: [availableUnits, occupiedUnits, maintUnits],
                },
                expiring: { week: weekCount, month: monthCount },
            },
            activities: recentActivities.map((a) => ({
                id: a.id,
                action: a.action,
                description: a.description,
                createdAt: a.createdAt,
                user: a.user ? a.user.name : "نظام تلقائي",
            })),
            lastUpdated: new Date(),
        };
        setCache(cacheKey, payload);
        res.json(payload);
    }
    catch (err) {
        console.error("❌ خطأ في ملخص لوحة التحكم:", err);
        res.status(500).json({ message: err.message });
    }
};
