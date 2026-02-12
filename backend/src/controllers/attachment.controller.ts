import { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import fs from "fs";
import path from "path";

export const uploadAttachment = async (req: Request, res: Response) => {
    try {
        const { tenantId } = req.params;
        const { fileType, description } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        if (!tenantId) {
            return res.status(400).json({ message: "Tenant ID is required" });
        }

        const attachment = await prisma.tenantAttachment.create({
            data: {
                tenantId: parseInt(tenantId),
                fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
                filePath: file.path,
                fileType: fileType || "OTHER",
                description: description,
            },
        });

        res.status(201).json(attachment);
    } catch (error: any) {
        console.error("Error uploading attachment:", error);
        res.status(500).json({ message: "Error uploading attachment", error: error.message });
    }
};

export const getAttachments = async (req: Request, res: Response) => {
    try {
        const { tenantId } = req.params;

        const attachments = await prisma.tenantAttachment.findMany({
            where: {
                tenantId: parseInt(tenantId),
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        res.json(attachments);
    } catch (error: any) {
        console.error("Error fetching attachments:", error);
        res.status(500).json({ message: "Error fetching attachments", error: error.message });
    }
};

export const deleteAttachment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const attachment = await prisma.tenantAttachment.findUnique({
            where: { id: parseInt(id) },
        });

        if (!attachment) {
            return res.status(404).json({ message: "Attachment not found" });
        }

        // Delete file from disk
        if (fs.existsSync(attachment.filePath)) {
            fs.unlinkSync(attachment.filePath);
        }

        // Delete record from database
        await prisma.tenantAttachment.delete({
            where: { id: parseInt(id) },
        });

        res.json({ message: "Attachment deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting attachment:", error);
        res.status(500).json({ message: "Error deleting attachment", error: error.message });
    }
};
