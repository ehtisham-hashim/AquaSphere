import streamifier from 'streamifier';
import cloudinary from '../config/cloudinary.js';

/**
 * Uploads a multer file buffer to Cloudinary.
 * @param {Buffer} buffer - The file buffer from multer memoryStorage
 * @param {string} folder  - Cloudinary folder (e.g. 'receipts')
 * @returns {Promise<string>} Secure URL of the uploaded image
 */
export function uploadToCloudinary(buffer, folder = 'receipts') {
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
