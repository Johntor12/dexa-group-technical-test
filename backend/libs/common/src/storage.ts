import { Injectable, OnModuleInit } from '@nestjs/common';
import { mkdir, open, readFile, unlink, readdir, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { fail } from './errors.js';

export function imageType(bytes: Buffer) {
  if (bytes.length >= 3 && bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) return 'image/jpeg';
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  fail(422, 'INVALID_PHOTO', 'Only JPEG, PNG, or WebP photos are accepted.');
}

@Injectable()
export class PhotoStorage implements OnModuleInit {
  readonly root = resolve(process.env.EVIDENCE_STORAGE_DIR ?? 'storage/evidence');
  readonly provider: 'local' | 'supabase';
  private readonly bucket: string;
  private readonly supabase: ReturnType<typeof createClient> | null;

  constructor() {
    const requested = process.env.PHOTO_STORAGE_PROVIDER;
    this.provider = (requested ?? (process.env.NODE_ENV === 'production' ? 'supabase' : 'local')) as 'local' | 'supabase';
    if (this.provider !== 'local' && this.provider !== 'supabase') throw new Error('PHOTO_STORAGE_PROVIDER must be local or supabase.');
    this.bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'attendance-evidence';
    if (this.provider === 'supabase') {
      const url = process.env.SUPABASE_URL?.trim();
      const key = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
      if (!url || !key) throw new Error('Supabase photo storage requires SUPABASE_URL and SUPABASE_SECRET_KEY.');
      if (!/^https:\/\//i.test(url)) throw new Error('SUPABASE_URL must use HTTPS.');
      this.supabase = createClient(url.replace(/\/$/, ''), key, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
    } else {
      this.supabase = null;
    }
  }

  async onModuleInit() {
    if (this.provider !== 'supabase') return;
    const { data, error } = await this.supabase!.storage.getBucket(this.bucket);
    if (error || !data) throw new Error('Supabase Storage bucket is unavailable; verify SUPABASE_STORAGE_BUCKET and the server secret key.');
    if (data.public) throw new Error('The attendance evidence bucket must be private.');
    if (typeof data.file_size_limit === 'number' && data.file_size_limit < 5242880)
      throw new Error('The attendance evidence bucket limit must allow files up to 5 MiB.');
    const allowed = data.allowed_mime_types;
    if (allowed && ['image/jpeg', 'image/png', 'image/webp'].some((type) => !allowed.includes(type)))
      throw new Error('The attendance evidence bucket must allow JPEG, PNG, and WebP.');
  }

  private assertKey(key: string) {
    if (!/^[a-f0-9-]{36}$/.test(key)) fail(400, 'INVALID_STORAGE_KEY', 'Invalid evidence key.');
  }

  path(key: string) {
    this.assertKey(key);
    return join(this.root, key);
  }

  async stage(bytes: Buffer, mimeType: string) {
    if (!bytes.length) fail(400, 'PHOTO_REQUIRED', 'Please select a photo.');
    if (bytes.length > 5242880) fail(413, 'PHOTO_TOO_LARGE', 'Maximum photo size is 5 MiB.');
    if (imageType(bytes) !== mimeType) fail(422, 'INVALID_PHOTO', 'Photo content does not match its MIME type.');
    const storageKey = randomUUID();
    if (this.provider === 'supabase') {
      const { error } = await this.supabase!.storage.from(this.bucket).upload(storageKey, Uint8Array.from(bytes).buffer, { contentType: mimeType, cacheControl: '0', upsert: false });
      if (error) throw new Error('Supabase Storage upload failed: ' + error.name);
    } else {
      await mkdir(this.root, { recursive: true, mode: 0o700 });
      const file = await open(this.path(storageKey), 'wx', 0o600);
      try { await file.writeFile(bytes); await file.sync(); } finally { await file.close(); }
    }
    return { storageKey, mimeType, size: bytes.length, fingerprint: createHash('sha256').update(bytes).digest('hex') };
  }

  async verify(d: { storageKey: string; mimeType: string; size: number; fingerprint: string }) {
    const bytes = await this.read(d.storageKey);
    if (bytes.length !== d.size || imageType(bytes) !== d.mimeType || createHash('sha256').update(bytes).digest('hex') !== d.fingerprint)
      fail(422, 'INVALID_PHOTO', 'Evidence verification failed.');
  }

  async read(key: string): Promise<Buffer> {
    this.assertKey(key);
    if (this.provider === 'supabase') {
      const { data, error } = await this.supabase!.storage.from(this.bucket).download(key);
      if (error || !data) throw new Error('Supabase Storage download failed.');
      return Buffer.from(await data.arrayBuffer());
    }
    return readFile(this.path(key));
  }

  async remove(key: string) {
    this.assertKey(key);
    if (this.provider === 'supabase') {
      const { error } = await this.supabase!.storage.from(this.bucket).remove([key]);
      if (error && !/not found|does not exist/i.test(error.message)) throw new Error('Supabase Storage delete failed.');
      return;
    }
    await unlink(this.path(key)).catch((e: NodeJS.ErrnoException) => { if (e.code !== 'ENOENT') throw e; });
  }

  async candidates() {
    const cutoff = Date.now() - 86400000;
    if (this.provider === 'supabase') {
      const result: string[] = [];
      let offset = 0;
      const limit = 100;
      for (;;) {
        const { data, error } = await this.supabase!.storage.from(this.bucket).list('', { limit, offset, sortBy: { column: 'name', order: 'asc' } });
        if (error) throw new Error('Supabase Storage listing failed.');
        for (const item of data ?? []) {
          const key = item.name;
          const timestamp = item.created_at ?? item.updated_at;
          if (item.id && timestamp && Date.parse(timestamp) < cutoff && /^[a-f0-9-]{36}$/.test(key)) result.push(key);
        }
        if (!data || data.length < limit) break;
        offset += limit;
      }
      return result;
    }
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const keys = await readdir(this.root);
    const result: string[] = [];
    for (const key of keys) {
      if (!/^[a-f0-9-]{36}$/.test(key)) continue;
      const info = await stat(this.path(key));
      if (info.mtimeMs < cutoff) result.push(key);
    }
    return result;
  }
}
