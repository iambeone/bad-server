// src/init/uploadDir.ts
import fs from 'fs';
import { join, resolve } from 'path';

const workspace =
  process.env.GITHUB_WORKSPACE || resolve(process.cwd(), '..');

const uploadDir = join(
  workspace,
  'backend',
  'src',
  'public',
  process.env.UPLOAD_PATH_TEMP || 'temp',
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export default uploadDir;
