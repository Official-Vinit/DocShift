import { Router } from "express";
import upload from "../middlewares/upload.js";
import { convertFile } from "../controllers/conversionController.js";
import conversionLimiter from "../middlewares/conversionLimiter.js";
import { validateFileContent } from "../middlewares/validateFileContent.js";
import { conversionSlot } from "../middlewares/conversionSlot.js";

const router = Router();

router.post(
  "/",
  conversionLimiter,
  conversionSlot,
  upload.single("file"),
  validateFileContent,
  convertFile
);

export default router;
