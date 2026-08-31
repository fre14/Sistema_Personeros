import { v4 as uuidv4 } from 'uuid';
import { supabase, bucketName } from '../config/storage.js';

/**
 * Upload an acta image to Supabase Storage
 * @param {Buffer} fileBuffer - The image buffer
 * @param {string} mimeType - The MIME type (image/jpeg, image/png)
 * @param {string} mesaNumero - The mesa number for organizing files
 * @returns {Promise<string>} The storage path/key
 */
export async function uploadActaImage(fileBuffer, mimeType, mesaNumero) {
  if (!supabase) {
    throw new Error('Storage service not configured. Check SUPABASE_URL and SUPABASE_SERVICE_KEY.');
  }

  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  const fileName = `${uuidv4()}.${ext}`;
  const filePath = `actas/${mesaNumero}/${fileName}`;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Error uploading image: ${error.message}`);
  }

  return filePath;
}

/**
 * Get a signed URL for an acta image
 * @param {string} filePath - The storage path
 * @returns {Promise<string>} The signed URL (valid for 1 hour)
 */
export async function getActaUrl(filePath) {
  if (!supabase || !filePath) return null;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(filePath, 3600); // 1 hour

  if (error) {
    console.error('Error getting signed URL:', error.message);
    return null;
  }

  return data.signedUrl;
}

/**
 * Delete an acta image from storage
 * @param {string} filePath - The storage path to delete
 */
export async function deleteActaImage(filePath) {
  if (!supabase || !filePath) return;

  const { error } = await supabase.storage
    .from(bucketName)
    .remove([filePath]);

  if (error) {
    console.error('Error deleting image:', error.message);
  }
}
