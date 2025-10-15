import { PrismaClient } from "@prisma/client";
import type { Request, Response } from "express";

const prisma = new PrismaClient();

// 🏪 عرض جميع المحلات
export const getShops = async (req: Request, res: Response) => {
  try {
    const shops = await prisma.shop.findMany();
    res.json(shops);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ➕ إضافة محل جديد
export const createShop = async (req: Request, res: Response) => {
  try {
    const { name, location, phone, ownerId } = req.body;
    const shop = await prisma.shop.create({
      data: { name, location, phone, ownerId },
    });
    res.json(shop);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ❌ حذف محل
export const deleteShop = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await prisma.shop.delete({ where: { id } });
    res.json({ message: "✅ تم حذف المحل بنجاح" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
// ✏️ تحديث بيانات محل
export const updateShop = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { name, location, phone, ownerId } = req.body;

    const updated = await prisma.shop.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(location && { location }),
        ...(phone && { phone }),
        ...(ownerId && { ownerId }),
      },
    });

    res.json({
      message: "✅ تم تحديث بيانات المحل بنجاح",
      shop: updated,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
