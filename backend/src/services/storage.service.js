import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import {
  supabase, bucketName, storageConfig,
  s3Client, s3Bucket, s3Region, cloudfrontDomain,
} from '../config/storage.js';

const asegurarCarpeta = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

// ── Helpers S3 (carga diferida para no romper si el SDK no esta instalado) ──
let PutObjectCommand, GetObjectCommand, DeleteObjectCommand, GetObjectCommand2;
let getSignedUrl;

const cargarS3SDK = async () => {
  if (PutObjectCommand) return;
  const s3mod = await import('@aws-sdk/client-s3');
  PutObjectCommand = s3mod.PutObjectCommand;
  GetObjectCommand = s3mod.GetObjectCommand;
  DeleteObjectCommand = s3mod.DeleteObjectCommand;
  const presigner = await import('@aws-sdk/s3-request-presigner');
  getSignedUrl = presigner.getSignedUrl;
};

// ═══════════════════════════════════════════════════════════════════════════
// uploadActaImage — sube la foto del acta al almacenamiento configurado
// ═══════════════════════════════════════════════════════════════════════════
export async function uploadActaImage(buffer, mimeType, mesaNumero) {
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  const nombre = `${Date.now()}-${uuidv4()}.${ext}`;
  const rutaRelativa = path.posix.join('actas', String(mesaNumero), nombre);

  // ── S3 ──
  if (storageConfig.driver === 's3' && s3Client) {
    await cargarS3SDK();
    const cmd = new PutObjectCommand({
      Bucket: s3Bucket,
      Key: rutaRelativa,
      Body: buffer,
      ContentType: mimeType,
    });
    await s3Client.send(cmd);
    return rutaRelativa;
  }

  // ── Supabase ──
  if (storageConfig.driver === 'supabase' && supabase) {
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(rutaRelativa, buffer, { contentType: mimeType, upsert: false });

    if (error) throw new Error(`Error subiendo la imagen: ${error.message}`);
    return rutaRelativa;
  }

  // ── Local ──
  const destino = path.join(storageConfig.localPath, rutaRelativa);
  await asegurarCarpeta(path.dirname(destino));
  await fs.writeFile(destino, buffer);
  return rutaRelativa;
}

// ═══════════════════════════════════════════════════════════════════════════
// getActaUrl — devuelve una URL publica o firmada para visualizar el acta
// ═══════════════════════════════════════════════════════════════════════════
export async function getActaUrl(rutaRelativa) {
  if (!rutaRelativa) return null;

  if (String(rutaRelativa).startsWith('http://') || String(rutaRelativa).startsWith('https://')) {
    return rutaRelativa;
  }

  // ── S3 ──
  if (storageConfig.driver === 's3' && s3Client) {
    // Si hay CloudFront, devolver URL publica directa (mas rapido)
    if (cloudfrontDomain) {
      return `https://${cloudfrontDomain}/${rutaRelativa}`;
    }
    // Sin CloudFront, generar URL pre-firmada (1 hora)
    await cargarS3SDK();
    const cmd = new GetObjectCommand({ Bucket: s3Bucket, Key: rutaRelativa });
    return await getSignedUrl(s3Client, cmd, { expiresIn: 3600 });
  }

  // ── Supabase ──
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

  // ── Local ──
  const cleanPath = String(rutaRelativa).replace(/^\/?actas\//, '').replace(/^\//, '');
  const baseUrl = (storageConfig.publicUrl || '/actas').replace(/\/+$/, '');
  return `${baseUrl}/${cleanPath}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// deleteActaImage — elimina la foto del acta
// ═══════════════════════════════════════════════════════════════════════════
export async function deleteActaImage(rutaRelativa) {
  if (!rutaRelativa) return;

  // ── S3 ──
  if (storageConfig.driver === 's3' && s3Client) {
    await cargarS3SDK();
    const cmd = new DeleteObjectCommand({ Bucket: s3Bucket, Key: rutaRelativa });
    try {
      await s3Client.send(cmd);
    } catch (err) {
      console.error('Error eliminando imagen de S3:', err.message);
    }
    return;
  }

  // ── Supabase ──
  if (storageConfig.driver === 'supabase' && supabase) {
    const { error } = await supabase.storage.from(bucketName).remove([rutaRelativa]);
    if (error) console.error('Error eliminando imagen:', error.message);
    return;
  }

  // ── Local ──
  try {
    await fs.unlink(path.join(storageConfig.localPath, rutaRelativa));
  } catch {}
}

// ═══════════════════════════════════════════════════════════════════════════
// getActaBuffer — descarga la foto como buffer (para ZIPs de exportacion)
// ═══════════════════════════════════════════════════════════════════════════
export async function getActaBuffer(rutaRelativa) {
  if (!rutaRelativa) return null;
  try {
    // ── S3 ──
    if (storageConfig.driver === 's3' && s3Client) {
      await cargarS3SDK();
      const cmd = new GetObjectCommand({ Bucket: s3Bucket, Key: rutaRelativa });
      const resp = await s3Client.send(cmd);
      const chunks = [];
      for await (const chunk of resp.Body) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    }

    // ── Supabase ──
    if (storageConfig.driver === 'supabase' && supabase) {
      const { data, error } = await supabase.storage.from(bucketName).download(rutaRelativa);
      if (error || !data) return null;
      const arrayBuffer = await data.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    // ── Local ──
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
