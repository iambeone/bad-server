// init/uploadDir.ts
import fs from 'fs';
import path from 'path';

const workspace =
  process.env.GITHUB_WORKSPACE || path.resolve(process.cwd(), '..');

const tempDir = path.join(
  workspace,
  'backend/src/public',
  process.env.UPLOAD_PATH_TEMP || 'temp',
);

console.log('INIT uploadDir workspace:', workspace);
console.log('INIT uploadDir tempDir:', tempDir);

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
  console.log('INIT uploadDir created:', tempDir);
} else {
  console.log('INIT uploadDir already exists:', tempDir);
}

export default tempDir;
