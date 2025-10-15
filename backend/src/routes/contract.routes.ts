import express from "express";
import multer from "multer";
import {
  getContracts,
  createContract,
  updateContract,
  deleteContract,
  endContract,
  importContractsCsv
} from "../controllers/contract.controller.ts";
import { authGuard } from "../middlewares/auth.ts";
import { requirePermission } from "../middlewares/permission.ts";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", authGuard, requirePermission("contracts.view"), getContracts);
router.post("/", authGuard, requirePermission("contracts.edit"), createContract);
router.put("/:id", authGuard, requirePermission("contracts.edit"), updateContract);
router.delete("/:id", authGuard, requirePermission("contracts.delete"), deleteContract);
router.patch("/:id/end", authGuard, requirePermission("contracts.end"), endContract);
router.post("/import", authGuard, requirePermission("contracts.edit"), upload.single('file'), importContractsCsv);


export default router;
