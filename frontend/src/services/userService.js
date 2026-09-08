import api from "./api";

// ==============================
// GET ALL USERS
// ==============================

export const getUsers = async () => {
  const response = await api.get("/users");

  return response.data;
};

// ==============================
// GET MY PROFILE
// ==============================

export const getMyProfile = async () => {
  const response = await api.get("/users/profile");

  return response.data;
};

// ==============================
// UPDATE PROFILE
// ==============================

export const updateProfile = async (profileData) => {
  const response = await api.put("/users/profile", profileData);

  return response.data;
};

// ==============================
// UPLOAD PROFILE PICTURE
// ==============================

export const uploadProfilePicture = async (file) => {
  const formData = new FormData();

  formData.append("profilePicture", file);

  const response = await api.post("/users/profile-picture", formData);

  return response.data;
};

// ==============================
// CHANGE PASSWORD
// ==============================

export const changePassword = async (currentPassword, newPassword) => {
  const response = await api.put("/users/password", {
    currentPassword,
    newPassword,
  });

  return response.data;
};
