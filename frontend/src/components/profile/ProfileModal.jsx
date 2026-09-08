import { useEffect, useRef, useState } from "react";

import {
  updateProfile,
  uploadProfilePicture,
  changePassword,
} from "../../services/userService";

function ProfileModal({ user, onClose, onProfileUpdated }) {
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [profilePicture, setProfilePicture] = useState(
    user?.profilePicture || "",
  );

  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState("");

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const fileInputRef = useRef(null);

  // ==========================================
  // UPDATE STATE WHEN USER CHANGES
  // ==========================================

  useEffect(() => {
    setName(user?.name || "");
    setBio(user?.bio || "");
    setProfilePicture(user?.profilePicture || "");
  }, [user]);

  // ==========================================
  // PREVENT BODY SCROLL
  // ==========================================

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // ==========================================
  // ESC KEY TO CLOSE
  // ==========================================

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loading && !passwordLoading) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [loading, passwordLoading, onClose]);

  // ==========================================
  // CLEANUP PREVIEW
  // ==========================================

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  // ==========================================
  // FILE SELECT
  // ==========================================

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setSuccess("");

    // Image validation
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    // 5MB validation
    if (file.size > 5 * 1024 * 1024) {
      setError("Profile picture must be smaller than 5MB.");
      event.target.value = "";
      return;
    }

    // Remove previous preview
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    const imagePreview = URL.createObjectURL(file);

    setSelectedFile(file);
    setPreview(imagePreview);
  };

  // ==========================================
  // REMOVE SELECTED IMAGE
  // ==========================================

  const removeSelectedImage = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setSelectedFile(null);
    setPreview("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setError("");
  };

  // ==========================================
  // UPDATE PROFILE
  // ==========================================

  const handleProfileSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const trimmedName = name.trim();
    const trimmedBio = bio.trim();

    // Name validation
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }

    if (trimmedName.length < 2) {
      setError("Name must contain at least 2 characters.");
      return;
    }

    if (trimmedName.length > 50) {
      setError("Name must be less than 50 characters.");
      return;
    }

    // Bio validation
    if (trimmedBio.length > 160) {
      setError("Bio must be less than 160 characters.");
      return;
    }

    try {
      setLoading(true);

      let updatedProfilePicture = profilePicture;

      // ==========================================
      // UPLOAD PROFILE IMAGE
      // ==========================================

      if (selectedFile) {
        setUploadingImage(true);

        const uploadData = await uploadProfilePicture(selectedFile);

        updatedProfilePicture =
          uploadData?.user?.profilePicture || uploadData?.profilePicture || "";

        setProfilePicture(updatedProfilePicture);

        setUploadingImage(false);
      }

      // ==========================================
      // UPDATE PROFILE DATA
      // ==========================================

      const data = await updateProfile({
        name: trimmedName,
        bio: trimmedBio,
        profilePicture: updatedProfilePicture,
      });

      const updatedUser = data?.user || {
        ...user,
        name: trimmedName,
        bio: trimmedBio,
        profilePicture: updatedProfilePicture,
      };

      // Update local state
      setName(updatedUser.name || "");
      setBio(updatedUser.bio || "");
      setProfilePicture(updatedUser.profilePicture || "");

      // Clear selected file
      setSelectedFile(null);

      if (preview) {
        URL.revokeObjectURL(preview);
      }

      setPreview("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Notify parent
      if (onProfileUpdated) {
        onProfileUpdated(updatedUser);
      }

      setSuccess("Profile updated successfully.");

      setTimeout(() => {
        setSuccess("");
      }, 2500);
    } catch (err) {
      console.error("Update Profile Error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to update profile. Please try again.",
      );
    } finally {
      setUploadingImage(false);
      setLoading(false);
    }
  };

  // ==========================================
  // PASSWORD INPUT
  // ==========================================

  const handlePasswordChange = (event) => {
    const { name: fieldName, value } = event.target;

    setPasswordData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));

    setError("");
    setSuccess("");
  };

  // ==========================================
  // CHANGE PASSWORD
  // ==========================================

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const { currentPassword, newPassword, confirmPassword } = passwordData;

    // Required fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all password fields.");
      return;
    }

    // Minimum password length
    if (newPassword.length < 6) {
      setError("New password must contain at least 6 characters.");
      return;
    }

    // Confirm password
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    // Same password check
    if (currentPassword === newPassword) {
      setError("New password must be different from your current password.");
      return;
    }

    try {
      setPasswordLoading(true);

      await changePassword(currentPassword, newPassword);

      // Clear form
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setShowPasswordForm(false);
      setShowPassword(false);

      setSuccess("Password changed successfully.");

      setTimeout(() => {
        setSuccess("");
      }, 2500);
    } catch (err) {
      console.error("Change Password Error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to change password. Please try again.",
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  // ==========================================
  // AVATAR
  // ==========================================

  const avatarSource =
    preview ||
    profilePicture ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name || "User",
    )}&background=6366f1&color=fff&size=256`;

  // ==========================================
  // JSX
  // ==========================================

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-slate-950/70
        p-2
        backdrop-blur-md

        sm:p-4
      "
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          if (!loading && !passwordLoading) {
            onClose();
          }
        }
      }}
    >
      {/* ==========================================
          MODAL
      ========================================== */}

      <div
        className="
          flex
          w-full
          max-w-md
          flex-col
          overflow-hidden
          rounded-2xl
          border
          border-white/20
          bg-white
          shadow-2xl

          max-h-[calc(100dvh-1rem)]

          dark:border-slate-700/70
          dark:bg-slate-950

          sm:max-h-[90vh]
          sm:rounded-3xl
        "
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* ==========================================
            HEADER
        ========================================== */}

        <div
          className="
            relative
            shrink-0
            overflow-hidden
            bg-linear-to-br
            from-indigo-600
            via-violet-600
            to-purple-700
            px-4
            pb-14
            pt-4
            text-white

            sm:px-6
            sm:pb-16
            sm:pt-6
          "
        >
          {/* Decorative circles */}

          <div
            className="
              absolute
              -right-16
              -top-16
              h-32
              w-32
              rounded-full
              bg-white/10

              sm:h-40
              sm:w-40
            "
          />

          <div
            className="
              absolute
              -bottom-16
              -left-10
              h-28
              w-28
              rounded-full
              bg-white/10

              sm:h-32
              sm:w-32
            "
          />

          {/* Header content */}

          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p
                className="
                  text-[10px]
                  font-medium
                  uppercase
                  tracking-[0.18em]
                  text-white/70

                  sm:text-xs
                  sm:tracking-[0.2em]
                "
              >
                Account
              </p>

              <h2
                className="
                  mt-1
                  truncate
                  text-lg
                  font-bold

                  sm:text-xl
                "
              >
                Profile Settings
              </h2>

              <p
                className="
                  mt-1
                  max-w-57.5
                  text-xs
                  leading-relaxed
                  text-white/70

                  sm:max-w-none
                  sm:text-sm
                "
              >
                Manage your personal information
              </p>
            </div>

            {/* Close */}

            <button
              type="button"
              onClick={onClose}
              disabled={loading || passwordLoading}
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-white/10
                text-white
                transition

                hover:bg-white/20
                active:scale-95

                disabled:cursor-not-allowed
                disabled:opacity-50

                sm:h-10
                sm:w-10
              "
              aria-label="Close profile settings"
              title="Close"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* ==========================================
            SCROLLABLE CONTENT
        ========================================== */}

        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
            overscroll-contain
            touch-pan-y

            px-3
            pb-5

            sm:px-5
            sm:pb-6
          "
        >
          {/* ==========================================
              PROFILE IMAGE
          ========================================== */}

          <div className="-mt-8 flex flex-col items-center sm:-mt-10">
            <div className="relative">
              {/* Avatar */}

              <div
                className="
                  h-20
                  w-20
                  overflow-hidden
                  rounded-2xl
                  border-4
                  border-white
                  bg-slate-100
                  shadow-xl

                  dark:border-slate-950
                  dark:bg-slate-800

                  sm:h-24
                  sm:w-24
                  sm:rounded-3xl
                "
              >
                <img
                  src={avatarSource}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Change image */}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="
                  absolute
                  -bottom-2
                  -right-2
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-xl
                  border-4
                  border-white
                  bg-slate-900
                  text-white
                  shadow-lg
                  transition

                  hover:scale-105
                  hover:bg-indigo-600
                  active:scale-95

                  disabled:cursor-not-allowed
                  disabled:opacity-60

                  dark:border-slate-950

                  sm:h-9
                  sm:w-9
                "
                aria-label="Change profile picture"
                title="Change profile picture"
              >
                {uploadingImage ? (
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />

                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 12h14"
                    />

                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 5v14"
                    />
                  </svg>
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Selected file */}

            {selectedFile && (
              <div
                className="
                  mt-3
                  flex
                  w-full
                  min-w-0
                  max-w-xs
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-indigo-100
                  bg-indigo-50
                  px-3
                  py-2

                  dark:border-indigo-900/50
                  dark:bg-indigo-950/40
                "
              >
                <svg
                  className="
                    h-4
                    w-4
                    shrink-0
                    text-indigo-500
                    dark:text-indigo-400
                  "
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 7a2 2 0 012-2h3l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V7z"
                  />
                </svg>

                <span
                  className="
                    min-w-0
                    flex-1
                    truncate
                    text-xs
                    font-medium
                    text-indigo-700

                    dark:text-indigo-300
                  "
                >
                  {selectedFile.name}
                </span>

                <button
                  type="button"
                  onClick={removeSelectedImage}
                  className="
                    flex
                    h-7
                    w-7
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    text-lg
                    leading-none
                    text-indigo-400
                    transition

                    hover:bg-indigo-100
                    hover:text-red-500

                    dark:text-indigo-500
                    dark:hover:bg-indigo-900/40
                    dark:hover:text-red-400
                  "
                  title="Remove image"
                  aria-label="Remove selected image"
                >
                  ×
                </button>
              </div>
            )}

            <p
              className="
                mt-2
                text-center
                text-[10px]
                text-slate-400

                sm:text-xs

                dark:text-slate-500
              "
            >
              JPG, PNG, WEBP, GIF • Max 5MB
            </p>
          </div>

          {/* ==========================================
              ERROR
          ========================================== */}

          {error && (
            <div
              className="
                mt-4
                flex
                items-start
                gap-2
                rounded-xl
                border
                border-red-100
                bg-red-50
                px-3
                py-2.5

                dark:border-red-900/50
                dark:bg-red-950/30

                sm:mt-5
                sm:gap-3
                sm:rounded-2xl
                sm:px-4
                sm:py-3
              "
              role="alert"
            >
              <div
                className="
                  mt-0.5
                  flex
                  h-5
                  w-5
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-red-100
                  text-xs
                  font-bold
                  text-red-600

                  dark:bg-red-900/60
                  dark:text-red-300
                "
              >
                !
              </div>

              <p
                className="
                  min-w-0
                  wrap-break-words
                  text-xs
                  text-red-600

                  sm:text-sm

                  dark:text-red-300
                "
              >
                {error}
              </p>
            </div>
          )}

          {/* ==========================================
              SUCCESS
          ========================================== */}

          {success && (
            <div
              className="
                mt-4
                flex
                items-start
                gap-2
                rounded-xl
                border
                border-emerald-100
                bg-emerald-50
                px-3
                py-2.5

                dark:border-emerald-900/50
                dark:bg-emerald-950/30

                sm:mt-5
                sm:gap-3
                sm:rounded-2xl
                sm:px-4
                sm:py-3
              "
              role="status"
            >
              <div
                className="
                  mt-0.5
                  flex
                  h-5
                  w-5
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-emerald-100
                  text-xs
                  font-bold
                  text-emerald-600

                  dark:bg-emerald-900/60
                  dark:text-emerald-300
                "
              >
                ✓
              </div>

              <p
                className="
                  min-w-0
                  wrap-break-words
                  text-xs
                  text-emerald-600

                  sm:text-sm

                  dark:text-emerald-300
                "
              >
                {success}
              </p>
            </div>
          )}

          {/* ==========================================
              PROFILE FORM
          ========================================== */}

          <form
            onSubmit={handleProfileSubmit}
            className="
              mt-4
              space-y-3.5

              sm:mt-5
              sm:space-y-4
            "
          >
            {/* NAME */}

            <div>
              <label
                className="
                  mb-1.5
                  block
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-wider
                  text-slate-500

                  sm:mb-2
                  sm:text-xs

                  dark:text-slate-400
                "
              >
                Full Name
              </label>

              <div className="relative">
                <div
                  className="
                    pointer-events-none
                    absolute
                    inset-y-0
                    left-0
                    flex
                    items-center
                    pl-3
                    text-slate-400

                    dark:text-slate-500
                  "
                >
                  <svg
                    className="h-4 w-4 sm:h-5 sm:w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 0115 0"
                    />
                  </svg>
                </div>

                <input
                  type="text"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setError("");
                    setSuccess("");
                  }}
                  maxLength={50}
                  autoComplete="name"
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-slate-50
                    py-2.5
                    pl-10
                    pr-3
                    text-base
                    text-slate-700
                    outline-none
                    transition
                    placeholder:text-slate-400

                    focus:border-indigo-400
                    focus:bg-white
                    focus:ring-4
                    focus:ring-indigo-500/10

                    dark:border-slate-800
                    dark:bg-slate-900
                    dark:text-slate-100
                    dark:placeholder:text-slate-500
                    dark:focus:border-indigo-500
                    dark:focus:bg-slate-900

                    sm:rounded-2xl
                    sm:py-3
                    sm:pl-11
                    sm:pr-4
                    sm:text-sm
                  "
                  placeholder="Enter your name"
                />
              </div>
            </div>

            {/* EMAIL */}

            <div>
              <label
                className="
                  mb-1.5
                  block
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-wider
                  text-slate-500

                  sm:mb-2
                  sm:text-xs

                  dark:text-slate-400
                "
              >
                Email
              </label>

              <div className="relative">
                <div
                  className="
                    pointer-events-none
                    absolute
                    inset-y-0
                    left-0
                    flex
                    items-center
                    pl-3.5
                    text-slate-400

                    dark:text-slate-500
                  "
                >
                  <svg
                    className="h-4 w-4 sm:h-5 sm:w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 7.5l9 6 9-6"
                    />

                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 5.25h15A1.5 1.5 0 0121 6.75v10.5a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 17.25V6.75a1.5 1.5 0 011.5-1.5z"
                    />
                  </svg>
                </div>

                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="
                    w-full
                    cursor-not-allowed
                    rounded-xl
                    border
                    border-slate-200
                    bg-slate-100
                    py-2.5
                    pl-10
                    pr-3
                    text-base
                    text-slate-400
                    outline-none

                    dark:border-slate-800
                    dark:bg-slate-900
                    dark:text-slate-600

                    sm:rounded-2xl
                    sm:py-3
                    sm:pl-11
                    sm:pr-4
                    sm:text-sm
                  "
                />
              </div>

              <p
                className="
                  mt-1
                  text-[10px]
                  text-slate-400

                  sm:mt-1.5
                  sm:text-xs

                  dark:text-slate-500
                "
              >
                Email address cannot be changed.
              </p>
            </div>

            {/* BIO */}

            <div>
              <div
                className="
                  mb-1.5
                  flex
                  items-center
                  justify-between

                  sm:mb-2
                "
              >
                <label
                  className="
                    block
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-wider
                    text-slate-500

                    sm:text-xs

                    dark:text-slate-400
                  "
                >
                  Bio
                </label>

                <span
                  className="
                    text-[10px]
                    text-slate-400

                    sm:text-xs

                    dark:text-slate-500
                  "
                >
                  {bio.length}/160
                </span>
              </div>

              <textarea
                value={bio}
                onChange={(event) => {
                  setBio(event.target.value);
                  setError("");
                  setSuccess("");
                }}
                maxLength={160}
                rows={3}
                className="
                  w-full
                  resize-none
                  rounded-xl
                  border
                  border-slate-200
                  bg-slate-50
                  px-3
                  py-2.5
                  text-base
                  leading-relaxed
                  text-slate-700
                  outline-none
                  transition
                  placeholder:text-slate-400

                  focus:border-indigo-400
                  focus:bg-white
                  focus:ring-4
                  focus:ring-indigo-500/10

                  dark:border-slate-800
                  dark:bg-slate-900
                  dark:text-slate-100
                  dark:placeholder:text-slate-500
                  dark:focus:border-indigo-500
                  dark:focus:bg-slate-900

                  sm:rounded-2xl
                  sm:px-4
                  sm:py-3
                  sm:text-sm
                "
                placeholder="Tell something about yourself..."
              />
            </div>

            {/* SAVE */}

            <button
              type="submit"
              disabled={loading}
              className="
                flex
                min-h-11
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-linear-to-r
                from-indigo-600
                to-violet-600
                px-4
                py-3
                text-sm
                font-semibold
                text-white
                shadow-lg
                shadow-indigo-500/20
                transition

                hover:-translate-y-0.5
                hover:shadow-xl
                active:scale-[0.99]

                disabled:cursor-not-allowed
                disabled:opacity-60

                sm:rounded-2xl
                sm:py-3.5
              "
            >
              {loading ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin sm:h-5 sm:w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />

                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>

                  {uploadingImage ? "Uploading..." : "Saving..."}
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4 sm:h-5 sm:w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 12l4 4L19 6"
                    />
                  </svg>
                  Save Changes
                </>
              )}
            </button>
          </form>

          {/* ==========================================
              SECURITY
          ========================================== */}

          <div
            className="
              mt-5
              border-t
              border-slate-100
              pt-4

              sm:mt-6
              sm:pt-5

              dark:border-slate-800
            "
          >
            {/* SECURITY HEADER */}

            <button
              type="button"
              onClick={() => {
                setShowPasswordForm((prev) => !prev);
                setError("");
                setSuccess("");
              }}
              className="
                flex
                min-h-12
                w-full
                items-center
                justify-between
                gap-3
                rounded-xl
                border
                border-slate-200
                bg-slate-50
                px-3
                py-3
                text-left
                transition

                hover:border-indigo-200
                hover:bg-indigo-50/50
                active:scale-[0.99]

                dark:border-slate-800
                dark:bg-slate-900
                dark:hover:border-indigo-800
                dark:hover:bg-indigo-950/30

                sm:rounded-2xl
                sm:px-4
                sm:py-3.5
              "
              aria-expanded={showPasswordForm}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-white
                    text-slate-600
                    shadow-sm

                    dark:bg-slate-800
                    dark:text-slate-300

                    sm:h-10
                    sm:w-10
                  "
                >
                  <svg
                    className="h-4 w-4 sm:h-5 sm:w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    viewBox="0 0 24 24"
                  >
                    <rect width="16" height="12" x="4" y="9" rx="2" />

                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 9V6a4 4 0 018 0v3M12 13v4"
                    />
                  </svg>
                </div>

                <div className="min-w-0">
                  <p
                    className="
                      truncate
                      text-xs
                      font-semibold
                      text-slate-700

                      sm:text-sm

                      dark:text-slate-200
                    "
                  >
                    Change Password
                  </p>

                  <p
                    className="
                      truncate
                      text-[10px]
                      text-slate-400

                      sm:text-xs

                      dark:text-slate-500
                    "
                  >
                    Update your account password
                  </p>
                </div>
              </div>

              <svg
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform sm:h-5 sm:w-5 dark:text-slate-500 ${
                  showPasswordForm ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m6 9 6 6 6-6"
                />
              </svg>
            </button>

            {/* PASSWORD FORM */}

            {showPasswordForm && (
              <form
                onSubmit={handlePasswordSubmit}
                className="
                  mt-3
                  space-y-3
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  p-3

                  dark:border-slate-800
                  dark:bg-slate-900

                  sm:mt-4
                  sm:space-y-4
                  sm:rounded-2xl
                  sm:p-4
                "
              >
                {/* CURRENT PASSWORD */}

                <div>
                  <label
                    className="
                      mb-1.5
                      block
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-wider
                      text-slate-500

                      sm:mb-2
                      sm:text-xs

                      dark:text-slate-400
                    "
                  >
                    Current Password
                  </label>

                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    autoComplete="current-password"
                    className="
                      w-full
                      rounded-xl
                      border
                      border-slate-200
                      bg-slate-50
                      px-3
                      py-2.5
                      text-base
                      text-slate-700
                      outline-none
                      transition
                      placeholder:text-slate-400

                      focus:border-indigo-400
                      focus:bg-white
                      focus:ring-4
                      focus:ring-indigo-500/10

                      dark:border-slate-800
                      dark:bg-slate-950
                      dark:text-slate-100
                      dark:placeholder:text-slate-500
                      dark:focus:border-indigo-500

                      sm:text-sm
                    "
                    placeholder="Enter current password"
                  />
                </div>

                {/* NEW PASSWORD */}

                <div>
                  <label
                    className="
                      mb-1.5
                      block
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-wider
                      text-slate-500

                      sm:mb-2
                      sm:text-xs

                      dark:text-slate-400
                    "
                  >
                    New Password
                  </label>

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      autoComplete="new-password"
                      className="
                        w-full
                        rounded-xl
                        border
                        border-slate-200
                        bg-slate-50
                        px-3
                        py-2.5
                        pr-12
                        text-base
                        text-slate-700
                        outline-none
                        transition
                        placeholder:text-slate-400

                        focus:border-indigo-400
                        focus:bg-white
                        focus:ring-4
                        focus:ring-indigo-500/10

                        dark:border-slate-800
                        dark:bg-slate-950
                        dark:text-slate-100
                        dark:placeholder:text-slate-500
                        dark:focus:border-indigo-500

                        sm:text-sm
                      "
                      placeholder="Minimum 6 characters"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="
                        absolute
                        right-1.5
                        top-1/2
                        flex
                        h-9
                        w-9
                        -translate-y-1/2
                        items-center
                        justify-center
                        rounded-lg
                        text-slate-400
                        transition

                        hover:bg-slate-100
                        hover:text-indigo-600

                        dark:text-slate-500
                        dark:hover:bg-slate-800
                        dark:hover:text-indigo-400
                      "
                      title={showPassword ? "Hide password" : "Show password"}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                {/* CONFIRM PASSWORD */}

                <div>
                  <label
                    className="
                      mb-1.5
                      block
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-wider
                      text-slate-500

                      sm:mb-2
                      sm:text-xs

                      dark:text-slate-400
                    "
                  >
                    Confirm Password
                  </label>

                  <input
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    autoComplete="new-password"
                    className="
                      w-full
                      rounded-xl
                      border
                      border-slate-200
                      bg-slate-50
                      px-3
                      py-2.5
                      text-base
                      text-slate-700
                      outline-none
                      transition
                      placeholder:text-slate-400

                      focus:border-indigo-400
                      focus:bg-white
                      focus:ring-4
                      focus:ring-indigo-500/10

                      dark:border-slate-800
                      dark:bg-slate-950
                      dark:text-slate-100
                      dark:placeholder:text-slate-500
                      dark:focus:border-indigo-500

                      sm:text-sm
                    "
                    placeholder="Confirm new password"
                  />
                </div>

                {/* PASSWORD BUTTON */}

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="
                    flex
                    min-h-11
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-slate-900
                    px-4
                    py-2.5
                    text-sm
                    font-semibold
                    text-white
                    transition

                    hover:bg-slate-800
                    active:scale-[0.99]

                    dark:bg-indigo-600
                    dark:hover:bg-indigo-500

                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >
                  {passwordLoading ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />

                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>
                      Updating...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </button>
              </form>
            )}
          </div>

          {/* ==========================================
              FOOTER
          ========================================== */}

          <p
            className="
              mt-4
              pb-1
              text-center
              text-[10px]
              text-slate-400

              sm:mt-5
              sm:text-xs

              dark:text-slate-600
            "
          >
            Your profile information is securely stored.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ProfileModal;
