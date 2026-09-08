import express from "express";

import {
  getUsers,
  getMyProfile,
  updateProfile,
  uploadProfilePicture,
  changePassword,
} from "../controllers/userController.js";

import authMiddleware from "../middleware/authMiddleware.js";

import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/users
router.get("/", getUsers);

// GET /api/users/profile
router.get("/profile", getMyProfile);

// PUT /api/users/profile
router.put("/profile", updateProfile);

// POST /api/users/profile-picture
router.post(
  "/profile-picture",
  upload.single("profilePicture"),
  uploadProfilePicture,
);

// PUT /api/users/password
router.put("/password", changePassword);

export default router;
