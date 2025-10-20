import type { Request, Response, NextFunction } from "express";
import { verifyJwt } from "../utils/jwt.js";

export interface AuthedRequest extends Request {
  user?: { id: number; role: string; name: string; email: string };
}

export function authGuard(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorized" });
    const token = header.slice(7);
    const payload = verifyJwt<{ id: number; role: string; name: string; email: string }>(token);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
