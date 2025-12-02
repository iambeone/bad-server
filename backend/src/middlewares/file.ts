import fs from 'fs';
import path, { extname } from 'path';
import crypto from 'crypto';
import multer, { FileFilterCallback } from 'multer';
import { Request, Express } from 'express';

type DestinationCallback = (error: Error | null, destination: string) => void;
type FileNameCallback = (error: Error | null, filename: string) => void;

const internalUploadDir = path.join(
  process.cwd(), // /app
  'src/public',
  process.env.UPLOAD_PATH_TEMP || 'temp',
);

if (!fs.existsSync(internalUploadDir)) {
  fs.mkdirSync(internalUploadDir, { recursive: true });
  console.log('UPLOAD DIR CREATED:', internalUploadDir);
} else {
  console.log('UPLOAD DIR EXISTS:', internalUploadDir);
}

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: DestinationCallback) => {
    cb(null, internalUploadDir); // Пишем внутрь контейнера
  },
  filename: (_req: Request, file: Express.Multer.File, cb: FileNameCallback) => {
    const ext = extname(file.originalname);
    const name = crypto.randomBytes(16).toString('hex');
    cb(null, `${name}${ext}`);
  },
});

const types = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif'];

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (!types.includes(file.mimetype)) {
    return cb(null, false);
  }
  return cb(null, true);
};

export default multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});
