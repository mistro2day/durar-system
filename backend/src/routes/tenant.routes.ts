import { Router } from "express";
import { listTenants, getTenantById, updateTenant, deleteTenant, addCommunicationLog } from "../controllers/tenant.controller.js";
import { authGuard } from "../middlewares/auth.js";
import { requirePermission } from "../middlewares/permission.js";

const router = Router();
router.get("/", authGuard, requirePermission("tenants.view"), listTenants);
router.get("/:id", authGuard, requirePermission("tenants.view"), getTenantById);
router.patch("/:id", authGuard, requirePermission("tenants.edit"), updateTenant);
router.delete("/:id", authGuard, requirePermission("tenants.delete"), deleteTenant);
router.post("/:id/logs", authGuard, requirePermission("tenants.edit"), addCommunicationLog);
export default router;
