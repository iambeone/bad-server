import fs from 'fs';
import path, { extname } from 'path';
import crypto from 'crypto';
import multer, { FileFilterCallback } from 'multer';
import { Request, Express } from 'express';

type DestinationCallback = (error: Error | null, destination: string) => void;
type FileNameCallback = (error: Error | null, filename: string) => void;

// 1) Путь внутри контейнера (туда пишет Multer)
const internalUploadDir = path.join(
  '/backend/src/public',
  process.env.UPLOAD_PATH_TEMP || 'temp',
);

// 2) Путь снаружи, как в тестах (через GITHUB_WORKSPACE)
const workspace =
  process.env.GITHUB_WORKSPACE || path.resolve(process.cwd(), '..');

const externalUploadDir = path.join(
  workspace,
  'backend/src/public',
  process.env.UPLOAD_PATH_TEMP || 'temp',
);

// Функция безопасного создания каталога
const ensureDir = (dir: string) => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log('UPLOAD DIR CREATED:', dir);
    } else {
      console.log('UPLOAD DIR EXISTS:', dir);
    }
  } catch (e) {
    console.error('UPLOAD DIR CREATE ERROR:', dir, e);
  }
};

// Создаём оба каталога (если получается)
ensureDir(internalUploadDir);
ensureDir(externalUploadDir);

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
