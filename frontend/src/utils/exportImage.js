import { toPng } from 'html-to-image';
import toast from 'react-hot-toast';

/**
 * Exporta un elemento del DOM (gráfico individual o contenedor completo) como imagen PNG de alta resolución.
 * 
 * @param {string} elementId - ID del elemento en el DOM
 * @param {string} nombreArchivo - Nombre base para el archivo descargado
 */
export const exportarGraficoComoImagen = async (elementId, nombreArchivo = 'grafico-electoral') => {
  const elemento = document.getElementById(elementId);
  if (!elemento) {
    toast.error('No se encontró el contenedor a exportar');
    return;
  }

  const toastId = toast.loading('Generando imagen de alta resolución...');
  try {
    const dataUrl = await toPng(elemento, {
      cacheBust: true,
      quality: 0.98,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      filter: (node) => {
        if (node?.classList && node.classList.contains('no-export')) {
          return false;
        }
        return true;
      },
    });

    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.download = `${nombreArchivo}_${timestamp}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('¡Imagen descargada exitosamente!', { id: toastId });
  } catch (error) {
    console.error('Error al exportar gráfico como imagen:', error);
    toast.error('No se pudo generar la imagen. Intente nuevamente.', { id: toastId });
  }
};
