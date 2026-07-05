import { supabase } from './supabase';

export async function uploadImage(file: File, bucket: 'order-photos' | 'bill-images' = 'order-photos'): Promise<string> {
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
      throw error;
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
