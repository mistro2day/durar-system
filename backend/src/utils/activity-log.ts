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
    await prisma.activityLog.create({
      data: {
        action: payload.action,
        description: payload.description.slice(0, 1000),
        contractId: payload.contractId ?? null,
        userId: actor?.id ?? null,
      },
    });
  } catch (error) {
    console.error("⚠️ تعذر تسجيل النشاط:", error);
  }
}

