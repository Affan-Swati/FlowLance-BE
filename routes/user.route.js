import express from "express";
import userController from "../controllers/user.controller.js";
import auth from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';

const router = express.Router();

// Public routes
router.post("/register", userController.registerUser);
router.post("/login", userController.loginUser);

// Protected routes
router.get("/me", auth, userController.getCurrentUser); // Allow users to get their own profile
router.put("/me", auth, userController.updateCurrentUser); // Allow users to update their id only

// Admin only routes
router.get("/", auth, adminAuth, userController.getUsers);
router.get("/:id", auth, adminAuth, userController.getUserById);
router.put("/:id", auth, adminAuth, userController.updateUser);
router.delete("/:id", auth, adminAuth, userController.deleteUser);

export default router;
