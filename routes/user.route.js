import express from "express";
import userController from "../controllers/user.controller.js";
import auth from '../middleware/auth.js';

const router = express.Router();

// Auth
router.post("/register", userController.registerUser);
router.post("/login", userController.loginUser);

// CRUD
router.get("/", auth, userController.getUsers);
router.get("/:id", auth, userController.getUserById);
router.put("/:id", auth, userController.updateUser);
router.delete("/:id", auth, userController.deleteUser);

export default router;
