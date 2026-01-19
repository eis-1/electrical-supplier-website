import { afterEach, describe, expect, jest, test } from '@jest/globals';

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

const defaultEnv: StorageEnv = {
  STORAGE_PROVIDER: 's3',
  S3_REGION: 'us-east-1',
  S3_BUCKET: 'test-bucket',
  S3_ACCESS_KEY_ID: 'test-access-key',
  S3_SECRET_ACCESS_KEY: 'test-secret',
  S3_ENDPOINT: 'https://r2.example.com',
  S3_PUBLIC_URL: '',
  S3_PUBLIC_BUCKET: true,
  UPLOAD_DIR: './uploads',
};

async function importStorageService(envOverrides: Partial<StorageEnv> = {}) {
  jest.resetModules();

  const logger = {
    info: jest.fn(() => undefined),
    warn: jest.fn(() => undefined),
    error: jest.fn(() => undefined),
  };

  const send = jest.fn(async () => ({})) as any;

  const S3Client = jest.fn().mockImplementation((config: any) => ({
    send,
    __config: config,
  }));

  class DeleteObjectCommand {
    input: any;
    constructor(input: any) {
      this.input = input;
    }
  }

  class HeadObjectCommand {
    input: any;
    constructor(input: any) {
      this.input = input;
    }
  }

  const UploadMock = jest.fn().mockImplementation(({ params }: any) => ({
    __params: params,
    done: jest.fn(() => Promise.resolve()),
  }));

  const fsMock = {
    createReadStream: jest.fn(() => ({ __stream: true })),
    statSync: jest.fn(() => ({ size: 123 })),
    unlinkSync: jest.fn(() => undefined),
    existsSync: jest.fn(() => true),
    // local provider methods (not used in these tests but safe)
    renameSync: jest.fn(() => undefined),
    mkdirSync: jest.fn(() => undefined),
  };

  jest.doMock('../src/config/env', () => ({
    env: {
      ...defaultEnv,
      ...envOverrides,
    },
  }));

  jest.doMock('../src/utils/logger', () => ({ logger }));

  jest.doMock('fs', () => ({
    __esModule: true,
    default: fsMock,
  }));

  jest.doMock('@aws-sdk/client-s3', () => ({
    S3Client,
    DeleteObjectCommand,
    HeadObjectCommand,
  }));

  jest.doMock('@aws-sdk/lib-storage', () => ({
    Upload: UploadMock,
  }));

  const mod = await import('../src/utils/storage.service');

  return {
    storageService: mod.storageService,
    mocks: {
      logger,
      send,
      S3Client,
      DeleteObjectCommand,
      HeadObjectCommand,
      UploadMock,
      fsMock,
    },
  };
}

