import { Router } from "express";
import {
  createTicket,
  getTickets,
  updateTicketStatus,
  addAction,
} from "../controllers/maintenance.controller.ts";
import { authGuard } from "../middlewares/auth.ts";
import { requirePermission } from "../middlewares/permission.ts";

const router = Router();

// 📋 عرض جميع البلاغات
router.get("/", authGuard, requirePermission("maintenance.view"), getTickets);

// 🆕 إنشاء بلاغ جديد
router.post("/", authGuard, requirePermission("maintenance.edit"), createTicket);

// 🔄 تحديث حالة البلاغ
router.patch("/:id/status", authGuard, requirePermission("maintenance.edit"), updateTicketStatus);

// 🧰 إضافة إجراء صيانة
router.post("/action", authGuard, requirePermission("maintenance.edit"), addAction);

export default router;
