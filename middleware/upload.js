const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

// Configure Cloudinary with your credentials from .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Setup Cloudinary Storage for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const ext = file.originalname.split(".").pop().toLowerCase();
    // Keep excel files working by treating them as raw files
    if (["xls", "xlsx", "csv"].includes(ext)) {
      return { folder: "product_excel", resource_type: "raw" };
    }
    // Handle all images
    return {
      folder: "product",
      allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
    };
  },
});

const upload = multer({ storage: storage });

module.exports = upload;
