import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "change_me_now";
const EXPIRES_IN = "7d";

export function signJwt(payload: object) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyJwt<T = any>(token: string): T {
  return jwt.verify(token, SECRET) as T;
}
