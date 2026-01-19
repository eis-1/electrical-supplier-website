import { Router } from "express";
import { upload, UploadController } from "../utils/upload.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { env } from "../config/env";

const router = Router();
const uploadController = new UploadController();

// All upload routes require authentication
router.use(authMiddleware);

// Single file upload
router.post("/single", upload.single("file"), uploadController.uploadImage);

// Multiple files upload
router.post(
  "/multiple",
  upload.array("files", env.MAX_FILES_PER_UPLOAD),
  uploadController.uploadMultiple,
);

// Delete file
router.delete("/:type/:filename", uploadController.deleteFile);

export default router;
