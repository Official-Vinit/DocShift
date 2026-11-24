import { Router } from "express";
import upload from "../middlewares/upload.js";
import { convertFile } from "../controllers/conversionController.js";
import conversionLimiter from "../middlewares/conversionLimiter.js";
import { validateFileContent } from "../middlewares/validateFileContent.js";

const router = Router();

router.post("/", conversionLimiter, upload.single("file"), validateFileContent, convertFile);

export default router;