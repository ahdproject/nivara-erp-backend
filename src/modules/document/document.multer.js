// Dedicated multer config for document uploads
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', '..', 'uploads');

// Allowed doc_type → sub-folder mapping
const TYPE_FOLDERS = {
  agreement:       'agreement',
  kyc:             'kyc',
  payment_receipt: 'payment_receipt',
  approval:        'approval',
  plan:            'plan',
  noc:             'noc',
  legal:           'legal',
  marketing:       'marketing',
  other:           'other',
};

const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const docType   = req.body.doc_type || 'other';
    const subFolder = TYPE_FOLDERS[docType] || 'other';
    const dir       = path.join(UPLOAD_ROOT, subFolder);

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },

  filename: (req, file, cb) => {
    const ext      = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      Object.assign(
        new Error(`File type not allowed. Allowed: PDF, JPG, PNG, WEBP, DOC, DOCX, XLS, XLSX`),
        { status: 422 }
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
});

module.exports = upload;