describe('StorageService (S3/R2 mocked)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('initializes S3 client with forcePathStyle=false for S3', async () => {
    const { mocks } = await importStorageService({ STORAGE_PROVIDER: 's3' });

    expect(mocks.S3Client).toHaveBeenCalledTimes(1);
    const config = mocks.S3Client.mock.calls[0][0] as any;
    expect(config.forcePathStyle).toBe(false);
  });

  test('initializes S3 client with forcePathStyle=true for R2', async () => {
    const { mocks } = await importStorageService({ STORAGE_PROVIDER: 'r2' });

    expect(mocks.S3Client).toHaveBeenCalledTimes(1);
    const config = mocks.S3Client.mock.calls[0][0] as any;
    expect(config.forcePathStyle).toBe(true);
  });

  test('upload() uses @aws-sdk/lib-storage Upload and removes temp file (success)', async () => {
    const { storageService, mocks } = await importStorageService({
      STORAGE_PROVIDER: 's3',
      S3_PUBLIC_BUCKET: true,
    });

    const result = await storageService.upload('C:/tmp/file.bin', {
      filename: 'file.bin',
      mimetype: 'application/octet-stream',
      subfolder: 'docs',
    });

    expect(mocks.UploadMock).toHaveBeenCalledTimes(1);
    const uploadArgs = mocks.UploadMock.mock.calls[0][0] as any;
    expect(uploadArgs.params.Bucket).toBe(defaultEnv.S3_BUCKET);
    expect(uploadArgs.params.Key).toBe('docs/file.bin');
    expect(uploadArgs.params.ContentType).toBe('application/octet-stream');
    expect(uploadArgs.params.ACL).toBe('public-read');

    expect(mocks.fsMock.unlinkSync).toHaveBeenCalledWith('C:/tmp/file.bin');

    expect(result).toEqual({
      key: 'docs/file.bin',
      url: `https://${defaultEnv.S3_BUCKET}.s3.${defaultEnv.S3_REGION}.amazonaws.com/docs/file.bin`,
      size: 123,
      mimetype: 'application/octet-stream',
    });
  });

  test('upload() omits ACL when bucket is not public', async () => {
    const { storageService, mocks } = await importStorageService({
      STORAGE_PROVIDER: 's3',
      S3_PUBLIC_BUCKET: false,
    });

    await storageService.upload('C:/tmp/file.bin', {
      filename: 'file.bin',
      mimetype: 'application/octet-stream',
      subfolder: 'docs',
    });

    const uploadArgs = mocks.UploadMock.mock.calls[0][0] as any;
    expect(uploadArgs.params.ACL).toBeUndefined();
  });

  test('upload() deletes temp file even on upload error', async () => {
    jest.resetModules();

    const logger = {
      info: jest.fn(() => undefined),
      warn: jest.fn(() => undefined),
      error: jest.fn(() => undefined),
    };
    const send = jest.fn(async () => ({})) as any;

    const S3Client = jest.fn().mockImplementation((config: any) => ({ send, __config: config }));

    class DeleteObjectCommand {
      input: any;
      constructor(input: any) {
        this.input = input;
      }
    }

    class HeadObjectCommand {
      input: any;
      constructor(input: any) {
        this.input = input;
      }
    }

    const UploadMock = jest.fn().mockImplementation(() => ({
      done: jest.fn(() => Promise.reject(new Error('upload failed'))),
    }));

    const fsMock = {
      createReadStream: jest.fn(() => ({ __stream: true })),
      statSync: jest.fn(() => ({ size: 123 })),
      unlinkSync: jest.fn(() => undefined),
      existsSync: jest.fn(() => true),
    };

    jest.doMock('../src/config/env', () => ({
      env: {
        ...defaultEnv,
        STORAGE_PROVIDER: 's3',
      },
    }));

    jest.doMock('../src/utils/logger', () => ({ logger }));
    jest.doMock('fs', () => ({ __esModule: true, default: fsMock }));
    jest.doMock('@aws-sdk/client-s3', () => ({ S3Client, DeleteObjectCommand, HeadObjectCommand }));
    jest.doMock('@aws-sdk/lib-storage', () => ({ Upload: UploadMock }));

    const { storageService } = await import('../src/utils/storage.service');

    await expect(
      storageService.upload('C:/tmp/file.bin', {
        filename: 'file.bin',
        mimetype: 'application/octet-stream',
        subfolder: 'docs',
      })
    ).rejects.toThrow('upload failed');

    expect(fsMock.unlinkSync).toHaveBeenCalledWith('C:/tmp/file.bin');
  });

  test('delete() sends DeleteObjectCommand with correct Bucket/Key', async () => {
    const { storageService, mocks } = await importStorageService({ STORAGE_PROVIDER: 's3' });

    await storageService.delete('docs/file.bin');

    expect(mocks.send).toHaveBeenCalledTimes(1);
    const cmd = mocks.send.mock.calls[0][0] as any;
    expect(cmd).toBeInstanceOf(mocks.DeleteObjectCommand);
    expect(cmd.input).toEqual({
      Bucket: defaultEnv.S3_BUCKET,
      Key: 'docs/file.bin',
    });
  });

  test('exists() returns true when HeadObject succeeds, false when NotFound', async () => {
    const { storageService, mocks } = await importStorageService({ STORAGE_PROVIDER: 's3' });

    mocks.send.mockResolvedValueOnce({} as any);
    await expect(storageService.exists('a.txt')).resolves.toBe(true);

    mocks.send.mockRejectedValueOnce({ name: 'NotFound' } as any);
    await expect(storageService.exists('missing.txt')).resolves.toBe(false);
  });

  test('getUrl() respects S3_PUBLIC_URL when provided', async () => {
    const { storageService } = await importStorageService({
      STORAGE_PROVIDER: 's3',
      S3_PUBLIC_URL: 'https://cdn.example.com',
    });

    expect(storageService.getUrl('docs/file.bin')).toBe('https://cdn.example.com/docs/file.bin');
  });

  test('getUrl() uses endpoint style for R2', async () => {
    const { storageService } = await importStorageService({
      STORAGE_PROVIDER: 'r2',
      S3_ENDPOINT: 'https://r2.example.com',
      S3_BUCKET: 'bucket',
    });

    expect(storageService.getUrl('docs/file.bin')).toBe('https://r2.example.com/bucket/docs/file.bin');
  });
});
