import { Router } from "express";
import { uploadAttachment, getAttachments, deleteAttachment } from "../controllers/attachment.controller.js";
import { authGuard } from "../middlewares/auth.js";
import { upload } from "../lib/multer.js";

const router = Router();

// Get all attachments for a tenant
router.get("/:tenantId", authGuard, getAttachments);

// Upload a new attachment
router.post("/:tenantId", authGuard, upload.single("file"), uploadAttachment);

// Delete an attachment
router.delete("/:id", authGuard, deleteAttachment);

export default router;
