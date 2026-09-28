import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const pedido = (process.env.STORAGE_DRIVER || 'local').toLowerCase();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'actas-electorales';

let supabase = null;
let driver = 'local';

// ── Driver S3 (AWS) ──
let s3Client = null;
let s3Bucket = null;
let s3Region = null;
let cloudfrontDomain = null;

if (pedido === 's3') {
  s3Region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
  s3Bucket = process.env.S3_BUCKET || 'sistema-electoral-actas';
  cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN || null;

  try {
    const { S3Client } = await import('@aws-sdk/client-s3');
    s3Client = new S3Client({ region: s3Region });
    driver = 's3';
    console.log(`OK  Almacenamiento S3: bucket=${s3Bucket}, region=${s3Region}`);
  } catch (err) {
    console.error('AVISO No se pudo inicializar AWS S3:', err.message);
    console.error('      Se usara almacenamiento local en disco.');
  }
}

// ── Driver Supabase ──
if (pedido === 'supabase') {
  if (supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    driver = 'supabase';
  } else {
    console.warn('AVISO STORAGE_DRIVER=supabase pero faltan SUPABASE_URL o SUPABASE_SERVICE_KEY.');
    console.warn('      Se usara almacenamiento local en disco.');
  }
}

const defaultLocalPath = process.platform === 'win32' ? 'C:/app/uploads' : '/app/uploads';

export const storageConfig = {
  driver,
  localPath: process.env.STORAGE_LOCAL_PATH || defaultLocalPath,
  publicUrl: process.env.STORAGE_PUBLIC_URL || '/actas',
};

export { supabase, bucketName, s3Client, s3Bucket, s3Region, cloudfrontDomain };
