import multer from 'multer';

// Images stay in memory as a Buffer and are streamed directly to Cloudinary.
// Nothing is written to disk.
const storage = multer.memoryStorage();

// Only allow the four image types listed in the requirements.
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error('Invalid file type. Only JPEG, JPG, PNG, and WEBP images are accepted.'),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB hard limit
  },
});

export default upload;
