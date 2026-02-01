const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/job-descriptions');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate a safe, unique filename: timestamp-sanitizedOriginalName
    let original = file.originalname || 'file.pdf';
    try {
      original = decodeURIComponent(original);
    } catch (e) {
      // ignore if it's not encoded
    }
    // replace any characters except alphanumerics, dot, dash, underscore with underscore
    const safeName = original.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const uniqueName = Date.now() + '-' + safeName;
    cb(null, uniqueName);
  }
});

// File filter - only allow PDFs
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

// Create multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

module.exports = upload;
