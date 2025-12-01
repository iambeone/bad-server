import fs from 'fs';
import { join, extname } from 'path';
import crypto from 'crypto';
import multer, { FileFilterCallback } from 'multer';
import { Request, Express } from 'express';

type DestinationCallback = (error: Error | null, destination: string) => void;
type FileNameCallback = (error: Error | null, filename: string) => void;

// Пытаемся создать temp в двух возможных местах:
// 1) dist/public/temp (запуск собранного кода)
// 2) ../public/temp (запуск из src)
const candidateDirs = [
  join(__dirname, '..', 'public', process.env.UPLOAD_PATH_TEMP || 'temp'),
  join(__dirname, '..', '..', 'public', process.env.UPLOAD_PATH_TEMP || 'temp'),
];

let uploadDir = candidateDirs[0];

for (const dir of candidateDirs) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    uploadDir = dir;
    break;
  } catch {
    // пробуем следующий вариант
  }
}

const storage = multer.diskStorage({
  destination: (
    _req: Request,
    _file: Express.Multer.File,
    cb: DestinationCallback
  ) => {
    cb(null, uploadDir);
  },
  filename: (
    _req: Request,
    file: Express.Multer.File,
    cb: FileNameCallback
  ) => {
    const ext = extname(file.originalname);
    const name = crypto.randomBytes(16).toString('hex');
    cb(null, `${name}${ext}`);
  },
});

const types = [
  'image/png',
  'image/jpg',
  'image/jpeg',
  'image/gif',
];

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (!types.includes(file.mimetype)) {
    return cb(null, false);
  }
  return cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export default upload;
