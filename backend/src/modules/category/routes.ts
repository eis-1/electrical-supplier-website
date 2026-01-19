import { Router } from "express";
import { CategoryController } from "./controller";
import { authenticateAdmin } from "../../middlewares/auth.middleware";
import { authorizePermission } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { createCategoryValidation, updateCategoryValidation } from "./dto";

const router = Router();
const controller = new CategoryController();

// Public routes
router.get("/", controller.getAll);
router.get("/:id", controller.getById);

// Admin routes
router.post(
  "/",
  authenticateAdmin,
  authorizePermission("category", "create"),
  validate(createCategoryValidation),
  controller.create,
);
router.put(
  "/:id",
  authenticateAdmin,
  authorizePermission("category", "update"),
  validate(updateCategoryValidation),
  controller.update,
);
router.delete(
  "/:id",
  authenticateAdmin,
  authorizePermission("category", "delete"),
  controller.delete,
);

export default router;
