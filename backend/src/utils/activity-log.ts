import type { PrismaClient } from "@prisma/client";
import type { Request } from "express";

type Actor = {
  id?: number;
  name?: string;
  role?: string;
};

export type ActivityLogPayload = {
  action: string;
  description: string;
  contractId?: number | null;
};

function resolveActor(req?: Request): Actor | undefined {
  return (req as any)?.user as Actor | undefined;
}

/**
 * سجل نشاط الموظفين بطريقة مركزية مع تجاهل الأخطاء حتى لا تؤثر على مسار التنفيذ الرئيسي.
 */
export async function logActivity(
  prisma: PrismaClient,
  req: Request | undefined,
  payload: ActivityLogPayload
) {
  try {
    const actor = resolveActor(req);
    const actorId = actor?.id ? Number(actor.id) : null;

    // 🔬 التحقق من وجود المستخدم في قاعدة البيانات لتجنب خطأ Foreign Key
    if (actorId) {
      const userExists = await prisma.user.findUnique({ where: { id: actorId }, select: { id: true } });
      if (!userExists) {
        console.warn(`⚠️ محاولة تسجيل نشاط لمستخدم غير موجود (ID: ${actorId}). تم التسجيل بدون ربط المستخدم.`);
        await prisma.activityLog.create({
          data: {
            action: payload.action,
            description: payload.description.slice(0, 1000),
            contractId: payload.contractId ?? null,
            userId: null, // سجل بدون مستخدم
          },
        });
        return;
      }
    }

    await prisma.activityLog.create({
      data: {
        action: payload.action,
        description: payload.description.slice(0, 1000),
        contractId: payload.contractId ?? null,
        userId: actorId,
      },
    });
  } catch (error) {
    console.error("⚠️ تعذر تسجيل النشاط:", error);
  }
}

