import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { supabase, bucketName, storageConfig } from '../config/storage.js';

const asegurarCarpeta = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

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

  const destino = path.join(storageConfig.localPath, rutaRelativa);
  await asegurarCarpeta(path.dirname(destino));
  await fs.writeFile(destino, buffer);
  return rutaRelativa;
}

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
  } catch {}
}

export async function getActaBuffer(rutaRelativa) {
  if (!rutaRelativa) return null;
  try {
    if (storageConfig.driver === 'supabase' && supabase) {
      const { data, error } = await supabase.storage.from(bucketName).download(rutaRelativa);
      if (error || !data) return null;
      const arrayBuffer = await data.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
    const cleanPath = String(rutaRelativa).replace(/^\/?actas\//, '').replace(/^\//, '');
    const candidatos = [
      path.join(storageConfig.localPath, rutaRelativa),
      path.join(storageConfig.localPath, cleanPath),
      path.join(storageConfig.localPath, 'actas', cleanPath),
    ];
    for (const p of candidatos) {
      try {
        const buf = await fs.readFile(p);
        if (buf) return buf;
      } catch {}
    }
    return null;
  } catch (err) {
    console.error('Error obteniendo buffer de acta:', err.message);
    return null;
  }
}
