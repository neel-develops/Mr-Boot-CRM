import { supabase } from './supabase';

// Bucket names must match what was created in Supabase Storage
export type StorageBucket = 'before-images' | 'after-images' | 'invoices';

// OWASP A03: Strict allowlist for file uploads — only safe image types
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif'];

export async function uploadImage(file: File, bucket: StorageBucket = 'before-images'): Promise<string> {
  // Validate file extension
  const rawExt = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXTENSIONS.includes(rawExt)) {
    throw new Error(`File type ".${rawExt}" is not allowed. Only images are permitted.`);
  }

  // Validate MIME type (client-reported, but still useful as a layer)
  const mimeType = file.type.toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`File MIME type "${mimeType}" is not allowed. Only image files are permitted.`);
  }

  // Enforce a 10MB file size limit
  const MAX_SIZE_BYTES = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('File is too large. Maximum allowed size is 10MB.');
  }

  try {
    // Safe filename — no user-supplied name, timestamp + random suffix only
    const safeExt = rawExt;
    const fileName = `${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}.${safeExt}`;
    const filePath = `uploads/${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: mimeType,
      });

    if (error) {
      console.error('Supabase storage upload error:', JSON.stringify(error));
      throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (err: any) {
    console.error('Error uploading image to Supabase Storage:', err);
    throw err;
  }
}
