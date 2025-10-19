import { Router } from "express";
import { createTicket, getTickets, updateTicketStatus, addAction, deleteTicket, } from "../controllers/maintenance.controller.js";
import { authGuard } from "../middlewares/auth.js";
import { requirePermission } from "../middlewares/permission.js";
const router = Router();
// 📋 عرض جميع البلاغات
router.get("/", authGuard, requirePermission("maintenance.view"), getTickets);
// 🆕 إنشاء بلاغ جديد
router.post("/", authGuard, requirePermission("maintenance.edit"), createTicket);
// 🔄 تحديث حالة البلاغ
router.patch("/:id/status", authGuard, requirePermission("maintenance.edit"), updateTicketStatus);
// 🧰 إضافة إجراء صيانة
router.post("/action", authGuard, requirePermission("maintenance.edit"), addAction);
// 🗑️ حذف بلاغ صيانة
router.delete("/:id", authGuard, requirePermission("maintenance.edit"), deleteTicket);
export default router;
