import { Router } from "express";
import { getPermissions, updatePermissions } from "../controllers/settings.controller.js";
import { authGuard } from "../middlewares/auth.js";
import { requirePermission } from "../middlewares/permission.js";
const router = Router();
// مبدئياً: حماية بسيطة بالتوكن فقط؛ يمكن إضافة تحقق دور ADMIN لاحقاً
router.get("/permissions", authGuard, requirePermission("settings.view"), getPermissions);
router.put("/permissions", authGuard, requirePermission("settings.edit"), updatePermissions);
export default router;
