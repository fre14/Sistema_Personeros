import React, { useState } from 'react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { 
  FileSpreadsheet, Download, Building2, Users, ClipboardList, 
  BarChart3, Archive, CheckCircle2, AlertTriangle, Sparkles, RefreshCw
} from 'lucide-react';

const ExportarDatosPage = () => {
  const [downloading, setDownloading] = useState({});
  const [tipoEleccionResultados, setTipoEleccionResultados] = useState('provincial');

  const handleDescargar = async (id, endpoint, defaultFilename, etiqueta) => {
    setDownloading(prev => ({ ...prev, [id]: true }));
    const toastId = toast.loading(`Generando archivo ${etiqueta}...`);

    try {
      const res = await api.get(endpoint, { 
        responseType: 'blob',
        timeout: 0 // Sin timeout para descargas de reportes completos
      });

      // Extraer nombre de cabecera si viene dado
      const disposition = res.headers['content-disposition'];
      let filename = defaultFilename;
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      const isZip = endpoint.includes('/provincial') || endpoint.includes('/distrital') || endpoint.includes('/completa');
      const mimeType = isZip 
        ? 'application/zip' 
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      const blob = new Blob([res.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`¡${etiqueta} descargado exitosamente!`, { id: toastId });
    } catch (error) {
      console.error('Error al descargar archivo:', error);
      toast.error(`Error al generar la descarga de ${etiqueta}`, { id: toastId });
    } finally {
      setDownloading(prev => ({ ...prev, [id]: false }));
    }
  };

  const timestamp = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet className="text-emerald-600" size={28} />
            Centro de Exportación de Datos (Excel & ZIP)
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Descarga en tiempo real los reportes analíticos de centros de votación, mesas cubiertas vs faltantes, credenciales y personeros del sistema.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg">
          <Sparkles size={16} className="text-emerald-600" />
          <span>Datos en Vivo de Base de Datos</span>
        </div>
      </div>

      {/* REPORTE PRINCIPAL DESTACADO: DISTRIBUCIÓN POR COLEGIOS */}
      <Card className="border-2 border-emerald-500 shadow-md bg-gradient-to-br from-emerald-50/40 via-white to-blue-50/30 overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-3 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white uppercase tracking-wider">
                  ★ Reporte Principal Más Solicitado
                </span>
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  93 Colegios • 1 Hoja por Colegio
                </span>
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Detecta Mesas Faltantes
                </span>
              </div>

              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="text-emerald-700" size={24} />
                Distribución por Colegio (Mesas Faltantes, Asignadas y Coordinadores)
              </h2>

              <p className="text-sm text-gray-700 leading-relaxed max-w-4xl">
                Genera un libro Excel profesional con <strong>cada local de votación en una hoja independiente</strong>.
                Identifica de inmediato qué mesas están cubiertas, <strong>qué mesas faltan por cubrir (resaltadas en rojo con estado VACANTE)</strong>, quién es su coordinador responsable con su número de celular y las contraseñas oficiales de mesa. Incluye una <strong>hoja maestra de Resumen General</strong> con hipervínculos para navegar entre colegios.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="bg-white p-2.5 rounded-lg border border-gray-200 shadow-2xs">
                  <div className="text-xs text-gray-500 font-medium">Locales / Colegios</div>
                  <div className="text-base font-bold text-gray-900">93 Locales</div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-gray-200 shadow-2xs">
                  <div className="text-xs text-gray-500 font-medium">Mesas Totales</div>
                  <div className="text-base font-bold text-gray-900">783 Mesas</div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-gray-200 shadow-2xs">
                  <div className="text-xs text-emerald-600 font-medium">Hojas por Archivo</div>
                  <div className="text-base font-bold text-emerald-700">94 Hojas</div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-gray-200 shadow-2xs">
                  <div className="text-xs text-blue-600 font-medium">Formato</div>
                  <div className="text-base font-bold text-blue-700">Excel (.xlsx)</div>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-auto flex flex-col items-center justify-center pt-2 lg:pt-0">
              <Button
                onClick={() => handleDescargar(
                  'colegios',
                  '/descargas/colegios-excel',
                  `Distribucion_Colegios_Mesas_Faltantes_${timestamp}.xlsx`,
                  'Reporte de Colegios por Hoja'
                )}
                disabled={downloading['colegios']}
                className="w-full sm:w-auto px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                {downloading['colegios'] ? (
                  <>
                    <RefreshCw className="animate-spin" size={20} />
                    <span>Generando 94 Hojas...</span>
                  </>
                ) : (
                  <>
                    <Download size={22} />
                    <span>Descargar Excel por Colegios</span>
                  </>
                )}
              </Button>
              <span className="text-xs text-gray-500 mt-2 text-center">
                Descarga directa en 1 clic
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* GRID DE REPORTES COMPLEMENTARIOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reporte 2: Asignaciones y Credenciales */}
        <Card className="hover:shadow-md transition-shadow">
          <div className="p-5 flex flex-col justify-between h-full space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="p-2 bg-blue-100 text-blue-800 rounded-lg">
                  <ClipboardList size={20} />
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                  4 Hojas
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                Relación General de Asignaciones y Credenciales
              </h3>
              <p className="text-sm text-gray-600">
                Listado consolidado en 4 hojas: Personeros de Mesa con contraseña oficial de mesa, Coordinadores de Local con contraseña de DNI, Personeros Libres (en reserva) y Resumen de Cobertura por Distrito.
              </p>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <Button
                onClick={() => handleDescargar(
                  'asignaciones',
                  '/descargas/asignaciones-excel',
                  `Relacion_General_Asignaciones_${timestamp}.xlsx`,
                  'Relación de Asignaciones'
                )}
                disabled={downloading['asignaciones']}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                {downloading['asignaciones'] ? (
                  <RefreshCw className="animate-spin" size={16} />
                ) : (
                  <Download size={16} />
                )}
                Descargar Asignaciones (Excel)
              </Button>
            </div>
          </div>
        </Card>

        {/* Reporte 3: Padrón de Usuarios */}
        <Card className="hover:shadow-md transition-shadow">
          <div className="p-5 flex flex-col justify-between h-full space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="p-2 bg-purple-100 text-purple-800 rounded-lg">
                  <Users size={20} />
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                  Todos los Usuarios
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                Padrón Completo de Usuarios del Sistema
              </h3>
              <p className="text-sm text-gray-600">
                Directorio completo de todos los usuarios registrados (personeros, coordinadores y administradores), con número de DNI, teléfono, estado activo/inactivo, mesa/local asignado y fecha de registro.
              </p>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <Button
                onClick={() => handleDescargar(
                  'usuarios',
                  '/descargas/usuarios-excel',
                  `Padron_Usuarios_Sistema_${timestamp}.xlsx`,
                  'Padrón de Usuarios'
                )}
                disabled={downloading['usuarios']}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                {downloading['usuarios'] ? (
                  <RefreshCw className="animate-spin" size={16} />
                ) : (
                  <Download size={16} />
                )}
                Descargar Padrón de Usuarios (Excel)
              </Button>
            </div>
          </div>
        </Card>

        {/* Reporte 4: Cómputo y Resultados Electorales */}
        <Card className="hover:shadow-md transition-shadow">
          <div className="p-5 flex flex-col justify-between h-full space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <BarChart3 size={20} />
                </span>
                <div className="flex items-center gap-1">
                  <select
                    value={tipoEleccionResultados}
                    onChange={(e) => setTipoEleccionResultados(e.target.value)}
                    className="text-xs font-semibold px-2 py-1 bg-white border border-gray-300 rounded shadow-2xs"
                  >
                    <option value="provincial">Provincial</option>
                    <option value="distrital">Distrital</option>
                  </select>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                Cómputo y Resultados Electorales
              </h3>
              <p className="text-sm text-gray-600">
                Resultados consolidados de votación por candidato y organización política (% válidos y % emitidos), junto con el desglose mesa por mesa incluyendo votos blancos, nulos e impugnados.
              </p>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <Button
                onClick={() => handleDescargar(
                  'resultados',
                  `/descargas/resultados-excel?tipo_eleccion=${tipoEleccionResultados}`,
                  `Resultados_Computo_${tipoEleccionResultados}_${timestamp}.xlsx`,
                  `Resultados (${tipoEleccionResultados.toUpperCase()})`
                )}
                disabled={downloading['resultados']}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                {downloading['resultados'] ? (
                  <RefreshCw className="animate-spin" size={16} />
                ) : (
                  <Download size={16} />
                )}
                Descargar Resultados {tipoEleccionResultados.toUpperCase()} (Excel)
              </Button>
            </div>
          </div>
        </Card>

        {/* Reporte 5: Actas Oficiales y Fotografías ZIP */}
        <Card className="hover:shadow-md transition-shadow">
          <div className="p-5 flex flex-col justify-between h-full space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="p-2 bg-red-100 text-red-800 rounded-lg">
                  <Archive size={20} />
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                  ZIP Comprimido
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                Paquete Completo de Actas Electorales (Fotos y Reportes)
              </h3>
              <p className="text-sm text-gray-600">
                Descarga comprimida con todas las fotografías de actas transmitidas y verificadas en el sistema, organizadas en carpetas por Distrito, Local y Mesa de Sufragio.
              </p>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <Button
                onClick={() => handleDescargar(
                  'zip',
                  '/descargas/completa',
                  `actas_electorales_completas_${timestamp}.zip`,
                  'Archivo ZIP de Actas'
                )}
                disabled={downloading['zip']}
                className="w-full bg-red-700 hover:bg-red-800 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                {downloading['zip'] ? (
                  <RefreshCw className="animate-spin" size={16} />
                ) : (
                  <Download size={16} />
                )}
                Descargar Todas las Actas (ZIP)
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Nota informativa al pie */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <CheckCircle2 size={20} className="text-blue-700 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-900">
          <p className="font-semibold">Actualización en Tiempo Real:</p>
          <p className="text-blue-800 text-xs mt-0.5">
            Cada vez que haces clic en cualquiera de estos botones, el sistema consulta directamente la base de datos de producción y genera el archivo al instante. Puedes exportar cuantas veces necesites a medida que agregues nuevos personeros o reubiques mesas.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExportarDatosPage;
