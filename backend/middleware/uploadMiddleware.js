import multer from "multer";
import path from "path";

const storage = multer.memoryStorage();

const allowedMimeTypes = [
  // Images
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
  "image/gif",

  // Documents
  "application/pdf",
  "text/plain",

  // Archives
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/vnd.rar",
];

const allowedExtensions = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".pdf",
  ".txt",
  ".zip",
  ".rar",
];

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();

  const isValidMimeType = allowedMimeTypes.includes(file.mimetype);

  const isValidExtension = allowedExtensions.includes(extension);

  if (isValidMimeType || isValidExtension) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only JPG, JPEG, PNG, WEBP, GIF, PDF, TXT, ZIP and RAR files are allowed",
      ),
      false,
    );
  }
};

const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter,
});

export default upload;
