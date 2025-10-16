import type { Request } from "express";

export type Pagination = {
  take: number;
  skip: number;
  page: number;
  pageSize: number;
};

export function getPagination(req: Request, defaults: { page?: number; pageSize?: number } = {}): Pagination | null {
  const q: any = (req as any).query || {};
  const hasPageParam = q.page !== undefined || q.pageSize !== undefined;
  if (!hasPageParam) return null;

  const pageSizeMax = 100;
  const page = Math.max(1, Number(q.page ?? defaults.page ?? 1));
  const pageSizeRaw = Number(q.pageSize ?? defaults.pageSize ?? 20);
  const pageSize = Math.min(pageSizeMax, Math.max(1, pageSizeRaw));
  const skip = (page - 1) * pageSize;
  const take = pageSize;
  return { page, pageSize, skip, take };
}

