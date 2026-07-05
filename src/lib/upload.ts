import { supabase } from './supabase';

// Bucket names must match what was created in Supabase Storage
export type StorageBucket = 'before-images' | 'after-images' | 'invoices';

export async function uploadImage(file: File, bucket: StorageBucket = 'before-images'): Promise<string> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase storage upload error:', JSON.stringify(error));
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public url
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (err: any) {
    console.error('Error uploading image to Supabase Storage:', err);
    throw err;
  }
}

