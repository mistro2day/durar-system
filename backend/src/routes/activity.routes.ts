import { Router } from "express";
import { listActivityLogs } from "../controllers/activity.controller.js";
import { authGuard } from "../middlewares/auth.js";
import { requirePermission } from "../middlewares/permission.js";

const router = Router();

router.get("/", authGuard, requirePermission("activity.view"), listActivityLogs);

export default router;

