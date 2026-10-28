import { supabase } from './supabase';

export type StorageBucket = 'candidates' | 'assets' | 'members' | 'archives';

export const STORAGE_BUCKETS: Record<string, StorageBucket> = {
  CANDIDATES: 'candidates',
  ASSETS: 'assets',
  MEMBERS: 'members',
  ARCHIVES: 'archives',
};

export interface UploadResult {
  success: boolean;
  publicUrl: string;
  path: string;
  bucket: StorageBucket;
  error?: string;
}

/**
 * SQL script for configuring all required Supabase Storage Buckets and Public RLS Policies
 */
export const STORAGE_SQL_SETUP = `
-- ==============================================================================
-- SUPABASE STORAGE BUCKETS SETUP UNTUK EOSIS SMPN 1 DAYUN
-- ==============================================================================
-- 1. Buat Bucket Storage Publik (Candidates, Assets, Members, Archives)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('candidates', 'candidates', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('assets', 'assets', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  ('members', 'members', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('archives', 'archives', true, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Kebijakan Keamanan (RLS) Supabase Storage
-- Izinkan Akses Baca Publik (Semua pengguna/pemilih dapat melihat foto & dokumen)
DROP POLICY IF EXISTS "eosis_public_read_candidates" ON storage.objects;
CREATE POLICY "eosis_public_read_candidates" ON storage.objects FOR SELECT USING (bucket_id = 'candidates');

DROP POLICY IF EXISTS "eosis_public_read_assets" ON storage.objects;
CREATE POLICY "eosis_public_read_assets" ON storage.objects FOR SELECT USING (bucket_id = 'assets');

DROP POLICY IF EXISTS "eosis_public_read_members" ON storage.objects;
CREATE POLICY "eosis_public_read_members" ON storage.objects FOR SELECT USING (bucket_id = 'members');

DROP POLICY IF EXISTS "eosis_public_read_archives" ON storage.objects;
CREATE POLICY "eosis_public_read_archives" ON storage.objects FOR SELECT USING (bucket_id = 'archives');

-- Izinkan Unggah & Kelola File Publik (Untuk Admin eOSIS)
DROP POLICY IF EXISTS "eosis_allow_insert_objects" ON storage.objects;
CREATE POLICY "eosis_allow_insert_objects" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id IN ('candidates', 'assets', 'members', 'archives')
);

DROP POLICY IF EXISTS "eosis_allow_update_objects" ON storage.objects;
CREATE POLICY "eosis_allow_update_objects" ON storage.objects FOR UPDATE USING (
  bucket_id IN ('candidates', 'assets', 'members', 'archives')
);

DROP POLICY IF EXISTS "eosis_allow_delete_objects" ON storage.objects;
CREATE POLICY "eosis_allow_delete_objects" ON storage.objects FOR DELETE USING (
  bucket_id IN ('candidates', 'assets', 'members', 'archives')
);
`;

class StorageService {
  /**
   * Sanitizes file names for safe URL and storage paths
   */
  private sanitizeFileName(originalName: string): string {
    const parts = originalName.split('.');
    const ext = parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
    const nameWithoutExt = parts.join('.');
    const cleanName = nameWithoutExt
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 50);
    const timestamp = Date.now();
    const randomHex = Math.random().toString(16).slice(2, 8);
    return ext ? `${timestamp}_${randomHex}_${cleanName}.${ext}` : `${timestamp}_${randomHex}_${cleanName}`;
  }

  /**
   * Ensure storage bucket exists and is public
   */
  async ensureBucket(bucket: StorageBucket): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage.getBucket(bucket);
      if (!error && data) return true;

      // Try creating bucket if missing
      const { error: createError } = await supabase.storage.createBucket(bucket, {
        public: true,
      });
      return !createError;
    } catch {
      return false;
    }
  }

  /**
   * Uploads a file directly to Supabase Storage
   * Returns clean public URL without saving large Base64 blobs to browser memory
   */
  async uploadFile(
    file: File,
    bucket: StorageBucket,
    subfolder?: string
  ): Promise<UploadResult> {
    const fileName = this.sanitizeFileName(file.name);
    const filePath = subfolder ? `${subfolder}/${fileName}` : fileName;

    try {
      // 1. Check & ensure bucket existence if needed
      await this.ensureBucket(bucket);

      // 2. Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || undefined,
        });

      if (error) {
        console.warn(`Supabase Storage upload error for bucket '${bucket}':`, error);

        // Check if bucket not found error
        if (
          error.message.includes('Bucket not found') ||
          error.message.includes('not found') ||
          (error as any).statusCode === 404
        ) {
          // Attempt bucket creation and retry once
          const created = await this.ensureBucket(bucket);
          if (created) {
            const retry = await supabase.storage.from(bucket).upload(filePath, file, {
              cacheControl: '3600',
              upsert: true,
              contentType: file.type || undefined,
            });
            if (!retry.error) {
              const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(filePath);
              return {
                success: true,
                publicUrl: pubData.publicUrl,
                path: filePath,
                bucket,
              };
            }
          }
        }

        throw new Error(
          `Gagal mengunggah berkas ke Supabase Storage (Bucket '${bucket}'): ${error.message}. ` +
          `Pastikan bucket '${bucket}' telah dibuat di menu Storage Supabase atau jalankan Skrip Storage di SQL Editor.`
        );
      }

      // 3. Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error('Gagal mendapatkan Public URL dari Supabase Storage.');
      }

      return {
        success: true,
        publicUrl: publicUrlData.publicUrl,
        path: filePath,
        bucket,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kesalahan unggah ke Supabase Storage';
      return {
        success: false,
        publicUrl: '',
        path: filePath,
        bucket,
        error: msg,
      };
    }
  }

  /**
   * Delete a file from Supabase Storage by public URL or relative path
   */
  async deleteFile(bucket: StorageBucket, pathOrUrl: string): Promise<boolean> {
    try {
      let path = pathOrUrl;
      if (pathOrUrl.includes(`/storage/v1/object/public/${bucket}/`)) {
        path = pathOrUrl.split(`/storage/v1/object/public/${bucket}/`)[1];
      }
      const { error } = await supabase.storage.from(bucket).remove([path]);
      return !error;
    } catch (e) {
      console.warn('Failed to delete file from Supabase Storage:', e);
      return false;
    }
  }
}

export const storageService = new StorageService();
