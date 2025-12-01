import { Router } from 'express';
import upload from '../middlewares/file';

const uploadRouter = Router();

uploadRouter.post('/', upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Файл не загружен' });
    }

    // Минимум 2kb
    if (req.file.size < 2 * 1024) {
      return res.status(400).json({ message: 'Файл слишком маленький' });
    }

    return res.status(200).json({ fileName: req.file.path });
  } catch (e) {
    return next(e);
  }
});

export default uploadRouter;