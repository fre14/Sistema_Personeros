import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Configuracion del almacenamiento de actas.
 *
 * driver 'local'    -> guarda en disco del servidor (volumen compartido).
 *                      No depende de servicios externos ni de internet.
 * driver 'supabase' -> guarda en Supabase Storage.
 *
 * Si se pide supabase pero faltan credenciales, se cae a 'local' en vez de
 * romper la carga de actas en plena jornada.
 */

const pedido = (process.env.STORAGE_DRIVER || 'local').toLowerCase();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'actas-electorales';

let supabase = null;
let driver = 'local';

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

export { supabase, bucketName };
