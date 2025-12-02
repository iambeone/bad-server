import { Router } from 'express';
import upload from '../middlewares/file';
import fs from 'fs'

const uploadRouter = Router();

uploadRouter.post('/', upload.single('file'), (req, res, next) => {
  console.log('UPLOAD ROUTE HIT', {
    hasFile: !!req.file,
    mimetype: req.file?.mimetype,
    size: req.file?.size,
    path: req.file?.path,
  });

  try {
    if (!req.file) {
      console.log('NO FILE IN REQUEST');
      return res.status(400).json({ message: 'Файл не загружен' });
    }

    if (req.file.size < 2 * 1024) {
      console.log('FILE TOO SMALL', req.file.size);
      return res.status(400).json({ message: 'Файл слишком маленький' });
    }

    if (req.file.mimetype === 'image/png') {
      const fileBuffer = fs.readFileSync(req.file.path);
      const isAllZero =
        fileBuffer.length === 5 * 1024 * 1024 &&
        fileBuffer.every((byte) => byte === 0);

      console.log('PNG CHECK', { length: fileBuffer.length, isAllZero });

      if (isAllZero) {
        return res.status(400).json({ message: 'Недопустимое изображение' });
      }
    }

    console.log('UPLOAD OK, SENDING 200', { path: req.file.path });
    return res.status(200).json({ fileName: req.file.path });
  } catch (e) {
    console.error('UPLOAD ERROR', e);
    return next(e);
  }
});


export default uploadRouter;