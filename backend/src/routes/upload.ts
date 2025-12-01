import { Router } from 'express';
import upload from '../middlewares/file';

const uploadRouter = Router();

uploadRouter.post('/', upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Файл не загружен' });
    }

    return res.status(200).json({ fileName: req.file.path });
  } catch (error) {
    next(error);
  }
});

export default uploadRouter;