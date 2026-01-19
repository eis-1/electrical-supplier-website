import { afterEach, describe, expect, jest, test } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';

type StorageEnv = {
  STORAGE_PROVIDER: 'local' | 's3' | 'r2';
  S3_REGION: string;
  S3_BUCKET: string;
  S3_ACCESS_KEY_ID: string;
  S3_SECRET_ACCESS_KEY: string;
  S3_ENDPOINT?: string;
  S3_PUBLIC_URL?: string;
  S3_PUBLIC_BUCKET: boolean;
  UPLOAD_DIR: string;
};

async function importStorageServiceLocal(uploadDir: string) {
  jest.resetModules();

  const logger = {
    info: jest.fn(() => undefined),
    warn: jest.fn(() => undefined),
    error: jest.fn(() => undefined),
  };

  const env: StorageEnv = {
    STORAGE_PROVIDER: 'local',
    S3_REGION: 'us-east-1',
    S3_BUCKET: 'test-bucket',
    S3_ACCESS_KEY_ID: 'x',
    S3_SECRET_ACCESS_KEY: 'y',
    S3_ENDPOINT: '',
    S3_PUBLIC_URL: '',
    S3_PUBLIC_BUCKET: true,
    UPLOAD_DIR: uploadDir,
  };

  jest.doMock('../src/config/env', () => ({ env }));
  jest.doMock('../src/utils/logger', () => ({ logger }));

  const mod = await import('../src/utils/storage.service');

  return {
    storageService: mod.storageService,
    mocks: { logger },
  };
}

describe('StorageService (local provider)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('upload() moves file into UPLOAD_DIR/subfolder and returns key/url/size', async () => {
    const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'esw-uploads-'));

    try {
      const { storageService } = await importStorageServiceLocal(uploadDir);

      const tmpIncoming = path.join(os.tmpdir(), `esw-incoming-${Date.now()}.txt`);
      fs.writeFileSync(tmpIncoming, 'hello', 'utf8');

      const res = await storageService.upload(tmpIncoming, {
        filename: 'hello.txt',
        mimetype: 'text/plain',
        subfolder: 'docs',
      });

      expect(res.key).toBe('docs/hello.txt');
      expect(res.url).toBe('/uploads/docs/hello.txt');
      expect(res.mimetype).toBe('text/plain');
      expect(res.size).toBeGreaterThan(0);

      const destPath = path.join(uploadDir, 'docs', 'hello.txt');
      expect(fs.existsSync(destPath)).toBe(true);
      expect(fs.existsSync(tmpIncoming)).toBe(false);
    } finally {
      fs.rmSync(uploadDir, { recursive: true, force: true });
    }
  });

  test('exists() returns true/false based on filesystem', async () => {
    const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'esw-uploads-'));

    try {
      const { storageService } = await importStorageServiceLocal(uploadDir);

      const key = 'docs/a.txt';
      const destPath = path.join(uploadDir, key);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, 'a', 'utf8');

      await expect(storageService.exists(key)).resolves.toBe(true);
      await expect(storageService.exists('docs/missing.txt')).resolves.toBe(false);
    } finally {
      fs.rmSync(uploadDir, { recursive: true, force: true });
    }
  });

  test('delete() blocks path traversal keys', async () => {
    const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'esw-uploads-'));

    try {
      const { storageService } = await importStorageServiceLocal(uploadDir);

      await expect(storageService.delete('../evil.txt')).rejects.toThrow('Invalid file path');
      await expect(storageService.delete('..\\evil.txt')).rejects.toThrow('Invalid file path');
    } finally {
      fs.rmSync(uploadDir, { recursive: true, force: true });
    }
  });

  test('delete() removes existing file under UPLOAD_DIR', async () => {
    const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'esw-uploads-'));

    try {
      const { storageService } = await importStorageServiceLocal(uploadDir);

      const key = 'docs/to-delete.txt';
      const destPath = path.join(uploadDir, key);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, 'bye', 'utf8');

      expect(fs.existsSync(destPath)).toBe(true);
      await storageService.delete(key);
      expect(fs.existsSync(destPath)).toBe(false);
    } finally {
      fs.rmSync(uploadDir, { recursive: true, force: true });
    }
  });
});
