function resolveActor(req) {
    return req?.user;
}
/**
 * سجل نشاط الموظفين بطريقة مركزية مع تجاهل الأخطاء حتى لا تؤثر على مسار التنفيذ الرئيسي.
 */
export async function logActivity(prisma, req, payload) {
    try {
        const actor = resolveActor(req);
        await prisma.activityLog.create({
            data: {
                action: payload.action,
                description: payload.description.slice(0, 1000),
                contractId: payload.contractId ?? null,
                userId: actor?.id ?? null,
            },
        });
    }
    catch (error) {
        console.error("⚠️ تعذر تسجيل النشاط:", error);
    }
}
