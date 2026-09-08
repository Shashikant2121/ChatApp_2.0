import bcrypt from "bcryptjs";

import User from "../models/User.js";

import cloudinary from "../config/cloudinary.js";

// ==============================
// GET ALL USERS
// ==============================
export const getUsers = async (req, res) => {
  try {
    const users = await User.find({
      _id: {
        $ne: req.user._id,
      },
    })
      .select("name email profilePicture bio isOnline lastSeen")
      .sort({
        name: 1,
      });

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Get Users Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==============================
// GET MY PROFILE
// ==============================
export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get My Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==============================
// UPDATE PROFILE
// ==============================
export const updateProfile = async (req, res) => {
  try {
    const { name, bio, profilePicture } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (name !== undefined) {
      const trimmedName = name.trim();

      if (trimmedName.length < 2) {
        return res.status(400).json({
          success: false,
          message: "Name must be at least 2 characters",
        });
      }

      if (trimmedName.length > 50) {
        return res.status(400).json({
          success: false,
          message: "Name cannot exceed 50 characters",
        });
      }

      user.name = trimmedName;
    }

    if (bio !== undefined) {
      const trimmedBio = bio.trim();

      if (trimmedBio.length > 150) {
        return res.status(400).json({
          success: false,
          message: "Bio cannot exceed 150 characters",
        });
      }

      user.bio = trimmedBio;
    }

    if (profilePicture !== undefined) {
      user.profilePicture = profilePicture.trim();
    }

    await user.save();

    const updatedUser = await User.findById(user._id).select("-password");

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==============================
// UPLOAD PROFILE PICTURE
// ==============================
export const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an image",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const uploadToCloudinary = () => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "chatapp/profile-pictures",

            resource_type: "image",

            transformation: [
              {
                width: 500,
                height: 500,
                crop: "fill",
                gravity: "face",
              },
            ],
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          },
        );

        uploadStream.end(req.file.buffer);
      });
    };

    const result = await uploadToCloudinary();

    user.profilePicture = result.secure_url;

    await user.save();

    const updatedUser = await User.findById(user._id).select("-password");

    return res.status(200).json({
      success: true,
      message: "Profile picture uploaded successfully",
      user: updatedUser,
      imageUrl: result.secure_url,
    });
  } catch (error) {
    console.error("Upload Profile Picture Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to upload profile picture",
    });
  }
};

// ==============================
// CHANGE PASSWORD
// ==============================
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
