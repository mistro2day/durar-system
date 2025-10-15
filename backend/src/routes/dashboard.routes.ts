import express from "express";
import { getDashboardStats, getDashboardSummary } from "../controllers/dashboard.controller.ts";
import { authGuard } from "../middlewares/auth.ts";
import { requirePermission } from "../middlewares/permission.ts";

const router = express.Router();

// 📊 لوحة التحكم
router.get("/", authGuard, requirePermission("dashboard.view"), getDashboardStats);
router.get("/summary", authGuard, requirePermission("dashboard.view"), getDashboardSummary);

export default router;
