import { Router } from "express";
import { login, register, forgotPassword, resetPassword, changePasswordMe } from "../controllers/auth.controller.ts";
import { authGuard } from "../middlewares/auth.ts";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot", forgotPassword);
router.post("/reset", resetPassword);
router.patch("/me/password", authGuard, changePasswordMe);

export default router;
