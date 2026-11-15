import { Injectable } from '@nestjs/common';
import { mkdir, open, readFile, unlink, readdir, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { fail } from './errors.js';
export function imageType(bytes: Buffer) {
  if (
    bytes.length >= 3 &&
    bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
  )
    return 'image/jpeg';
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return 'image/png';
  if (
    bytes.length >= 12 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP'
  )
    return 'image/webp';
  fail(422, 'INVALID_PHOTO', 'Only JPEG, PNG, or WebP photos are accepted.');
}
@Injectable()
export class PhotoStorage {
  readonly root = resolve(
    process.env.EVIDENCE_STORAGE_DIR ?? 'storage/evidence',
  );
  path(key: string) {
    if (!/^[a-f0-9-]{36}$/.test(key))
      fail(400, 'INVALID_STORAGE_KEY', 'Invalid evidence key.');
    return join(this.root, key);
  }
  async stage(bytes: Buffer, mimeType: string) {
    if (!bytes.length) fail(400, 'PHOTO_REQUIRED', 'Please select a photo.');
    if (bytes.length > 5242880)
      fail(413, 'PHOTO_TOO_LARGE', 'Maximum photo size is 5 MiB.');
    if (imageType(bytes) !== mimeType)
      fail(422, 'INVALID_PHOTO', 'Photo content does not match its MIME type.');
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const storageKey = randomUUID();
    const file = await open(this.path(storageKey), 'wx', 0o600);
    try {
      await file.writeFile(bytes);
      await file.sync();
    } finally {
      await file.close();
    }
    return {
      storageKey,
      mimeType,
      size: bytes.length,
      fingerprint: createHash('sha256').update(bytes).digest('hex'),
    };
  }
  async verify(d: {
    storageKey: string;
    mimeType: string;
    size: number;
    fingerprint: string;
  }) {
    const bytes = await readFile(this.path(d.storageKey));
    if (
      bytes.length !== d.size ||
      imageType(bytes) !== d.mimeType ||
      createHash('sha256').update(bytes).digest('hex') !== d.fingerprint
    )
      fail(422, 'INVALID_PHOTO', 'Evidence verification failed.');
  }
  async remove(key: string) {
    await unlink(this.path(key)).catch((e: NodeJS.ErrnoException) => {
      if (e.code !== 'ENOENT') throw e;
    });
  }
  async candidates() {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const keys = await readdir(this.root);
    const result: string[] = [];
    for (const key of keys) {
      if (!/^[a-f0-9-]{36}$/.test(key)) continue;
      const s = await stat(this.path(key));
      if (s.mtimeMs < Date.now() - 86400000) result.push(key);
    }
    return result;
  }
}
