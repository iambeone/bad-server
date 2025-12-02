import fs from 'fs';
import path from 'path';
import { test, expect } from '@playwright/test';
import shell from 'shelljs';

const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

const requestWithRetry = async (
  request: any,
  method: 'get' | 'post',
  url: string,
  options: Record<string, any> = {},
  retries = 3,
) => {
  let attempt = 0;
  let response;
  url = 'http://localhost:3000'
  while (attempt <= retries) {
    console.log("test url: ", url)
    response = await request[method](url, options);
    if (response.status() !== 429) {
      return response;
    }
    await wait(6000);
    attempt += 1;
  }
  return response;
};

test('Нельзя использовать оригинальное имя файла при формировании пути', async ({ request }) => {
    const imagePath = path.join(process.cwd(), 'backend/data/mimage.png');
    const image = fs.readFileSync(imagePath);

    const response = await request.post('http://localhost:3000/upload', {
      headers: {
        'Authorization': `Bearer ${process.env.ADMIN_TOKEN || ''}`
      },
      multipart: {
        file: {
          name: imagePath,
          mimeType: 'image/png',
          buffer: image
        }
      }
    });

    const status = response.status();
    const text = await response.text();
    console.log('LOCAL UPLOAD STATUS:', status);
    console.log('LOCAL UPLOAD BODY:', text);
    const data = await response.json();
    expect(response.ok()).toBeTruthy();
    expect(data.fileName).toBeDefined();

    const uploadedFileName = path.basename(data.fileName);
    const localFileName = path.basename(imagePath);

    expect(uploadedFileName).not.toEqual(localFileName);
  });