import { PrismaClient } from "../lib/prisma.js";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();
export async function listUsers(_req, res) {
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, createdAt: true } });
    res.json(users);
}
export async function createUser(req, res) {
    const { name, email, role = "USER", password } = req.body || {};
    if (!name || !email || !password)
        return res.status(400).json({ message: "الاسم والإيميل وكلمة المرور مطلوبة" });
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists)
        return res.status(400).json({ message: "الإيميل مستخدم مسبقًا" });
    const hashed = await bcrypt.hash(String(password), 10);
    const user = await prisma.user.create({ data: { name, email, role, password: hashed }, select: { id: true, name: true, email: true, role: true, createdAt: true } });
    res.json(user);
}
export async function updateUser(req, res) {
    const { id } = req.params;
    const { name, email, role } = req.body || {};
    const user = await prisma.user.update({ where: { id: Number(id) }, data: { name, email, role }, select: { id: true, name: true, email: true, role: true, createdAt: true } });
    res.json(user);
}
export async function resetUserPassword(req, res) {
    const { id } = req.params;
    const { newPassword } = req.body || {};
    if (!newPassword)
        return res.status(400).json({ message: "الرجاء إدخال كلمة مرور جديدة" });
    const hashed = await bcrypt.hash(String(newPassword), 10);
    await prisma.user.update({ where: { id: Number(id) }, data: { password: hashed } });
    res.json({ message: "تم تحديث كلمة المرور للمستخدم" });
}
