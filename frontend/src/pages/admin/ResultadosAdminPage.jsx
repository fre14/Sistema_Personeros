import React, { useState, useEffect } from 'react';
import { get } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import SearchInput from '../../components/ui/SearchInput';
import toast from 'react-hot-toast';
import { BarChart3, Eye, FileText, CheckCircle2, AlertTriangle, Image as ImageIcon } from 'lucide-react';

const ResultadosAdminPage = () => {
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstado, setSelectedEstado] = useState('');
  const [resumen, setResumen] = useState(null);

  // Modal Detalle
  const [selectedResultado, setSelectedResultado] = useState(null);
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  useEffect(() => {
    fetchResumen();
  }, []);

  useEffect(() => {
    fetchResultados();
  }, [searchTerm, selectedEstado]);

  const fetchResumen = async () => {
    try {
      const res = await get('/dashboard/resumen');
      setResumen(res.data?.data || res.data || null);
    } catch (error) {
      console.error('Error cargando resumen:', error);
    }
  };

  const fetchResultados = async () => {
    setLoading(true);
    try {
      let url = '/mesas?limit=100';
      if (searchTerm) url += `&q=${encodeURIComponent(searchTerm)}`;
      if (selectedEstado) url += `&estado=${selectedEstado}`;

      const res = await get(url);
      setMesas(res.data?.data || res.data || []);
    } catch (error) {
      console.error('Error cargando resultados de mesas:', error);
      toast.error('Error al cargar mesas');
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalle = async (mesa) => {
    setLoadingDetalle(true);
    setModalDetalleOpen(true);
    setSelectedResultado(null);

    try {
      // First get mesa details which includes the latest resultado
      const mesaRes = await get(`/mesas/${mesa.id}`);
      const mesaData = mesaRes.data?.data || mesaRes.data;

      if (mesaData?.resultado?.id) {
        // Fetch complete resultado detail including votes breakdown and signed photo URL
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
            Control de Resultados y Actas
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
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <SearchInput
              onSearch={setSearchTerm}
              placeholder="Buscar por número de mesa..."
            />
          </div>
          <div className="w-full sm:w-60">
            <select
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 text-sm bg-white"
            >
              {estadoOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <Table headers={['N° Mesa', 'Local de Votación', 'Distrito', 'Electores', 'Estado', 'Acta Digital', 'Acciones']}>
          {mesas.map((m) => (
            <tr key={m.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-gray-900">
                Mesa {m.numero_mesa}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                {m.local_nombre || 'Local asignado'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
