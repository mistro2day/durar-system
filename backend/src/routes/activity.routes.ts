import { Router } from "express";
import { listActivityLogs } from "../controllers/activity.controller.ts";
import { authGuard } from "../middlewares/auth.ts";
import { requirePermission } from "../middlewares/permission.ts";

const router = Router();

router.get("/", authGuard, requirePermission("activity.view"), listActivityLogs);

export default router;

