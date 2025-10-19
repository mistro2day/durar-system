import { Router } from "express";
import { listProperties, getProperty, createProperty, updateProperty } from "../controllers/property.controller.js";
const router = Router();
router.get("/", listProperties);
router.get("/:id", getProperty);
router.post("/", createProperty);
router.patch("/:id", updateProperty);
export default router;
