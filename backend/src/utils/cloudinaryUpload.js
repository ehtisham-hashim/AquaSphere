import streamifier from 'streamifier';
import cloudinary from '../config/cloudinary.js';

/**
 * Supported upload folder names.
 * Add new entries here as the app grows.
 */
export const UPLOAD_FOLDERS = {
  CUSTOMERS: 'customers',
  EXPENSES: 'expenses',
  RECEIPTS: 'receipts',
  VENDORS: 'vendors',
  EMPLOYEES: 'employees',
  WEBSITE: 'website',
};

/**
 * Uploads a file buffer to Cloudinary.
 *
 * Usage:
 *   const { secure_url, public_id } = await uploadImage(req.file, 'receipts');
 *
 * @param {Express.Multer.File} file       - The file object from multer (req.file)
 * @param {string}              folderName - Target Cloudinary folder (use UPLOAD_FOLDERS constants)
 * @returns {Promise<{ secure_url: string, public_id: string }>}
 */
export function uploadImage(file, folderName = UPLOAD_FOLDERS.RECEIPTS) {
  // Guard: file and buffer must exist
  if (!file || !file.buffer) {
    return Promise.reject(new Error('No file buffer provided to uploadImage.'));
  }

  // Guard: only images are accepted
  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return Promise.reject(
      new Error(`Unsupported file type "${file.mimetype}". Allowed: JPEG, JPG, PNG, WEBP.`)
    );
  }

  // Guard: folder must be a non-empty string (dynamic tenant-prefixed paths are allowed)
  if (!folderName || typeof folderName !== 'string' || folderName.trim() === '') {
    return Promise.reject(new Error('A folder name is required for uploadImage.'));
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folderName,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        // Auto-optimise quality and format on delivery
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result) => {
        if (error) {
          return reject(new Error(`Cloudinary upload failed: ${error.message}`));
        }
        // Return only what callers need — store these two values in your DB, not the binary.
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );

    // Pipe the in-memory buffer into the Cloudinary upload stream.
    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  });
}
