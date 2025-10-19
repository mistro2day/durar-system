import type { Response, NextFunction } from "express";
import type { AuthedRequest } from "./auth.ts";
import prisma from "../lib/prisma.ts";


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
      "tenants.view",
      "tenants.edit",
      "tenants.delete",
      "users.view",
      "settings.view",
      "activity.view",
    ],
    STAFF: [
      "dashboard.view",
      "contracts.view",
      "invoices.view",
      "units.view",
      "maintenance.view",
      "tenants.view",
    ],
  },
} as const;

type RoleKey = keyof typeof DEFAULT.permissions;
type PermissionValue = string[] | "*";

function mergePermissionMaps(
  defaults: Record<string, PermissionValue>,
  stored?: Record<string, PermissionValue>
) {
  if (!stored) return { ...defaults };
  const result: Record<string, PermissionValue> = { ...defaults };
  for (const [role, value] of Object.entries(stored)) {
    if (value === "*") {
      result[role] = "*";
      continue;
    }
    const base = result[role];
    if (base === "*") {
      result[role] = "*";
      continue;
    }
    const baseList = Array.isArray(base) ? base : [];
    const incoming = Array.isArray(value) ? value : [];
    result[role] = Array.from(new Set([...baseList, ...incoming]));
  }
  return result;
}

async function loadPermissions() {
  const row = await prisma.setting.findUnique({ where: { key: "permissions" } });
  const value: any = row?.value;
  if (!value) return DEFAULT;
  return {
    ...DEFAULT,
    ...value,
    permissions: {
      ...mergePermissionMaps(DEFAULT.permissions, value?.permissions),
    },
  };
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
