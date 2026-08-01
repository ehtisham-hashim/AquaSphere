import { v2 as cloudinary } from 'cloudinary';

// Credentials are read exclusively from environment variables.
// Never hardcode API keys or secrets here.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // always return https URLs
});

export default cloudinary;
