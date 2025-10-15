import { Router } from "express";
import { listTenants } from "../controllers/tenant.controller.ts";
import { authGuard } from "../middlewares/auth.ts";

const router = Router();
router.get("/", authGuard, listTenants);
export default router;

