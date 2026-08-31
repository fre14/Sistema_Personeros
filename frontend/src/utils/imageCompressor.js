/**
 * Comprime una imagen automáticamente antes de subirla al servidor.
 * Reduce el tamaño a ~300KB manteniendo legibilidad del acta.
 * 
 * @param {File} file - Archivo de imagen original
 * @param {Object} options - Opciones de compresión
 * @param {number} options.maxWidth - Ancho máximo en px (default: 1920)
 * @param {number} options.maxHeight - Alto máximo en px (default: 1920)
 * @param {number} options.quality - Calidad JPEG 0-1 (default: 0.7)
 * @param {number} options.maxSizeKB - Tamaño máximo en KB (default: 400)
 * @returns {Promise<{file: File, preview: string, originalSize: number, compressedSize: number}>}
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.7,
    maxSizeKB = 400,
  } = options;

  const originalSize = file.size;

  // Si ya es menor al máximo, solo generar preview
  if (originalSize <= maxSizeKB * 1024) {
    const preview = URL.createObjectURL(file);
    return { file, preview, originalSize, compressedSize: originalSize };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;

      img.onload = () => {
        // Calcular dimensiones manteniendo proporción
        let { width, height } = img;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        // Dibujar en canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Fondo blanco (para transparencias)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Compresión progresiva: si sigue siendo grande, bajar calidad
        let currentQuality = quality;
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Error al comprimir imagen'));
                return;
              }

              // Si aún es muy grande y la calidad permite bajar más
              if (blob.size > maxSizeKB * 1024 && currentQuality > 0.3) {
                currentQuality -= 0.1;
                tryCompress();
                return;
              }

              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });

              const preview = URL.createObjectURL(compressedFile);

              resolve({
                file: compressedFile,
                preview,
                originalSize,
                compressedSize: compressedFile.size,
              });
            },
            'image/jpeg',
            currentQuality
          );
        };

        tryCompress();
      };

      img.onerror = () => reject(new Error('Error al cargar imagen'));
    };

    reader.onerror = () => reject(new Error('Error al leer archivo'));
  });
}

/**
 * Formatea bytes a texto legible
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
