import { Router } from "express";
import { globalSearch } from "../controllers/search.controller.ts";
import { authGuard } from "../middlewares/auth.ts";
import { requirePermission } from "../middlewares/permission.ts";

const router = Router();

router.get("/", authGuard, requirePermission("dashboard.view"), globalSearch);

export default router;
