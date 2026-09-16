import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { supabase, bucketName, storageConfig } from '../config/storage.js';

/**
 * Guarda y recupera las fotos de las actas.
 *
 * La version anterior lanzaba un error si Supabase no estaba configurado,
 * lo que dejaba a los personeros sin poder enviar el acta. Ahora el modo
 * local funciona sin ninguna configuracion previa.
 */

const asegurarCarpeta = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

/**
 * @param {Buffer} buffer contenido de la imagen
 * @param {string} mimeType image/jpeg o image/png
 * @param {string|number} mesaNumero para organizar los archivos
 * @returns {Promise<string>} ruta interna del archivo guardado
 */
export async function uploadActaImage(buffer, mimeType, mesaNumero) {
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  const nombre = `${Date.now()}-${uuidv4()}.${ext}`;
  const rutaRelativa = path.posix.join('actas', String(mesaNumero), nombre);

  if (storageConfig.driver === 'supabase' && supabase) {
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(rutaRelativa, buffer, { contentType: mimeType, upsert: false });

    if (error) throw new Error(`Error subiendo la imagen: ${error.message}`);
    return rutaRelativa;
  }

  // ── Modo local ──
  const destino = path.join(storageConfig.localPath, rutaRelativa);
  await asegurarCarpeta(path.dirname(destino));
  await fs.writeFile(destino, buffer);
  return rutaRelativa;
}

/**
 * Devuelve una URL que el navegador puede abrir.
 * En local es una ruta servida por Nginx; en Supabase, una URL firmada.
 */
export async function getActaUrl(rutaRelativa) {
  if (!rutaRelativa) return null;

  if (String(rutaRelativa).startsWith('http://') || String(rutaRelativa).startsWith('https://')) {
    return rutaRelativa;
  }

  if (storageConfig.driver === 'supabase' && supabase) {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(rutaRelativa, 3600);
    if (error) {
      console.error('Error generando URL firmada:', error.message);
      return null;
    }
    return data.signedUrl;
  }

  const cleanPath = String(rutaRelativa).replace(/^\/?actas\//, '').replace(/^\//, '');
  const baseUrl = (storageConfig.publicUrl || '/actas').replace(/\/+$/, '');
  return `${baseUrl}/${cleanPath}`;
}

export async function deleteActaImage(rutaRelativa) {
  if (!rutaRelativa) return;

  if (storageConfig.driver === 'supabase' && supabase) {
    const { error } = await supabase.storage.from(bucketName).remove([rutaRelativa]);
    if (error) console.error('Error eliminando imagen:', error.message);
    return;
  }

  try {
    await fs.unlink(path.join(storageConfig.localPath, rutaRelativa));
  } catch {
    /* si el archivo ya no existe, no es un error */
  }
}
