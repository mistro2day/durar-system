import { Router } from "express";
import { getUnits, getUnitById, createUnit, updateUnit, deleteUnit, importUnitsCsv, deleteUnitsByProperty, } from "../controllers/unit.controller.js";
import multer from "multer";
import { authGuard } from "../middlewares/auth.js";
import { requirePermission } from "../middlewares/permission.js";
const router = Router();
// 🏢 عرض كل الوحدات
router.get("/", authGuard, requirePermission("units.view"), getUnits);
// 🔍 عرض وحدة محددة
router.get("/:id", authGuard, requirePermission("units.view"), getUnitById);
// ➕ إنشاء وحدة جديدة
router.post("/", authGuard, requirePermission("units.edit"), createUnit);
// ✏️ تحديث بيانات وحدة
router.patch("/:id", authGuard, requirePermission("units.edit"), updateUnit);
// ❌ حذف وحدة
router.delete("/:id", authGuard, requirePermission("units.edit"), deleteUnit);
// ❌ حذف كل وحدات عقار
router.delete("/by-property/:propertyId", authGuard, requirePermission("units.edit"), deleteUnitsByProperty);
// استيراد CSV
const upload = multer({ storage: multer.memoryStorage() });
router.post("/import", authGuard, requirePermission("units.edit"), upload.single('file'), importUnitsCsv);
export default router;
