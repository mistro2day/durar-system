import express from "express";
import {
  getShops,
  createShop,
  deleteShop,
  updateShop,
} from "../controllers/shop.controller.ts";

const router = express.Router();

router.get("/", getShops);
router.post("/", createShop);
router.put("/:id", updateShop);
router.delete("/:id", deleteShop);

export default router;
