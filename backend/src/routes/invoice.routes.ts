import { Router } from "express";
import { getInvoices, updateInvoiceStatus, createInvoice } from "../controllers/invoice.controller.ts";
import { authGuard } from "../middlewares/auth.ts";
import { requirePermission } from "../middlewares/permission.ts";

const router = Router();

router.get("/", authGuard, requirePermission("invoices.view"), getInvoices);
router.patch("/:id", authGuard, requirePermission("invoices.edit"), updateInvoiceStatus);
router.post("/", authGuard, requirePermission("invoices.edit"), createInvoice);

export default router;
