import "dotenv/config";

import { v2 as cloudinary } from "cloudinary";

console.log("========== CLOUDINARY ENV CHECK ==========");
console.log("CLOUD NAME:", process.env.CLOUDINARY_CLOUD_NAME);

console.log("API KEY:", process.env.CLOUDINARY_API_KEY ? "FOUND" : "MISSING");

console.log(
  "API SECRET:",
  process.env.CLOUDINARY_API_SECRET ? "FOUND" : "MISSING",
);

console.log("==========================================");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;
