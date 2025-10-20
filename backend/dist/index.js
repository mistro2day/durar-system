import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prisma from "./lib/prisma.js";
import compression from "compression";
import bcrypt from "bcryptjs";
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
// ضغط الاستجابات لتسريع نقل البيانات
app.use(compression());
// ✨ المسارات
import authRoutes from "./routes/auth.routes.js";
import unitRoutes from "./routes/unit.routes.js";
import contractRoutes from "./routes/contract.routes.js";
import maintenanceRoutes from "./routes/maintenance.routes.js";
import shopRoutes from "./routes/shop.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import userRoutes from "./routes/user.routes.js";
import propertyRoutes from "./routes/property.routes.js";
import tenantRoutes from "./routes/tenant.routes.js";
import searchRoutes from "./routes/search.routes.js";
import reportsRoutes from "./routes/reports.routes.js";
import activityRoutes from "./routes/activity.routes.js";
// ✅ ربط المسارات
app.use("/api/auth", authRoutes);
app.use("/api/units", unitRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/users", userRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/activity", activityRoutes);
// Healthcheck for quick connectivity tests
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
});
// 👤 التأكد من وجود مستخدم إداري للتطوير
async function ensureAdmin() {
    try {
        const email = process.env.ADMIN_EMAIL || "admin@durar.local";
        const password = process.env.ADMIN_PASSWORD || "Admin@123";
        const existing = await prisma.user.findUnique({ where: { email } });
        if (!existing) {
            const hashed = await bcrypt.hash(password, 10);
            await prisma.user.create({
                data: { name: "مدير درر", email, password: hashed, role: "ADMIN" },
            });
            console.log("✅ Admin user created:", email);
        }
        else {
            console.log("ℹ️ Admin user exists:", email);
        }
    }
    catch (e) {
        console.log("⚠️ Could not ensure admin user:", e?.message || e);
    }
}
// 🔁 المجدول الشهري للفواتير
import { startInvoiceScheduler } from "./jobs/generateMonthlyInvoices.js";
startInvoiceScheduler();
// حاول إنشاء مستخدم إداري للتطوير
ensureAdmin();
// 📦 خدمة واجهة React المبنية من مجلد dist (خادم واحد)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, "..", "..", "durar-dashboard", "dist");
// تفعيل التخزين المؤقت للملفات الثابتة (year-long for hashed assets)
app.use(express.static(clientDist, {
    maxAge: "1y",
    immutable: true,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith("index.html")) {
            res.setHeader("Cache-Control", "no-cache");
        }
    },
}));
// أي مسار ليس ضمن /api يعاد توجيهه إلى index.html لدعم SPA Router
app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
});
// 🚀 تشغيل السيرفر مع اكتشاف المنفذ التلقائي
const DEFAULT_PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
function startServer(port) {
    const server = createServer(app);
    server.listen(port, () => {
        console.log(`🚀 Server running on port ${port}`);
    });
    server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
            console.log(`⚠️  المنفذ ${port} مستخدم... المحاولة على ${port + 1}`);
            startServer(port + 1); // المحاولة في المنفذ التالي
        }
        else {
            console.error("❌ خطأ أثناء تشغيل السيرفر:", err);
        }
    });
}
startServer(DEFAULT_PORT);
