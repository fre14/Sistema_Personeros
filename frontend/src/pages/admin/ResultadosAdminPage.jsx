import React, { useState, useEffect, useMemo } from 'react';
import { get } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import SearchInput from '../../components/ui/SearchInput';
import toast from 'react-hot-toast';
import { BarChart3, Eye, FileText, CheckCircle2, AlertTriangle, Image as ImageIcon, Filter, X } from 'lucide-react';

const ResultadosAdminPage = () => {
  const [mesas, setMesas] = useState([]);
  const [locales, setLocales] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resumen, setResumen] = useState(null);

  // Advanced Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrito, setSelectedDistrito] = useState('');
  const [selectedLocal, setSelectedLocal] = useState('');
  const [selectedEstado, setSelectedEstado] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMesas, setTotalMesas] = useState(0);

  // Modal Detalle
  const [selectedResultado, setSelectedResultado] = useState(null);
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchResultados();
  }, [searchTerm, selectedDistrito, selectedLocal, selectedEstado, page]);

  const fetchInitialData = async () => {
    try {
      const [resumenRes, distRes, locRes] = await Promise.all([
        get('/dashboard/resumen'),
        get('/distritos'),
        get('/locales')
      ]);
      setResumen(resumenRes.data?.data || resumenRes.data || null);
      setDistritos(distRes.data?.data || distRes.data || []);
      setLocales(locRes.data?.data || locRes.data || []);
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
    }
  };

  const fetchResultados = async () => {
    setLoading(true);
    try {
      let url = `/mesas?page=${page}&limit=25`;
      if (searchTerm) url += `&q=${encodeURIComponent(searchTerm)}`;
      if (selectedDistrito) url += `&distrito_id=${selectedDistrito}`;
      if (selectedLocal) url += `&local_id=${selectedLocal}`;
      if (selectedEstado) url += `&estado=${selectedEstado}`;

      const res = await get(url);
      const data = res.data?.data || res.data || [];
      const meta = res.data?.meta || {};
      
      setMesas(data);
      if (meta.total !== undefined) {
        setTotalMesas(meta.total);
        setTotalPages(Math.ceil(meta.total / 25));
      }
    } catch (error) {
      console.error('Error cargando resultados de mesas:', error);
      toast.error('Error al cargar mesas');
    } finally {
      setLoading(false);
    }
  };

  // Filter locales by selected district in the filter bar
  const filteredLocalesForFilter = useMemo(() => {
    if (!selectedDistrito) return locales;
    return locales.filter(l => String(l.distrito_id) === String(selectedDistrito));
  }, [locales, selectedDistrito]);

  const handleDistritoChange = (e) => {
    setSelectedDistrito(e.target.value);
    setSelectedLocal('');
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedDistrito('');
    setSelectedLocal('');
    setSelectedEstado('');
    setPage(1);
  };

  const handleVerDetalle = async (mesa) => {
    setLoadingDetalle(true);
    setModalDetalleOpen(true);
    setSelectedResultado(null);

    try {
      const mesaRes = await get(`/mesas/${mesa.id}`);
      const mesaData = mesaRes.data?.data || mesaRes.data;

      if (mesaData?.resultado?.id) {
        const detalleRes = await get(`/resultados/${mesaData.resultado.id}`);
        setSelectedResultado({
          ...mesaData,
          resultadoDetalle: detalleRes.data?.data || detalleRes.data
        });
      } else {
        setSelectedResultado({
          ...mesaData,
          resultadoDetalle: null
        });
      }
    } catch (error) {
      console.error('Error cargando detalle:', error);
      toast.error('No se pudo cargar el detalle del acta');
    } finally {
      setLoadingDetalle(false);
    }
  };

  const hasActiveFilters = searchTerm || selectedDistrito || selectedLocal || selectedEstado;

  const estadoOptions = [
    { label: 'Todos los estados', value: '' },
    { label: 'Verificada', value: 'verificada' },
    { label: 'Reportada', value: 'reportada' },
    { label: 'Observada', value: 'observada' },
    { label: 'Pendiente', value: 'pendiente' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="mr-2 text-red-600" size={28} />
            Control de Resultados y Actas Electorales
          </h1>
          <p className="text-sm text-gray-500">Auditoría, visualización de actas físicas y escrutinio por mesa</p>
        </div>
      </div>

      {/* Resumen Rápido */}
      {resumen && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase">Mesas Verificadas</p>
            <p className="text-2xl font-bold text-green-600">{resumen.mesas_verificadas || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase">Mesas Reportadas</p>
            <p className="text-2xl font-bold text-amber-600">{resumen.mesas_reportadas || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase">Mesas Observadas</p>
            <p className="text-2xl font-bold text-red-600">{resumen.mesas_observadas || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase">Mesas Pendientes</p>
            <p className="text-2xl font-bold text-gray-500">{resumen.mesas_pendientes || 0}</p>
          </div>
        </div>
      )}

      <Card>
        {/* Panel de Búsqueda Avanzada */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center">
              <Filter size={14} className="mr-1.5 text-red-600" />
              Búsqueda Avanzada por Distrito, Local y Mesa
            </span>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center transition-colors"
              >
                <X size={13} className="mr-1" />
                Limpiar Filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Buscador de texto */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Buscar por N° o Local</label>
              <SearchInput
                onSearch={(val) => { setSearchTerm(val); setPage(1); }}
                placeholder="Ej: 009434 o Mariscal..."
              />
            </div>

            {/* Filtro Distrito */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Filtrar por Distrito</label>
              <select
                value={selectedDistrito}
                onChange={handleDistritoChange}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 text-sm bg-white"
              >
                <option value="">Todos los distritos (16)</option>
                {distritos.map(d => (
                  <option key={d.id} value={String(d.id)}>{d.nombre}</option>
                ))}
              </select>
            </div>

            {/* Filtro Local */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Local de Votación {selectedDistrito && `(${filteredLocalesForFilter.length})`}
              </label>
              <select
                value={selectedLocal}
                onChange={(e) => { setSelectedLocal(e.target.value); setPage(1); }}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 text-sm bg-white"
              >
                <option value="">Todos los locales</option>
                {filteredLocalesForFilter.map(l => (
                  <option key={l.id} value={String(l.id)}>{l.nombre}</option>
                ))}
              </select>
            </div>

            {/* Filtro Estado */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Estado de Transmisión</label>
              <select
                value={selectedEstado}
                onChange={(e) => { setSelectedEstado(e.target.value); setPage(1); }}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 text-sm bg-white"
              >
                {estadoOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tabla de Mesas y Resultados */}
        <Table headers={['N° Mesa', 'Local de Votación', 'Distrito', 'Electores', 'Estado', 'Acta Digital', 'Acciones']}>
          {mesas.map((m) => (
            <tr key={m.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-gray-900">
                Mesa {m.numero_mesa}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                {m.local_nombre || 'Local asignado'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                {m.distrito_nombre || 'Ayacucho'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {m.total_electores_habiles} electores
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge variant={m.estado}>{m.estado}</Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {m.estado !== 'pendiente' ? (
                  <span className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                    <CheckCircle2 size={13} className="mr-1" />
                    Transmitida
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">Sin acta</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  onClick={() => handleVerDetalle(m)}
                  className="text-red-600 hover:text-red-900 inline-flex items-center transition-colors font-semibold"
                >
                  <Eye size={16} className="mr-1" />
                  Ver Detalle
                </button>
              </td>
            </tr>
          ))}
          {mesas.length === 0 && !loading && (
            <tr>
              <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">
                No se encontraron mesas con los criterios de búsqueda.
              </td>
            </tr>
          )}
        </Table>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 pt-4 gap-3">
            <span className="text-sm text-gray-600">
              Mostrando página <span className="font-bold text-gray-900">{page}</span> de <span className="font-bold text-gray-900">{totalPages}</span> ({totalMesas} mesas totales)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-40 hover:bg-gray-50 font-medium transition-colors"
              >
                Anterior
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-40 hover:bg-gray-50 font-medium transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal Detalle de Acta y Votos */}
      <Modal
        isOpen={modalDetalleOpen}
        onClose={() => setModalDetalleOpen(false)}
        title={`Detalle de Escrutinio — Mesa ${selectedResultado?.numero_mesa || ''}`}
        maxWidth="max-w-3xl"
      >
        {loadingDetalle ? (
          <div className="py-12 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-3"></div>
            Cargando acta y votos registrados...
          </div>
        ) : selectedResultado?.resultadoDetalle ? (
          <div className="space-y-6">
            {/* Info de la mesa */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-lg text-xs">
              <div>
                <span className="text-gray-500 block">Local:</span>
                <span className="font-semibold text-gray-800">{selectedResultado.local_nombre}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Estado:</span>
                <Badge variant={selectedResultado.resultadoDetalle.estado}>
                  {selectedResultado.resultadoDetalle.estado}
                </Badge>
              </div>
              <div>
                <span className="text-gray-500 block">Total Emitidos:</span>
                <span className="font-bold text-red-700 text-sm">{selectedResultado.resultadoDetalle.total_votos_emitidos}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Cédulas Totales:</span>
                <span className="font-semibold text-gray-800">{selectedResultado.resultadoDetalle.total_cedulas_votacion}</span>
              </div>
            </div>

            {/* Votos por Candidato */}
            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center">
                <FileText size={16} className="mr-1.5 text-red-600" />
                Votación por Organización Política
              </h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-100 text-gray-700 text-xs font-semibold">
                    <tr>
                      <th className="px-4 py-2 text-left">Candidato / Lista</th>
                      <th className="px-4 py-2 text-left">Organización</th>
                      <th className="px-4 py-2 text-right">Votos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {selectedResultado.resultadoDetalle.detalles?.map((det) => (
                      <tr key={det.id}>
                        <td className="px-4 py-2.5 font-medium text-gray-900">{det.nombre_completo}</td>
                        <td className="px-4 py-2.5 text-gray-600 text-xs">{det.organizacion_politica}</td>
                        <td className="px-4 py-2.5 text-right font-extrabold text-red-700">{det.votos}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold text-gray-700">
                      <td colSpan={2} className="px-4 py-2 text-left">Votos en Blanco</td>
                      <td className="px-4 py-2 text-right">{selectedResultado.resultadoDetalle.votos_blanco || 0}</td>
                    </tr>
                    <tr className="bg-gray-50 font-semibold text-gray-700">
                      <td colSpan={2} className="px-4 py-2 text-left">Votos Nulos</td>
                      <td className="px-4 py-2 text-right">{selectedResultado.resultadoDetalle.votos_nulo || 0}</td>
                    </tr>
                    <tr className="bg-gray-50 font-semibold text-gray-700">
                      <td colSpan={2} className="px-4 py-2 text-left">Votos Impugnados</td>
                      <td className="px-4 py-2 text-right">{selectedResultado.resultadoDetalle.votos_impugnados || 0}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Foto del Acta Física */}
            {selectedResultado.resultadoDetalle.foto_acta_url_presigned || selectedResultado.resultadoDetalle.foto_acta_url ? (
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center">
                  <ImageIcon size={16} className="mr-1.5 text-red-600" />
                  Foto Original del Acta Electoral
                </h4>
                <div className="border border-gray-300 rounded-lg overflow-hidden bg-black/5 p-2 flex justify-center">
                  <img
                    src={selectedResultado.resultadoDetalle.foto_acta_url_presigned || selectedResultado.resultadoDetalle.foto_acta_url}
                    alt="Foto del Acta Oficial"
                    className="max-h-96 object-contain rounded shadow"
                  />
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center">
                <AlertTriangle size={16} className="mr-2 flex-shrink-0" />
                Esta mesa registró sus votos manualmente sin adjuntar fotografía del acta física.
              </div>
            )}

            {/* Observaciones */}
            {selectedResultado.resultadoDetalle.observaciones_personero && (
              <div className="bg-gray-50 p-3 rounded text-xs">
                <span className="font-semibold text-gray-700 block">Observaciones del Personero:</span>
                <p className="text-gray-600 mt-1">{selectedResultado.resultadoDetalle.observaciones_personero}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-10 text-center text-gray-500 text-sm">
            Esta mesa aún se encuentra en estado <span className="font-semibold text-amber-600">Pendiente</span>. El personero asignado todavía no ha transmitido los resultados de la mesa.
          </div>
        )}

        <div className="mt-6 flex justify-end pt-2 border-t border-gray-200">
          <Button variant="secondary" onClick={() => setModalDetalleOpen(false)}>
            Cerrar
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default ResultadosAdminPage;
