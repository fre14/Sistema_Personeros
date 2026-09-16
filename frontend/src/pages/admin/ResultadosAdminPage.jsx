import React, { useState, useEffect, useMemo } from 'react';
import { get } from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import SearchInput from '../../components/ui/SearchInput';
import toast from 'react-hot-toast';
import { 
  BarChart3, Eye, FileText, CheckCircle2, AlertTriangle, 
  Image as ImageIcon, Filter, X, RefreshCw, PieChart as PieIcon, 
  Layers, ExternalLink, Activity
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';

const ResultadosAdminPage = () => {
  const [mesas, setMesas] = useState([]);
  const [locales, setLocales] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resumen, setResumen] = useState(null);
  const [votosCandidatos, setVotosCandidatos] = useState([]);
  const [vistaModo, setVistaModo] = useState('completo'); // 'completo' | 'graficos' | 'mesas'

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

  const { socket } = useSocket();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchResultados();
  }, [searchTerm, selectedDistrito, selectedLocal, selectedEstado, page]);

  // Real-time synchronization via Socket.IO
  useEffect(() => {
    if (socket) {
      const handleRealtimeUpdate = () => {
        fetchInitialData();
        fetchResultados();
      };

      socket.on('resultado:nuevo', handleRealtimeUpdate);
      socket.on('resultado:verificado', handleRealtimeUpdate);
      socket.on('resultado:observado', handleRealtimeUpdate);

      return () => {
        socket.off('resultado:nuevo', handleRealtimeUpdate);
        socket.off('resultado:verificado', handleRealtimeUpdate);
        socket.off('resultado:observado', handleRealtimeUpdate);
      };
    }
  }, [socket, page, searchTerm, selectedDistrito, selectedLocal, selectedEstado]);

  const fetchInitialData = async () => {
    try {
      const [resumenRes, distRes, locRes, candRes] = await Promise.all([
        get('/dashboard/resumen'),
        get('/distritos'),
        get('/locales'),
        get('/dashboard/por-candidato')
      ]);
      setResumen(resumenRes.data?.data || resumenRes.data || null);
      setDistritos(distRes.data?.data || distRes.data || []);
      setLocales(locRes.data?.data || locRes.data || []);

      const candData = candRes.data?.data || candRes.data || [];
      setVotosCandidatos(candData.map(c => ({
        candidato: c.nombre_completo || `Lista ${c.numero_lista}`,
        votos: Number(c.total_votos || 0),
        porcentaje: Number(c.porcentaje || 0),
        organizacion: c.organizacion_politica || '',
        siglas: c.siglas || '',
        numero_lista: c.numero_lista,
      })));
    } catch (error) {
      console.error('Error cargando datos estadísticos:', error);
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

  const pieData = [
    { name: 'Verificadas', value: Number(resumen?.mesas_verificadas || 0), color: '#16a34a' },
    { name: 'Reportadas', value: Number(resumen?.mesas_reportadas || 0), color: '#d97706' },
    { name: 'Observadas', value: Number(resumen?.mesas_observadas || 0), color: '#dc2626' },
    { name: 'Pendientes', value: Number(resumen?.mesas_pendientes || 0), color: '#9ca3af' },
  ];

  const avance = Number(resumen?.porcentaje_avance || 0);

  // Modal Photo URL normalizer
  const modalPhotoRaw = selectedResultado?.resultadoDetalle?.foto_acta_url_presigned || selectedResultado?.resultadoDetalle?.foto_acta_url;
  const modalPhotoUrl = modalPhotoRaw 
    ? (modalPhotoRaw.startsWith('http') || modalPhotoRaw.startsWith('/') ? modalPhotoRaw : `/${modalPhotoRaw}`)
    : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Header con indicador de tiempo real */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-gray-900 flex items-center">
              <BarChart3 className="mr-2 text-red-600" size={28} />
              Centro de Cómputo y Resultados Oficiales
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              En Vivo
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Provincia de Huamanga • Monitoreo estadístico y transmisión en tiempo real
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Selector de Vistas */}
          <div className="bg-gray-100 p-1 rounded-lg flex text-xs font-bold">
            <button
              onClick={() => setVistaModo('completo')}
              className={`px-3 py-1.5 rounded-md transition-colors ${vistaModo === 'completo' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Vista Completa
            </button>
            <button
              onClick={() => setVistaModo('graficos')}
              className={`px-3 py-1.5 rounded-md transition-colors ${vistaModo === 'graficos' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Solo Gráficos
            </button>
            <button
              onClick={() => setVistaModo('mesas')}
              className={`px-3 py-1.5 rounded-md transition-colors ${vistaModo === 'mesas' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Solo Mesas
            </button>
          </div>

          <Button 
            onClick={() => { fetchInitialData(); fetchResultados(); }} 
            isLoading={loading} 
            variant="secondary" 
            className="flex items-center"
          >
            <RefreshCw size={15} className="mr-1" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Barra de Progreso de Escrutinio Oficial */}
      {resumen && (
        <Card className="border-l-4 border-l-red-600 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div>
              <span className="text-sm font-extrabold text-gray-800">
                Avance Oficial de Cómputo Electoral
              </span>
              <span className="text-xs text-gray-500 ml-2">
                (Mesas verificadas y aprobadas por coordinadores)
              </span>
            </div>
            <span className="text-xl font-black text-red-700">{avance.toFixed(2)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3.5 overflow-hidden">
            <div 
              className="bg-red-600 h-3.5 rounded-full transition-all duration-700 ease-out shadow" 
              style={{ width: `${Math.min(100, Math.max(0, avance))}%` }}
            ></div>
          </div>
          <div className="mt-2 flex flex-wrap justify-between text-xs text-gray-600">
            <span><strong>{resumen.mesas_verificadas || 0}</strong> de <strong>{resumen.total_mesas || 0}</strong> mesas oficiales</span>
            <span>Total Votos Computados: <strong className="text-red-700 font-extrabold font-mono">{resumen.total_votos_verificados || 0}</strong> votos</span>
          </div>
        </Card>
      )}

      {/* Tarjetas de Métricas Rápidas */}
      {resumen && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white">
            <p className="text-xs font-bold text-emerald-800 uppercase flex items-center justify-between">
              Mesas Verificadas
              <CheckCircle2 size={16} className="text-emerald-600" />
            </p>
            <p className="text-3xl font-black text-emerald-700 mt-1">{resumen.mesas_verificadas || 0}</p>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Actas aprobadas y computadas</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-200 bg-gradient-to-br from-amber-50/50 to-white">
            <p className="text-xs font-bold text-amber-800 uppercase flex items-center justify-between">
              Mesas Reportadas
              <Activity size={16} className="text-amber-600" />
            </p>
            <p className="text-3xl font-black text-amber-600 mt-1">{resumen.mesas_reportadas || 0}</p>
            <p className="text-[11px] text-amber-700 font-medium mt-0.5">En revisión por coordinadores</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-red-200 bg-gradient-to-br from-red-50/50 to-white">
            <p className="text-xs font-bold text-red-800 uppercase flex items-center justify-between">
              Mesas Observadas
              <AlertTriangle size={16} className="text-red-600" />
            </p>
            <p className="text-3xl font-black text-red-600 mt-1">{resumen.mesas_observadas || 0}</p>
            <p className="text-[11px] text-red-700 font-medium mt-0.5">Declinadas en espera de corrección</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <p className="text-xs font-bold text-gray-500 uppercase flex items-center justify-between">
              Mesas Pendientes
              <span className="text-xs font-normal text-gray-400">Sin acta</span>
            </p>
            <p className="text-3xl font-black text-gray-600 mt-1">{resumen.mesas_pendientes || 0}</p>
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">Por transmitir por personeros</p>
          </div>
        </div>
      )}

      {/* SECCIÓN DE GRÁFICOS ESTADÍSTICOS EN TIEMPO REAL */}
      {(vistaModo === 'completo' || vistaModo === 'graficos') && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico de Barras: Votación por Candidato */}
            <Card className="lg:col-span-2" title="📊 Votación Consolidada por Candidato / Organización (Tiempo Real)">
              <div className="h-80">
                {votosCandidatos.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={votosCandidatos} margin={{ top: 20, right: 30, left: 10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="candidato" 
                        angle={-20} 
                        textAnchor="end" 
                        height={60} 
                        tick={{ fontSize: 11, fontWeight: 'bold' }} 
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(val, name, props) => [`${val} votos (${props.payload.porcentaje}%)`, props.payload.organizacion]} 
                      />
                      <Bar dataKey="votos" fill="#dc2626" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <BarChart3 size={40} className="mb-2 text-gray-300" />
                    <p className="text-sm font-semibold">Esperando actas verificadas para consolidar el cómputo</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Gráfico Circular: Avance y Estado de Mesas */}
            <Card title="🎯 Estado Provincial de Mesas">
              <div className="h-80 flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val, name) => [`${val} mesas`, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-center text-xs text-gray-500 font-semibold">
                  Total: {resumen?.total_mesas || 0} mesas en padrón
                </div>
              </div>
            </Card>
          </div>

          {/* Tabla de Resumen de Candidatos */}
          {votosCandidatos.length > 0 && (
            <Card title="📋 Tabla de Resultados Consolidados Oficiales">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-xs font-bold text-gray-600 uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Lista</th>
                      <th className="px-4 py-3 text-left">Candidato Oficial</th>
                      <th className="px-4 py-3 text-left">Organización Política</th>
                      <th className="px-4 py-3 text-center">Siglas</th>
                      <th className="px-4 py-3 text-right">Votos Verificados</th>
                      <th className="px-4 py-3 text-right">Porcentaje</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {votosCandidatos.map((c, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-extrabold text-red-700">
                          <span className="w-6 h-6 rounded-full bg-red-100 text-red-800 inline-flex items-center justify-center text-xs">
                            {c.numero_lista || idx + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900">{c.candidato}</td>
                        <td className="px-4 py-3 text-gray-700">{c.organizacion}</td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-gray-600">{c.siglas}</td>
                        <td className="px-4 py-3 text-right font-black text-gray-900 text-base">{c.votos.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-extrabold text-red-600">
                          {c.porcentaje.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* SECCIÓN DE BÚSQUEDA AVANZADA Y TABLA DE MESAS */}
      {(vistaModo === 'completo' || vistaModo === 'mesas') && (
        <Card title="🔍 Auditoría y Búsqueda Avanzada de Mesas Electorales">
          {/* Panel de Búsqueda Avanzada */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center">
                <Filter size={14} className="mr-1.5 text-red-600" />
                Filtrar Mesas por Distrito, Local y Estado
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
                <label className="block text-xs font-medium text-gray-600 mb-1">Buscar por N° de Mesa</label>
                <SearchInput
                  onSearch={(val) => { setSearchTerm(val); setPage(1); }}
                  placeholder="Ej: 009434..."
                />
              </div>

              {/* Filtro Distrito */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Distrito ({distritos.length})</label>
                <select
                  value={selectedDistrito}
                  onChange={handleDistritoChange}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 text-sm bg-white"
                >
                  <option value="">Todos los distritos</option>
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
                <label className="block text-xs font-medium text-gray-600 mb-1">Estado de Mesa</label>
                <select
                  value={selectedEstado}
                  onChange={(e) => { setSelectedEstado(e.target.value); setPage(1); }}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 text-sm bg-white"
                >
                  <option value="">Todos los estados</option>
                  <option value="verificada">Verificada</option>
                  <option value="reportada">Reportada</option>
                  <option value="observada">Observada</option>
                  <option value="pendiente">Pendiente</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabla de Mesas */}
          <div className="overflow-x-auto">
            <Table headers={['N° Mesa', 'Distrito', 'Local de Votación', 'Electores', 'Estado', 'Acciones']}>
              {mesas.map((mesa) => (
                <tr key={mesa.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap font-black text-gray-900 text-sm">
                    Mesa {mesa.numero_mesa}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {mesa.distrito_nombre || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 font-medium">
                    {mesa.local_nombre || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-700">
                    {mesa.total_electores_habiles || 300}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge variant={mesa.estado}>{mesa.estado}</Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleVerDetalle(mesa)}
                      className="flex items-center text-xs font-bold"
                    >
                      <Eye size={14} className="mr-1 text-red-600" />
                      Ver Acta
                    </Button>
                  </td>
                </tr>
              ))}
              {mesas.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 text-sm">
                    No se encontraron mesas con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </Table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-xs text-gray-600">
              <span>Página {page} de {totalPages} ({totalMesas} mesas registradas)</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* MODAL DE DETALLE Y AUDITORÍA DE ACTA */}
      <Modal isOpen={modalDetalleOpen} onClose={() => setModalDetalleOpen(false)} title={`Auditoría de Acta • Mesa ${selectedResultado?.numero_mesa || ''}`} size="lg">
        {loadingDetalle ? (
          <div className="py-12 flex justify-center">
            <RefreshCw className="animate-spin text-red-600" size={32} />
          </div>
        ) : selectedResultado?.resultadoDetalle ? (
          <div className="space-y-6">
            {/* Cabecera del Acta */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs">
              <div>
                <span className="text-gray-500 block">Mesa / Local:</span>
                <span className="font-extrabold text-gray-900">Mesa {selectedResultado.numero_mesa}</span>
                <span className="text-[11px] text-gray-500 block truncate">{selectedResultado.local_nombre}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Estado Actual:</span>
                <Badge variant={selectedResultado.resultadoDetalle.estado}>
                  {selectedResultado.resultadoDetalle.estado}
                </Badge>
              </div>
              <div>
                <span className="text-gray-500 block">Total Votos Emitidos:</span>
                <span className="font-black text-red-700 text-sm">{selectedResultado.resultadoDetalle.total_votos_emitidos}</span>
                <span className="text-[11px] text-gray-400 block">Máx. 300 votos</span>
              </div>
              <div>
                <span className="text-gray-500 block">Personero / Responsable:</span>
                <span className="font-semibold text-gray-800 block truncate">{selectedResultado.resultadoDetalle.personero_nombre || 'No registrado'}</span>
                <span className="text-[11px] text-gray-400 font-mono">DNI: {selectedResultado.resultadoDetalle.personero_dni || '-'}</span>
              </div>
            </div>

            {/* Votos por Candidato */}
            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center">
                <FileText size={16} className="mr-1.5 text-red-600" />
                Votación por Organización Política y Candidato
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
                        <td className="px-4 py-2 font-medium text-gray-900">{det.nombre_completo}</td>
                        <td className="px-4 py-2 text-gray-600 text-xs">{det.organizacion_politica}</td>
                        <td className="px-4 py-2 text-right font-black text-red-700">{det.votos}</td>
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
            {modalPhotoUrl ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-gray-900 flex items-center">
                    <ImageIcon size={16} className="mr-1.5 text-red-600" />
                    Fotografía Original del Acta de Escrutinio
                  </h4>
                  <a
                    href={modalPhotoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-red-600 hover:text-red-800 font-bold flex items-center gap-1"
                  >
                    <ExternalLink size={13} />
                    Ver Imagen Completa ↗
                  </a>
                </div>
                <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-900 p-2 flex justify-center">
                  <img
                    src={modalPhotoUrl}
                    alt="Foto del Acta Oficial"
                    className="max-h-96 object-contain rounded shadow"
                  />
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center">
                <AlertTriangle size={16} className="mr-2 flex-shrink-0" />
                Esta mesa registró sus votos sin adjuntar fotografía del acta física.
              </div>
            )}

            {/* Observaciones */}
            {selectedResultado.resultadoDetalle.observaciones_personero && (
              <div className="bg-gray-50 p-3 rounded text-xs border border-gray-200">
                <span className="font-semibold text-gray-700 block">Observaciones del Personero:</span>
                <p className="text-gray-600 mt-1">{selectedResultado.resultadoDetalle.observaciones_personero}</p>
              </div>
            )}
            {selectedResultado.resultadoDetalle.observaciones_coordinador && (
              <div className="bg-red-50 p-3 rounded text-xs border border-red-200">
                <span className="font-bold text-red-800 block">Observaciones del Coordinador:</span>
                <p className="text-red-700 mt-1">{selectedResultado.resultadoDetalle.observaciones_coordinador}</p>
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
