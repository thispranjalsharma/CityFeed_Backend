import { Router } from "express";
import container from "../inversify.config";
import { UserController } from "../controllers/user.controller";
import { AuthController } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import {
  validateRequest,
  isValidPhone,
  isStrongPassword,
} from "../middleware/validation.middleware";
// import { body  } from "express-validator";
import { body, ValidationChain } from "express-validator";

// Dependency-injected controller instances
const userController = container.get(UserController);
const authController = container.get(AuthController);

const router = Router();

// Role authorization middleware
const canManageEmployees = (req, res, next) => {
  // 'user' is attached by authenticate middleware
  const allowedRoles = ["super_admin", "outlet_admin"];
  const user = req.user;
  if (!user || !allowedRoles.includes(user.role)) {
    return res.status(403).json({
      message:
        "Forbidden - Only super admin or outlet admin can manage employees",
    });
  }
  next();
};

// Registration of an employee
router.post(
  "/register",
  validateRequest([
    body("name").isString().withMessage("Name is required"),
    body("email").isEmail().withMessage("Please provide a valid email"),
  ]),
  authController.registerEmployee
);

// Update employee details
router.put(
  "/:employeeId",
  authenticate,
  validateRequest([
    body("name").optional().isString().withMessage("Name must be a string"),
    body("email").optional().isEmail().withMessage("Valid email is required"),
    body("phone").optional().isString().withMessage("Phone must be a string"),
    body("role")
      .optional()
      .isIn(["employee", "outlet_admin"])
      .withMessage("Role must be employee or outlet_admin"),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be a boolean"),
    body("responsibilities")
      .optional()
      .isArray()
      .withMessage("Responsibilities must be an array"),
  ]),
  canManageEmployees,
  (req, res) => {
    req.params.userId = req.params.employeeId;
    userController.updateEmployee(req, res);
  }
);

// Delete employee
router.delete("/:employeeId", authenticate, canManageEmployees, (req, res) => {
  req.params.userId = req.params.employeeId;
  userController.deleteEmployee(req, res);
});

export default router;
