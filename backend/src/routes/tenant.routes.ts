import { Router } from "express";
import { listTenants, getTenantById, updateTenant, deleteTenant } from "../controllers/tenant.controller.ts";
import { authGuard } from "../middlewares/auth.ts";
import { requirePermission } from "../middlewares/permission.ts";

const router = Router();
router.get("/", authGuard, requirePermission("tenants.view"), listTenants);
router.get("/:id", authGuard, requirePermission("tenants.view"), getTenantById);
router.patch("/:id", authGuard, requirePermission("tenants.edit"), updateTenant);
router.delete("/:id", authGuard, requirePermission("tenants.delete"), deleteTenant);
export default router;
