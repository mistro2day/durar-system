import express from "express";
import { getDashboardStats, getDashboardSummary } from "../controllers/dashboard.controller.js";
import { authGuard } from "../middlewares/auth.js";
import { requirePermission } from "../middlewares/permission.js";

const router = express.Router();

// 📊 لوحة التحكم
router.get("/", authGuard, requirePermission("dashboard.view"), getDashboardStats);
router.get("/summary", authGuard, requirePermission("dashboard.view"), getDashboardSummary);

export default router;
