import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Direktori penyimpanan file upload di root backend
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi Multer Storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Generate nama file unik dengan timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // Maksimal 15 MB
  },
  fileFilter: (_req, file, cb) => {
    // Izinkan gambar, pdf, dokumen office, dan teks
    const allowedExtensions = /jpeg|jpg|png|gif|webp|pdf|docx|doc|xlsx|xls|txt|zip/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Format file tidak didukung. Unggah gambar, PDF, dokumen, atau ZIP.'));
    }
  },
});

// POST /api/upload
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  upload.single('file')(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Ukuran file melebihi batas maksimal 15MB' });
      }
      return res.status(400).json({ message: `Kesalahan unggah file: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message || 'Gagal mengunggah file' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file yang dipilih untuk diunggah' });
    }

    // Path yang dapat diakses oleh client
    const fileUrl = `/uploads/${req.file.filename}`;

    return res.status(201).json({
      message: 'File berhasil diunggah',
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: fileUrl,
    });
  });
});

export default router;
