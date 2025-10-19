import { PrismaClient } from "../lib/prisma.js";
import bcrypt from "bcryptjs";
import { signJwt } from "../utils/jwt.js";
import crypto from "node:crypto";
const prisma = new PrismaClient();
export const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!email || !password)
            return res.status(400).json({ message: "الإيميل وكلمة المرور مطلوبة" });
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing)
            return res.status(400).json({ message: "الإيميل مستخدم مسبقًا" });
        const hashed = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { name, email, password: hashed, role },
        });
        const token = signJwt({ id: user.id, role: user.role, name: user.name, email: user.email });
        res.json({ token, user });
    }
    catch (err) {
        console.error("[register] error:", err);
        res.status(500).json({ message: err?.message || "Register failed" });
    }
};
export const login = async (req, res) => {
    const { email, password } = req.body;
    const devEmail = process.env.ADMIN_EMAIL || "admin@durar.local";
    const devPass = process.env.ADMIN_PASSWORD || "Admin@123";
    try {
        if (!email || !password)
            return res.status(400).json({ message: "البريد وكلمة المرور مطلوبة" });
        // 🎯 مسار مطوّرين سريع: إن كانت بيانات الدخول هي الافتراضية، لا تعتمد على قاعدة البيانات
        if (process.env.NODE_ENV !== "production" && email === devEmail && password === devPass) {
            const token = signJwt({ id: 0, role: "ADMIN", name: "مدير درر", email: devEmail });
            return res.json({ token, user: { id: 0, name: "مدير درر", email: devEmail, role: "ADMIN" } });
        }
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user)
            return res.status(404).json({ message: "المستخدم غير موجود" });
        const valid = await bcrypt.compare(password, user.password);
        if (!valid)
            return res.status(401).json({ message: "كلمة المرور غير صحيحة" });
        const token = signJwt({ id: user.id, role: user.role, name: user.name, email: user.email });
        return res.json({ token, user });
    }
    catch (err) {
        console.error("[login] error:", err);
        // تطوير: في حال فشل الاتصال بقاعدة البيانات اسمح للأدمن الافتراضي بالدخول
        if (process.env.NODE_ENV !== "production" && email === devEmail && password === devPass) {
            const token = signJwt({ id: 0, role: "ADMIN", name: "مدير درر", email: devEmail });
            return res.json({ token, user: { id: 0, name: "مدير درر", email: devEmail, role: "ADMIN" } });
        }
        return res.status(500).json({ message: err?.message || "Login failed" });
    }
};
// إرسال بريد بسيط إذا توفرت إعدادات SMTP
async function sendEmail(to, subject, text) {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) {
        console.log("[mail] SMTP not configured. Email to %s: %s\n%s", to, subject, text);
        return;
    }
    const { default: nodemailer } = await import("nodemailer");
    const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
    await transporter.sendMail({ from: process.env.MAIL_FROM || user, to, subject, text });
}
export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email)
        return res.status(400).json({ message: "الرجاء إدخال البريد الإلكتروني" });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user)
        return res.json({ message: "إن وُجد بريد مطابق سيتم إرسال رابط الاسترجاع" });
    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 ساعة
    await prisma.passwordReset.create({ data: { userId: user.id, token, expiresAt } });
    const frontend = process.env.FRONTEND_URL || "http://localhost:5173";
    const url = `${frontend}/reset?token=${token}`;
    await sendEmail(user.email, "استرجاع كلمة المرور", `استخدم الرابط التالي لإعادة تعيين كلمة المرور:\n${url}`);
    res.json({ message: "تم إرسال رابط الاسترجاع إن وُجد بريد مطابق" });
};
export const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword)
        return res.status(400).json({ message: "بيانات غير صالحة" });
    const row = await prisma.passwordReset.findUnique({ where: { token } });
    if (!row || row.used || row.expiresAt < new Date())
        return res.status(400).json({ message: "رمز غير صالح" });
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: row.userId }, data: { password: hashed } });
    await prisma.passwordReset.update({ where: { id: row.id }, data: { used: true } });
    res.json({ message: "تم تحديث كلمة المرور" });
};
export const changePasswordMe = async (req, res) => {
    const { id } = req.user || {};
    const { oldPassword, newPassword } = req.body;
    if (!id || !oldPassword || !newPassword)
        return res.status(400).json({ message: "بيانات غير صالحة" });
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user)
        return res.status(404).json({ message: "المستخدم غير موجود" });
    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid)
        return res.status(401).json({ message: "كلمة المرور القديمة غير صحيحة" });
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id }, data: { password: hashed } });
    res.json({ message: "تم تحديث كلمة المرور" });
};
