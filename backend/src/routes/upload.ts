import { Router } from 'express';
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

    // Проверка PNG
    if (req.file.mimetype === 'image/png') {
      const buffer = req.file.buffer as Buffer | undefined;

      // Multer с diskStorage по умолчанию НЕ кладёт buffer в req.file,
      // поэтому для этой проверки нужно использовать memoryStorage
      // или отдельно прочитать файл с диска.
      // Если ты переключился на memoryStorage — этот код сработает сразу. [web:21][web:32]

      if (!buffer) {
        // на всякий случай: если буфера нет, считаем файл недопустимым
        return res.status(400).json({ message: 'Недопустимое изображение' });
      }

      // 5 МБ нулевого буфера из теста — все байты 0 → отклоняем
      if (isAllZero(buffer) || !isValidPngSignature(buffer)) {
        return res.status(400).json({ message: 'Недопустимое изображение' });
      }
    }

    return res.status(200).json({ fileName: req.file.path });
  } catch (e) {
    return next(e);
  }
});

export default uploadRouter;
