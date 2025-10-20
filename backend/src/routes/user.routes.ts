import { Router } from "express";
import { listUsers, createUser, updateUser, resetUserPassword } from "../controllers/user.controller.js";
import { authGuard } from "../middlewares/auth.js";
import { requirePermission } from "../middlewares/permission.js";

const router = Router();

router.get("/", authGuard, requirePermission("users.view"), listUsers);
router.post("/", authGuard, requirePermission("users.edit"), createUser);
router.put("/:id", authGuard, requirePermission("users.edit"), updateUser);
router.patch("/:id/password", authGuard, requirePermission("users.edit"), resetUserPassword);

export default router;

