import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { verifyAdminToken, requirePermission, logActivity } from '../middleware/adminAuth.js';

const router = express.Router();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Upload directory
const UPLOAD_DIR = path.join(__dirname, '../uploads');
const PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:3002';

// Ensure upload directories exist
const createUploadDirs = () => {
  const dirs = [
    UPLOAD_DIR,
    path.join(UPLOAD_DIR, 'pois'),
    path.join(UPLOAD_DIR, 'platform'),
    path.join(UPLOAD_DIR, 'avatars'),
    path.join(UPLOAD_DIR, 'documents')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirs();

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadType = req.params.type || 'pois';
    const dest = path.join(UPLOAD_DIR, uploadType);

    // Ensure directory exists
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    cb(null, dest);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedImageTypes = /jpeg|jpg|png|gif|webp|svg/;
  const allowedDocTypes = /pdf|doc|docx|txt/;

  const ext = path.extname(file.originalname).toLowerCase().substring(1);
  const mimetype = file.mimetype;

  const uploadType = req.params.type || 'pois';

  if (uploadType === 'documents') {
    // Check document types
    if (allowedDocTypes.test(ext) || mimetype.includes('pdf') || mimetype.includes('document')) {
      cb(null, true);
    } else {
      cb(new Error('Only document files (PDF, DOC, DOCX, TXT) are allowed.'), false);
    }
  } else {
    // Check image types
    if (allowedImageTypes.test(ext) || mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP, SVG) are allowed.'), false);
    }
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * @route   POST /api/admin/upload/:type
 * @desc    Upload file (type: pois, platform, avatars, documents)
 * @access  Private (Admin with upload permission)
 */
router.post(
  '/:type',
  verifyAdminToken,
  requirePermission('media', 'upload'),
  logActivity('upload', 'file'),
  (req, res, next) => {
    const uploadHandler = upload.single('file');

    uploadHandler(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File too large. Maximum size is 10MB.'
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded.'
        });
      }

      const uploadType = req.params.type;
      const fileUrl = `${PUBLIC_URL}/uploads/${uploadType}/${req.file.filename}`;

      res.json({
        success: true,
        message: 'File uploaded successfully.',
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          url: fileUrl,
          path: req.file.path
        }
      });

    } catch (error) {
      console.error('Upload error:', error);

      // Delete uploaded file on error
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        message: 'Server error during file upload.'
      });
    }
  }
);

/**
 * @route   POST /api/admin/upload/:type/multiple
 * @desc    Upload multiple files
 * @access  Private (Admin with upload permission)
 */
router.post(
  '/:type/multiple',
  verifyAdminToken,
  requirePermission('media', 'upload'),
  logActivity('upload_multiple', 'files'),
  (req, res, next) => {
    const uploadHandler = upload.array('files', 10); // Max 10 files

    uploadHandler(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'One or more files are too large. Maximum size is 10MB per file.'
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            message: 'Too many files. Maximum is 10 files.'
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded.'
        });
      }

      const uploadType = req.params.type;

      const files = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        url: `${PUBLIC_URL}/uploads/${uploadType}/${file.filename}`,
        path: file.path
      }));

      res.json({
        success: true,
        message: `${files.length} files uploaded successfully.`,
        data: {
          files
        }
      });

    } catch (error) {
      console.error('Multiple upload error:', error);

      // Delete uploaded files on error
      if (req.files) {
        req.files.forEach(file => {
          if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error during file upload.'
      });
    }
  }
);

/**
 * @route   DELETE /api/admin/upload/:type/:filename
 * @desc    Delete uploaded file
 * @access  Private (Admin with delete permission)
 */
router.delete(
  '/:type/:filename',
  verifyAdminToken,
  requirePermission('media', 'delete'),
  logActivity('delete', 'file'),
  async (req, res) => {
    try {
      const { type, filename } = req.params;

      // Validate filename (prevent directory traversal)
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid filename.'
        });
      }

      const filePath = path.join(UPLOAD_DIR, type, filename);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'File not found.'
        });
      }

      // Delete file
      fs.unlinkSync(filePath);

      res.json({
        success: true,
        message: 'File deleted successfully.',
        data: {
          filename
        }
      });

    } catch (error) {
      console.error('Delete file error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error deleting file.'
      });
    }
  }
);

/**
 * @route   GET /api/admin/upload/:type
 * @desc    List uploaded files
 * @access  Private (Admin)
 */
router.get(
  '/:type',
  verifyAdminToken,
  requirePermission('media', 'upload'),
  async (req, res) => {
    try {
      const { type } = req.params;
      const dirPath = path.join(UPLOAD_DIR, type);

      // Check if directory exists
      if (!fs.existsSync(dirPath)) {
        return res.json({
          success: true,
          data: {
            files: []
          }
        });
      }

      // Read directory
      const files = fs.readdirSync(dirPath);

      const fileList = files.map(filename => {
        const filePath = path.join(dirPath, filename);
        const stats = fs.statSync(filePath);

        return {
          filename,
          size: stats.size,
          url: `${PUBLIC_URL}/uploads/${type}/${filename}`,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        };
      });

      // Sort by creation date (newest first)
      fileList.sort((a, b) => b.createdAt - a.createdAt);

      res.json({
        success: true,
        data: {
          files: fileList
        }
      });

    } catch (error) {
      console.error('List files error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error listing files.'
      });
    }
  }
);

export default router;
