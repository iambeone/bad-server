import { NextFunction, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'

export default function serveStatic(baseDir: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // нормализуем путь и убираем ведущий слэш
    const relPath = path.normalize(req.path).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');

    fs.access(path.join(baseDir, relPath), fs.constants.F_OK, (err) => {
      if (err) {
        return next();
      }

      return res.sendFile(relPath, { root: baseDir }, (sendErr) => {
        if (sendErr) {
          next(sendErr);
        }
      });
    });
  };
}

