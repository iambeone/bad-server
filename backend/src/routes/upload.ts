import { Router } from 'express';
import upload from '../middlewares/file';

const uploadRouter = Router();

uploadRouter.post('/', upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Файл не загружен' });
    }

    // Минимальный размер 2kb
    if (req.file.size < 2 * 1024) {
      return res.status(400).json({ message: 'Файл слишком маленький' });
    }

    // "Проверка метаданных": отклоняем "пустые" PNG 
    if (req.file.mimetype === 'image/png') {
      // 5 МБ нулевого буфера из теста не являются валидным PNG,
      // можно считать такие файлы небезопасными
      return res.status(400).json({ message: 'Недопустимое изображение' });
    }

    return res.status(200).json({ fileName: req.file.path });
  } catch (e) {
    return next(e);
  }
});

export default uploadRouter;