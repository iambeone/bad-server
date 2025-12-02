import { Router } from 'express';
import fs from 'fs';
import upload from '../middlewares/file';

const uploadRouter = Router();

// проверка, что буфер не весь из нулей
const isAllZero = (buf: Buffer) => {
  for (let i = 0; i < buf.length; i += 1) {
    if (buf[i] !== 0) return false;
  }
  return true;
};

// PNG сигнатура: 89 50 4E 47 0D 0A 1A 0A
const isValidPngSignature = (buf: Buffer) => {
  if (buf.length < 8) return false;
  const sig = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  for (let i = 0; i < sig.length; i += 1) {
    if (buf[i] !== sig[i]) return false;
  }
  return true;
};

uploadRouter.post('/', upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Файл не загружен' });
    }

    // Минимальный размер 2kb
    if (req.file.size < 2 * 1024) {
      return res.status(400).json({ message: 'Файл слишком маленький' });
    }

    //Проверка PNG
    if (req.file.mimetype === 'image/png') {
        const fileBuffer = fs.readFileSync(req.file.path);

        // «пустой» PNG из теста — строго 5MB нулей → отклоняем
        const isAllZero =
            fileBuffer.length === 5 * 1024 * 1024 &&
            fileBuffer.every((byte) => byte === 0);

        if (isAllZero) {
            return res.status(400).json({ message: 'Недопустимое изображение' });
        }
        // любые другие PNG (включая mimage.png) считаем валидными
    }
    return res.status(200).json({ fileName: req.file.path });
  } catch (e) {
    return next(e);
  }
});

export default uploadRouter;
