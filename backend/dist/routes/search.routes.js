import { Router } from "express";
import { globalSearch } from "../controllers/search.controller.js";
import { authGuard } from "../middlewares/auth.js";
import { requirePermission } from "../middlewares/permission.js";
const router = Router();
router.get("/", authGuard, requirePermission("dashboard.view"), globalSearch);
export default router;
