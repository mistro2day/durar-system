import express from "express";
import {
  getContractsReport,
  getFinancialReport,
  getMaintenanceReport
} from "../controllers/reports.controller.js";

const router = express.Router();

router.get("/contracts", getContractsReport);
router.get("/financial", getFinancialReport);
router.get("/maintenance", getMaintenanceReport);

export default router;
