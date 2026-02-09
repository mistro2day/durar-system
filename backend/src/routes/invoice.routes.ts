import { Router } from "express";
import { getInvoices, updateInvoiceStatus, createInvoice, recordPayment, getInvoicePayments, updatePayment, deletePayment, sendInvoiceReminder } from "../controllers/invoice.controller.js";
import { authGuard } from "../middlewares/auth.js";
import { requirePermission } from "../middlewares/permission.js";

const router = Router();

router.get("/", authGuard, requirePermission("invoices.view"), getInvoices);
router.get("/:id/payments", authGuard, requirePermission("invoices.view"), getInvoicePayments);
router.patch("/:id", authGuard, requirePermission("invoices.edit"), updateInvoiceStatus);
router.patch("/payments/:paymentId", authGuard, requirePermission("invoices.edit"), updatePayment);
router.post("/", authGuard, requirePermission("invoices.edit"), createInvoice);
router.post("/:id/payments", authGuard, requirePermission("invoices.edit"), recordPayment);
router.post("/:id/reminder", authGuard, requirePermission("invoices.edit"), sendInvoiceReminder);
router.delete("/payments/:paymentId", authGuard, requirePermission("invoices.edit"), deletePayment);

export default router;
