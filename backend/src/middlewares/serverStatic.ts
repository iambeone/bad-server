import { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export default function serveStatic(baseDir: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const relPath = path
      .normalize(req.path)
      .replace(/^(\.\.[/\\])+/, '')
      .replace(/^[/\\]+/, '');

    const filePath = relPath || 'index.html';

    fs.access(path.join(baseDir, filePath), fs.constants.F_OK, (err) => {
      if (err) {
        // файла нет — просто идём дальше по middleware, без index.html
        return next();
      }

      return res.sendFile(filePath, { root: baseDir }, (sendErr) => {
        if (sendErr) {
          next(sendErr);
        }
      });
    });
  };
}

