import express from "express";

import {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
} from "../controllers/authController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Register
router.post("/register", registerUser);

// Login
router.post("/login", loginUser);

// Current logged-in user
router.get("/me", authMiddleware, getCurrentUser);

// Logout
router.post("/logout", logoutUser);

export default router;
