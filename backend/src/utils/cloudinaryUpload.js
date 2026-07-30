import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import streamifier from 'streamifier';
import cloudinary from '../config/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Boolean flag to toggle Cloudinary ON/OFF (Defaults to false per requirement)
export const USE_CLOUDINARY = process.env.USE_CLOUDINARY === 'true' || false;

/**
 * Uploads a multer file buffer to Cloudinary or saves locally if Cloudinary is disabled.
 * @param {Buffer} buffer - The file buffer from multer memoryStorage
 * @param {string} folder  - Folder name (e.g. 'receipts')
 * @returns {Promise<string|null>} URL of uploaded image
 */
export function uploadToCloudinary(buffer, folder = 'receipts') {
  if (!buffer) return Promise.resolve(null);

  if (!USE_CLOUDINARY) {
    try {
      const uploadsDir = path.join(__dirname, '../../uploads', folder);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.png`;
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, buffer);
      return Promise.resolve(`/uploads/${folder}/${filename}`);
    } catch (err) {
      console.error('Failed to save file locally:', err);
      return Promise.resolve(null);
    }
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf'],
        transformation: [{ quality: 'auto', fetch_format: 'auto' }]
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}
