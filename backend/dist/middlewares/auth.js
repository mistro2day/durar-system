import { verifyJwt } from "../utils/jwt.js";
export function authGuard(req, res, next) {
    try {
        const header = req.headers.authorization;
        if (!header?.startsWith("Bearer "))
            return res.status(401).json({ message: "Unauthorized" });
        const token = header.slice(7);
        const payload = verifyJwt(token);
        req.user = payload;
        next();
    }
    catch {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}
