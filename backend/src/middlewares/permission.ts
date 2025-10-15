import type { Response, NextFunction } from "express";
import type { AuthedRequest } from "./auth.ts";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT = {
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
} as const;

type RoleKey = keyof typeof DEFAULT.permissions;

async function loadPermissions() {
  const row = await prisma.setting.findUnique({ where: { key: "permissions" } });
  return row?.value || DEFAULT;
}

export function requirePermission(permission: string) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const userRoleRaw = req.user?.role || "USER";
      const mapRole: Record<string, RoleKey> = {
        ADMIN: "ADMIN",
        MANAGER: "MANAGER",
        STAFF: "STAFF",
        USER: "MANAGER", // منح مستخدم النظام الحالي صلاحيات تحرير أساسية
      };
      const role = mapRole[userRoleRaw] || "STAFF";
      const conf = await loadPermissions();
      const set = conf.permissions[role as any];
      if (set === "*" || (Array.isArray(set) && set.includes(permission))) {
        return next();
      }
      return res.status(403).json({ message: "ليس لديك صلاحية للوصول" });
    } catch (e) {
      return res.status(403).json({ message: "فشل التحقق من الصلاحيات" });
    }
  };
}
