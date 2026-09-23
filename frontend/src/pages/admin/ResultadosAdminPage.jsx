import React, { useState, useEffect, useMemo, useRef } from 'react';
import api, { get } from '../../services/api';
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
  Layers, ExternalLink, Activity, Download, MapPin, Building2,
  ChevronRight, TrendingUp, Vote, Award, ShieldCheck, Check, ArrowLeft
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { exportarGraficoComoImagen } from '../../utils/exportImage';

const COLORES_PALETA = [
  '#dc2626', // Rojo
  '#2563eb', // Azul
  '#16a34a', // Verde
  '#d97706', // Ámbar
  '#7c3aed', // Púrpura
  '#0891b2', // Cyan
  '#ea580c', // Naranja
  '#e11d48', // Rosa
  '#0d9488', // Teal
  '#4f46e5', // Índigo
  '#64748b', // Pizarra
];

const COLORES_COMPOSICION = {
  validos: '#16a34a',
  blanco: '#d97706',
  nulo: '#dc2626',
  impugnados: '#8b5cf6',
};

const ResultadosAdminPage = () => {
  // Datos maestros
  const [distritos, setDistritos] = useState([]);
  const [locales, setLocales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vistaModo, setVistaModo] = useState('completo'); // 'completo' | 'graficos' | 'mesas'
  const [tipoEleccion, setTipoEleccion] = useState('provincial'); // 'provincial' | 'distrital'
  const [descargando, setDescargando] = useState(false);

  // Filtros territoriales exclusivos para las gráficas (Desglose por Distrito y Local)
  const [filtroDistrito, setFiltroDistrito] = useState('');
  const [filtroLocal, setFiltroLocal] = useState('');

  // Datos de estadísticas y gráficos
  const [resumen, setResumen] = useState(null);
  const [votosCandidatos, setVotosCandidatos] = useState([]);
  const [composicionVotos, setComposicionVotos] = useState(null);
  const [distritosStats, setDistritosStats] = useState([]);
  const [localesStats, setLocalesStats] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);

  // Filtros de la tabla de mesas
  const [mesas, setMesas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrito, setSelectedDistrito] = useState('');
  const [selectedLocal, setSelectedLocal] = useState('');
  const [selectedEstado, setSelectedEstado] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMesas, setTotalMesas] = useState(0);

  // Modal Detalle de Mesa y Acta
  const [selectedResultado, setSelectedResultado] = useState(null);
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [zoomFoto, setZoomFoto] = useState(false);

  const { socket } = useSocket();

  // Carga inicial de distritos y locales
  useEffect(() => {
    fetchCatalogos();
  }, []);

  // Carga de estadísticas y gráficos al cambiar filtros territoriales o tipo de elección
  useEffect(() => {
    fetchEstadisticas();
  }, [tipoEleccion, filtroDistrito, filtroLocal]);

  // Carga de la tabla de mesas
  useEffect(() => {
    fetchMesas();
  }, [tipoEleccion, searchTerm, selectedDistrito, selectedLocal, selectedEstado, page]);

  // Sincronización en tiempo real vía Socket.io
  useEffect(() => {
    if (socket) {
      const handleRealtimeUpdate = () => {
        fetchEstadisticas();
        fetchMesas();
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
  }, [socket, tipoEleccion, filtroDistrito, filtroLocal, page, searchTerm, selectedDistrito, selectedLocal, selectedEstado]);

  const fetchCatalogos = async () => {
    try {
      const [distRes, locRes] = await Promise.all([
        get('/distritos'),
        get('/locales')
      ]);
      setDistritos(distRes.data?.data || distRes.data || []);
      setLocales(locRes.data?.data || locRes.data || []);
    } catch (error) {
      console.error('Error cargando catálogos:', error);
    }
  };

  const fetchEstadisticas = async () => {
    setLoadingStats(true);
    try {
      let queryParams = `?tipo_eleccion=${tipoEleccion}`;
      if (filtroDistrito) queryParams += `&distrito_id=${filtroDistrito}`;
      if (filtroLocal) queryParams += `&local_id=${filtroLocal}`;

      const [resumenRes, candRes, compRes, distRes, locRes] = await Promise.all([
        get(`/dashboard/resumen${queryParams}`),
        get(`/dashboard/por-candidato${queryParams}`),
        get(`/dashboard/composicion-voto${queryParams}`),
        get(`/dashboard/por-distrito?tipo_eleccion=${tipoEleccion}`),
        get(`/dashboard/por-local?tipo_eleccion=${tipoEleccion}${filtroDistrito ? `&distrito_id=${filtroDistrito}` : ''}`)
      ]);

      setResumen(resumenRes.data?.data || resumenRes.data || null);

      const candData = candRes.data?.data || candRes.data || [];
      const listaCandidatos = Array.isArray(candData) ? candData : (candData.candidatos || []);
      setVotosCandidatos(listaCandidatos.map((c, idx) => ({
        id: c.id,
        candidato: c.nombre_completo || `Lista ${c.numero_lista}`,
        votos: Number(c.total_votos || 0),
        porcentaje: Number(c.porcentaje || 0),
        organizacion: c.organizacion_politica || '',
        siglas: c.siglas || '',
        numero_lista: c.numero_lista,
        color: COLORES_PALETA[idx % COLORES_PALETA.length],
      })));

      setComposicionVotos(compRes.data?.data || compRes.data || null);
      setDistritosStats(distRes.data?.data || distRes.data || []);
      setLocalesStats(locRes.data?.data || locRes.data || []);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      toast.error('Error al actualizar estadísticas');
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchMesas = async () => {
    setLoading(true);
    try {
      let url = `/mesas?page=${page}&limit=25&tipo_eleccion=${tipoEleccion}`;
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
      console.error('Error cargando mesas:', error);
      toast.error('Error al cargar mesas');
    } finally {
      setLoading(false);
    }
  };

  const distritosDisponibles = useMemo(() => {
    if (tipoEleccion === 'distrital') {
      return distritos.filter(d => d.tiene_eleccion_distrital);
    }
    return distritos;
  }, [distritos, tipoEleccion]);

  const activeDistritoId = filtroDistrito || (vistaModo === 'mesas' ? selectedDistrito : '');
  const activeDistritoObj = useMemo(() => {
    if (!activeDistritoId) return null;
    return distritos.find(d => String(d.id) === String(activeDistritoId)) || null;
  }, [activeDistritoId, distritos]);
  const activeDistritoNombre = activeDistritoObj ? activeDistritoObj.nombre : '';

  const descargarZip = async (tipo, customDistritoId = null, customDistritoNombre = null) => {
    setDescargando(true);
    let etiqueta = tipo === 'provincial' ? 'Provinciales' : tipo === 'distrital' ? 'Distritales' : 'Completas';
    let urlEndpoint = `/descargas/${tipo}`;
    const timestamp = new Date().toISOString().slice(0, 10);
    let filename = `actas_${tipo}_${timestamp}.zip`;

    const targetDistritoId = customDistritoId || activeDistritoId;
    if (tipo === 'distrital' && targetDistritoId) {
      const dist = distritos.find(d => String(d.id) === String(targetDistritoId));
      const distNom = customDistritoNombre || (dist ? dist.nombre : `distrito_${targetDistritoId}`);
      const slug = distNom.toLowerCase().replace(/[^a-z0-9]/g, '_');
      urlEndpoint += `?distrito_id=${targetDistritoId}`;
      etiqueta = `Distritales (${distNom})`;
      filename = `actas_distritales_${slug}_${timestamp}.zip`;
    }

    const toastId = toast.loading(`Generando archivo ZIP de actas ${etiqueta}...`);
    try {
      const res = await api.get(urlEndpoint, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Actas ${etiqueta} descargadas con éxito`, { id: toastId });
    } catch (error) {
      console.error('Error al descargar ZIP:', error);
      toast.error('Error al generar la descarga del archivo ZIP', { id: toastId });
    } finally {
      setDescargando(false);
    }
  };

  // Locales disponibles para el selector de filtro de gráficas
  const localesParaFiltroGrafico = useMemo(() => {
    if (!filtroDistrito) return locales;
    return locales.filter(l => String(l.distrito_id) === String(filtroDistrito));
  }, [locales, filtroDistrito]);

  // Locales para el filtro de la tabla
  const localesParaFiltroTabla = useMemo(() => {
    if (!selectedDistrito) return locales;
    return locales.filter(l => String(l.distrito_id) === String(selectedDistrito));
  }, [locales, selectedDistrito]);

  // Nombre del ámbito actual seleccionado para los reportes
  const nombreAmbitoActual = useMemo(() => {
    if (filtroLocal) {
      const loc = locales.find(l => String(l.id) === String(filtroLocal));
      return `Local: ${loc ? loc.nombre : filtroLocal}`;
    }
    if (filtroDistrito) {
      const dist = distritos.find(d => String(d.id) === String(filtroDistrito));
      return `Distrito: ${dist ? dist.nombre : filtroDistrito}`;
    }
    return tipoEleccion === 'distrital' ? 'Ámbito Distrital (Distritos con Candidatura)' : 'Total Provincial (Huamanga)';
  }, [tipoEleccion, filtroDistrito, filtroLocal, distritos, locales]);

  const nombreDistritoActual = useMemo(() => {
    if (!filtroDistrito) return '';
    const d = distritos.find(dist => String(dist.id) === String(filtroDistrito));
    return d ? d.nombre : `Distrito #${filtroDistrito}`;
  }, [filtroDistrito, distritos]);

  const nombreLocalActual = useMemo(() => {
    if (!filtroLocal) return '';
    const l = locales.find(loc => String(loc.id) === String(filtroLocal));
    return l ? l.nombre : `Local #${filtroLocal}`;
  }, [filtroLocal, locales]);

  const handleCambioDistritoGrafico = (e) => {
    setFiltroDistrito(e.target.value);
    setFiltroLocal('');
  };

  const handleResetFiltroGraficos = () => {
    setFiltroDistrito('');
    setFiltroLocal('');
  };

  const handleSincronizarFiltrosATabla = () => {
    setSelectedDistrito(filtroDistrito);
    setSelectedLocal(filtroLocal);
    setPage(1);
    toast.success('Filtros sincronizados con la tabla de mesas');
  };

  const handleVerDetalle = async (mesa) => {
    setLoadingDetalle(true);
    setModalDetalleOpen(true);
    setSelectedResultado(null);
    setZoomFoto(false);

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

  // Datos para el gráfico de torta de estado de mesas
  const pieDataMesas = useMemo(() => [
    { name: 'Verificadas', value: Number(resumen?.mesas_verificadas || 0), color: '#16a34a' },
    { name: 'Reportadas', value: Number(resumen?.mesas_reportadas || 0), color: '#d97706' },
    { name: 'Observadas', value: Number(resumen?.mesas_observadas || 0), color: '#dc2626' },
    { name: 'Pendientes', value: Number(resumen?.mesas_pendientes || 0), color: '#9ca3af' },
  ], [resumen]);

  // Datos para el gráfico de composición de votos (válidos, blancos, nulos, impugnados)
  const pieDataComposicion = useMemo(() => {
    if (!composicionVotos) return [];
    return [
      { name: 'Votos Válidos', value: Number(composicionVotos.votos_validos || 0), color: COLORES_COMPOSICION.validos },
      { name: 'Votos en Blanco', value: Number(composicionVotos.votos_blanco || 0), color: COLORES_COMPOSICION.blanco },
      { name: 'Votos Nulos', value: Number(composicionVotos.votos_nulo || 0), color: COLORES_COMPOSICION.nulo },
      { name: 'Votos Impugnados', value: Number(composicionVotos.votos_impugnados || 0), color: COLORES_COMPOSICION.impugnados },
    ].filter(item => item.value > 0);
  }, [composicionVotos]);

  // Datos para el gráfico de desglose territorial:
  // Si no hay distrito seleccionado: Desglose por Distrito
  // Si hay distrito seleccionado: Desglose por Locales de ese distrito
  const datosDesgloseTerritorial = useMemo(() => {
    if (filtroDistrito) {
      const lista = Array.isArray(localesStats) ? localesStats : [];
      return lista.map(l => {
        const nom = String(l?.nombre || 'Local');
        return {
          id: l?.id,
          nombre: nom.length > 22 ? `${nom.slice(0, 20)}...` : nom,
          nombreCompleto: nom,
          votos: Number(l?.votos_contados || 0),
          totalMesas: Number(l?.total_mesas || 0),
          mesasVerificadas: Number(l?.mesas_verificadas || 0),
          avance: Number(l?.porcentaje_avance || 0),
        };
      }).sort((a, b) => b.votos - a.votos);
    } else {
      const lista = Array.isArray(distritosStats) ? distritosStats : [];
      return lista.map(d => {
        const nom = String(d?.nombre || 'Distrito');
        return {
          id: d?.id,
          nombre: nom,
          nombreCompleto: nom,
          votos: Number(d?.votos_contados || 0),
          totalMesas: Number(d?.total_mesas || 0),
          mesasVerificadas: Number(d?.mesas_verificadas || 0),
          avance: Number(d?.porcentaje_avance || 0),
        };
      }).sort((a, b) => b.votos - a.votos);
    }
  }, [filtroDistrito, distritosStats, localesStats]);

  const avance = Number(resumen?.porcentaje_avance || 0);

  // Normalización de foto para el modal
  const modalPhotoRaw = selectedResultado?.resultadoDetalle?.foto_acta_url_presigned || selectedResultado?.resultadoDetalle?.foto_acta_url;
  const modalPhotoUrl = modalPhotoRaw 
    ? (modalPhotoRaw.startsWith('http') || modalPhotoRaw.startsWith('/') ? modalPhotoRaw : `/${modalPhotoRaw}`)
    : null;

  return (
    <div className="space-y-6 pb-12">
      {/* ========================================================= */}
      {/* 1. ENCABEZADO OFICIAL CON CONTROLES Y EN VIVO             */}
      {/* ========================================================= */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-gray-900 flex items-center">
              <BarChart3 className="mr-2.5 text-red-600" size={30} />
              Centro de Cómputo y Resultados Oficiales
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 animate-pulse border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              En Vivo
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
            <MapPin size={14} className="text-red-500" />
            Provincia de Huamanga • Monitoreo estadístico y transmisión en tiempo real
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Tabs Provincial / Distrital */}
          <div className="bg-gray-100 p-1 rounded-xl flex text-xs font-bold border border-gray-200">
            <button
              onClick={() => {
                setTipoEleccion('provincial');
                setFiltroDistrito('');
                setFiltroLocal('');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                tipoEleccion === 'provincial' ? 'bg-red-700 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🏛️ Provincial
            </button>
            <button
              onClick={() => {
                setTipoEleccion('distrital');
                setFiltroDistrito('');
                setFiltroLocal('');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                tipoEleccion === 'distrital' ? 'bg-red-700 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🏘️ Distrital
            </button>
          </div>

          {/* Selector de Vistas */}
          <div className="bg-gray-100 p-1 rounded-xl flex text-xs font-bold border border-gray-200">
            <button
              onClick={() => setVistaModo('completo')}
              className={`px-3 py-1.5 rounded-lg transition-all ${vistaModo === 'completo' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Vista Completa
            </button>
            <button
              onClick={() => setVistaModo('graficos')}
              className={`px-3 py-1.5 rounded-lg transition-all ${vistaModo === 'graficos' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Solo Gráficos
            </button>
            <button
              onClick={() => setVistaModo('mesas')}
              className={`px-3 py-1.5 rounded-lg transition-all ${vistaModo === 'mesas' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Solo Mesas
            </button>
          </div>

          {/* Descargas ZIP de Actas Verificadas */}
          <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => descargarZip('provincial')}
              disabled={descargando}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white hover:bg-gray-100 text-blue-800 border border-gray-200 shadow-xs flex items-center gap-1 transition-colors"
              title="Descargar actas provinciales verificadas en carpetas por distrito/local/mesa"
            >
              <Download size={12} className="text-blue-600" />
              ZIP Prov.
            </button>
            <button
              onClick={() => descargarZip('distrital')}
              disabled={descargando}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white hover:bg-gray-100 text-purple-800 border border-gray-200 shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
              title={activeDistritoNombre ? `Descargar solo actas distritales verificadas de ${activeDistritoNombre}` : "Descargar actas distritales verificadas en carpetas por distrito/local/mesa"}
            >
              <Download size={12} className="text-purple-600" />
              {activeDistritoNombre ? `ZIP Dist. (${activeDistritoNombre})` : 'ZIP Distrital'}
            </button>
            <button
              onClick={() => descargarZip('completa')}
              disabled={descargando}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white hover:bg-gray-100 text-emerald-800 border border-gray-200 shadow-xs flex items-center gap-1 transition-colors"
              title="Descargar todas las actas verificadas (provinciales y distritales)"
            >
              <Download size={12} className="text-emerald-600" />
              ZIP Todo
            </button>
          </div>

          <Button 
            onClick={() => { fetchEstadisticas(); fetchMesas(); }} 
            isLoading={loadingStats || loading} 
            variant="secondary" 
            className="flex items-center text-xs font-bold"
          >
            <RefreshCw size={14} className="mr-1.5" />
            Actualizar
          </Button>

          {(vistaModo === 'completo' || vistaModo === 'graficos') && (
            <Button
              variant="primary"
              onClick={() => exportarGraficoComoImagen('reporte-graficos-completo', `reporte-electoral-${tipoEleccion}-${filtroDistrito ? 'distrito' : 'general'}`)}
              className="flex items-center text-xs font-bold bg-red-700 hover:bg-red-800 text-white shadow-sm"
            >
              <Download size={14} className="mr-1.5" />
              PNG
            </Button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. SECCIÓN DE ESTADÍSTICAS Y MÚLTIPLES GRÁFICAS          */}
      {/* ========================================================= */}
      {(vistaModo === 'completo' || vistaModo === 'graficos') && (
        <div id="reporte-graficos-completo" className="space-y-6 bg-slate-50/50 p-2 sm:p-4 rounded-2xl border border-gray-200">
          
          {/* Membrete oficial visible en la descarga del reporte */}
          <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-black text-lg shadow">
                PE
              </div>
              <div>
                <h2 className="text-base font-extrabold text-gray-900 tracking-tight">
                  TABLERO OFICIAL DE RESULTADOS ELECTORALES ({tipoEleccion.toUpperCase()})
                </h2>
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 mt-0.5">
                  <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                    <MapPin size={12} />
                    {nombreAmbitoActual}
                  </span>
                  <span>• Actualizado: {new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            {/* Filtros Geográficos de Desglose para las Gráficas (Marcados con 'no-export') */}
            <div className="no-export flex flex-wrap items-center gap-2 w-full sm:w-auto bg-gray-50 p-2 rounded-xl border border-gray-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mr-1">
                <Filter size={14} className="text-red-600" />
                <span>Desglosar por:</span>
              </div>

              {/* Botón Atrás en barra superior */}
              {(filtroDistrito || filtroLocal) && (
                <button
                  onClick={() => {
                    if (filtroLocal) {
                      setFiltroLocal('');
                    } else if (filtroDistrito) {
                      setFiltroDistrito('');
                    }
                  }}
                  className="px-2.5 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200 flex items-center gap-1 shadow-2xs"
                  title={filtroLocal ? `Volver a locales de ${nombreDistritoActual}` : 'Volver a todos los distritos'}
                >
                  <ArrowLeft size={13} />
                  <span>Atrás</span>
                </button>
              )}

              {/* Selector de Distrito */}
              <select
                value={filtroDistrito}
                onChange={handleCambioDistritoGrafico}
                className="text-xs font-medium border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                <option value="">{tipoEleccion === 'distrital' ? 'Todos los Distritos con Candidatura' : 'Todos los Distritos (Total Huamanga)'}</option>
                {distritosDisponibles.map(d => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </select>

              {/* Selector de Local */}
              <select
                value={filtroLocal}
                onChange={(e) => setFiltroLocal(e.target.value)}
                disabled={!filtroDistrito && localesParaFiltroGrafico.length === 0}
                className={`text-xs font-medium border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-800 focus:ring-2 focus:ring-red-500 focus:outline-none ${!filtroDistrito ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <option value="">{filtroDistrito ? 'Todos los Locales del Distrito' : 'Primero seleccione distrito'}</option>
                {localesParaFiltroGrafico.map(l => (
                  <option key={l.id} value={l.id}>{l.nombre}</option>
                ))}
              </select>

              {(filtroDistrito || filtroLocal) && (
                <button
                  onClick={handleResetFiltroGraficos}
                  title="Restablecer a Total Provincial"
                  className="p-1.5 text-gray-500 hover:text-red-700 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200"
                >
                  <X size={15} />
                </button>
              )}

              {vistaModo === 'completo' && (filtroDistrito || filtroLocal) && (
                <button
                  onClick={handleSincronizarFiltrosATabla}
                  title="Aplicar estos filtros a la tabla de mesas abajo"
                  className="px-2 py-1 text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200 flex items-center gap-1"
                >
                  <Check size={12} />
                  Sincronizar Tabla
                </button>
              )}
            </div>
          </div>

          {/* Barra de Progreso de Escrutinio */}
          {resumen && (
            <Card className="border-l-4 border-l-red-600 shadow-sm bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div>
                  <span className="text-sm font-black text-gray-800 flex items-center gap-1.5">
                    <TrendingUp size={16} className="text-red-600" />
                    Avance Oficial de Cómputo Electoral ({nombreAmbitoActual})
                  </span>
                  <span className="text-xs text-gray-500">
                    Mesas verificadas y aprobadas por coordinadores de local
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-red-700 font-mono">{avance.toFixed(2)}%</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3.5 overflow-hidden">
                <div 
                  className="bg-red-600 h-3.5 rounded-full transition-all duration-700 ease-out shadow" 
                  style={{ width: `${Math.min(100, Math.max(0, avance))}%` }}
                ></div>
              </div>
              <div className="mt-2 flex flex-wrap justify-between text-xs text-gray-600">
                <span>
                  <strong>{resumen.mesas_verificadas || 0}</strong> de <strong>{resumen.total_mesas || 0}</strong> mesas oficiales escrutadas
                </span>
                <span>
                  Total Votos Computados: <strong className="text-red-700 font-extrabold font-mono text-sm">{resumen.total_votos_contados || 0}</strong> votos
                </span>
              </div>
            </Card>
          )}

          {/* Tarjetas de Métricas Rápidas */}
          {resumen && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-white">
                <p className="text-xs font-bold text-emerald-800 uppercase flex items-center justify-between">
                  Mesas Verificadas
                  <CheckCircle2 size={16} className="text-emerald-600" />
                </p>
                <p className="text-3xl font-black text-emerald-700 mt-1 font-mono">{resumen.mesas_verificadas || 0}</p>
                <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Actas aprobadas y computadas</p>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-200 bg-gradient-to-br from-amber-50/40 to-white">
                <p className="text-xs font-bold text-amber-800 uppercase flex items-center justify-between">
                  Mesas Reportadas
                  <Activity size={16} className="text-amber-600" />
                </p>
                <p className="text-3xl font-black text-amber-600 mt-1 font-mono">{resumen.mesas_reportadas || 0}</p>
                <p className="text-[11px] text-amber-700 font-medium mt-0.5">En revisión por coordinadores</p>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-red-200 bg-gradient-to-br from-red-50/40 to-white">
                <p className="text-xs font-bold text-red-800 uppercase flex items-center justify-between">
                  Mesas Observadas
                  <AlertTriangle size={16} className="text-red-600" />
                </p>
                <p className="text-3xl font-black text-red-600 mt-1 font-mono">{resumen.mesas_observadas || 0}</p>
                <p className="text-[11px] text-red-700 font-medium mt-0.5">Declinadas para subsanación</p>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <p className="text-xs font-bold text-gray-500 uppercase flex items-center justify-between">
                  Mesas Pendientes
                  <span className="text-[11px] font-normal text-gray-400">Sin acta</span>
                </p>
                <p className="text-3xl font-black text-gray-600 mt-1 font-mono">{resumen.mesas_pendientes || 0}</p>
                <p className="text-[11px] text-gray-500 font-medium mt-0.5">Por transmitir por personeros</p>
              </div>
            </div>
          )}

          {/* ===================================================== */}
          {/* BLOQUE DE GRÁFICAS 1 & 2: VOTOS Y DESGLOSE TERRITORIAL*/}
          {/* ===================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Gráfico 1: Votación por Candidato y Organización Política */}
            <div id="grafico-candidatos" className="lg:col-span-7 bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                      <Award size={18} className="text-red-600" />
                      Votación Consolidada por Candidato
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {nombreAmbitoActual} • Votos válidos escrutados
                    </p>
                  </div>

                  <button
                    onClick={() => exportarGraficoComoImagen('grafico-candidatos', `votacion-candidatos-${filtroDistrito || 'total'}`)}
                    className="no-export p-1.5 text-gray-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-gray-200"
                    title="Descargar imagen PNG de este gráfico"
                  >
                    <Download size={15} />
                  </button>
                </div>

                <div className="h-80">
                  {votosCandidatos.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={votosCandidatos} 
                        margin={{ top: 20, right: 20, left: 10, bottom: 55 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="candidato" 
                          angle={-25} 
                          textAnchor="end" 
                          height={65} 
                          tick={{ fontSize: 11, fontWeight: 'bold' }} 
                        />
                        <YAxis />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-gray-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1 border border-gray-700">
                                  <p className="font-bold text-red-400">{data.candidato}</p>
                                  <p className="text-gray-300">{data.organizacion} ({data.siglas})</p>
                                  <p className="text-white font-mono font-bold text-sm">
                                    {data.votos} votos ({data.porcentaje}%)
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar 
                          dataKey="votos" 
                          radius={[6, 6, 0, 0]} 
                        >
                          {votosCandidatos.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={index === 0 ? '#dc2626' : entry.color} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <BarChart3 size={40} className="mb-2 text-gray-300" />
                      <p className="text-sm font-semibold">Esperando actas verificadas para consolidar el cómputo</p>
                    </div>
                  )}
                </div>
              </div>

              {votosCandidatos.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>Primer Lugar: <strong className="text-red-700">{votosCandidatos[0]?.candidato}</strong></span>
                  <span>Total Votos Válidos: <strong className="font-mono text-gray-900">{votosCandidatos.reduce((acc, c) => acc + c.votos, 0)}</strong></span>
                </div>
              )}
            </div>

            {/* Gráfico 2: Desglose Territorial (Por Distritos o Por Locales del Distrito) */}
            <div id="grafico-desglose-territorial" className="lg:col-span-5 bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                      <Building2 size={18} className="text-red-600" />
                      {filtroDistrito ? 'Desglose por Locales del Distrito' : 'Desglose Comparativo por Distrito'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {filtroDistrito ? 'Locales de votación y votos contados' : 'Votos computados por distrito en Huamanga'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {(filtroDistrito || filtroLocal) && (
                      <button
                        onClick={() => {
                          if (filtroLocal) setFiltroLocal('');
                          else setFiltroDistrito('');
                        }}
                        className="no-export inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors shadow-2xs"
                        title={filtroLocal ? `Volver a locales de ${nombreDistritoActual}` : 'Volver a todos los distritos'}
                      >
                        <ArrowLeft size={13} />
                        <span>Atrás</span>
                      </button>
                    )}
                    <button
                      onClick={() => exportarGraficoComoImagen('grafico-desglose-territorial', `desglose-${filtroDistrito ? 'locales' : 'distritos'}`)}
                      className="no-export p-1.5 text-gray-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-gray-200"
                      title="Descargar imagen PNG de este gráfico"
                    >
                      <Download size={15} />
                    </button>
                  </div>
                </div>

                <div className="h-80">
                  {datosDesgloseTerritorial.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={datosDesgloseTerritorial.slice(0, 10)} 
                        layout="vertical"
                        margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" />
                        <YAxis 
                          type="category" 
                          dataKey="nombre" 
                          width={110} 
                          tick={{ fontSize: 10, fontWeight: 'bold' }} 
                        />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-gray-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1 border border-gray-700">
                                  <p className="font-bold text-red-400">{data.nombreCompleto}</p>
                                  <p className="text-gray-300">Votos Computados: <strong>{data.votos}</strong></p>
                                  <p className="text-gray-300">Avance de Mesas: {data.mesasVerificadas} de {data.totalMesas} ({data.avance}%)</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar 
                          dataKey="votos" 
                          fill="#4f46e5" 
                          radius={[0, 6, 6, 0]} 
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <Building2 size={40} className="mb-2 text-gray-300" />
                      <p className="text-sm font-semibold">Sin datos para el ámbito seleccionado</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>{filtroDistrito ? 'Locales en este distrito' : 'Distritos de Huamanga'}: <strong>{datosDesgloseTerritorial.length}</strong></span>
                <span className="text-[11px] text-gray-400">Top 10 mostrados</span>
              </div>
            </div>

          </div>

          {/* ===================================================== */}
          {/* BLOQUE DE GRÁFICAS 3 & 4: DONAS DE ESTADO Y SUFRAGIO  */}
          {/* ===================================================== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Gráfico 3: Estado de Mesas de Sufragio */}
            <div id="grafico-estado-mesas" className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                      <PieIcon size={18} className="text-red-600" />
                      Estado de Mesas de Sufragio
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {nombreAmbitoActual} • Distribución de transmisión
                    </p>
                  </div>

                  <button
                    onClick={() => exportarGraficoComoImagen('grafico-estado-mesas', `estado-mesas-${filtroDistrito || 'total'}`)}
                    className="no-export p-1.5 text-gray-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-gray-200"
                    title="Descargar imagen PNG de este gráfico"
                  >
                    <Download size={15} />
                  </button>
                </div>

                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieDataMesas}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieDataMesas.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val, name) => [`${val} mesas`, name]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="mt-2 text-center text-xs text-gray-500 font-semibold border-t border-gray-100 pt-2">
                Total: {resumen?.total_mesas || 0} mesas en este ámbito
              </div>
            </div>

            {/* Gráfico 4: Composición Total del Sufragio (Válidos, Blancos, Nulos, Impugnados) */}
            <div id="grafico-composicion-votos" className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                      <Vote size={18} className="text-red-600" />
                      Composición del Sufragio (Votos Totales)
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {nombreAmbitoActual} • Votos válidos vs especiales
                    </p>
                  </div>

                  <button
                    onClick={() => exportarGraficoComoImagen('grafico-composicion-votos', `composicion-votos-${filtroDistrito || 'total'}`)}
                    className="no-export p-1.5 text-gray-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-gray-200"
                    title="Descargar imagen PNG de este gráfico"
                  >
                    <Download size={15} />
                  </button>
                </div>

                <div className="h-64 flex items-center justify-center">
                  {pieDataComposicion.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieDataComposicion}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={85}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {pieDataComposicion.map((entry, index) => (
                            <Cell key={`comp-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val, name) => [`${val} votos`, name]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <Vote size={35} className="mb-2 text-gray-300" />
                      <p className="text-xs font-semibold">Sin votos emitidos en actas verificadas</p>
                    </div>
                  )}
                </div>
              </div>

              {composicionVotos && (
                <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs border-t border-gray-100 pt-2">
                  <div>
                    <span className="text-[10px] text-gray-500 block">Válidos</span>
                    <strong className="text-emerald-700 font-mono">{composicionVotos.votos_validos || 0}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">Blancos</span>
                    <strong className="text-amber-700 font-mono">{composicionVotos.votos_blanco || 0}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">Nulos</span>
                    <strong className="text-red-700 font-mono">{composicionVotos.votos_nulo || 0}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">Impugnados</span>
                    <strong className="text-purple-700 font-mono">{composicionVotos.votos_impugnados || 0}</strong>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* ===================================================== */}
          {/* TABLA DE RESULTADOS OFICIALES POR CANDIDATO           */}
          {/* ===================================================== */}
          {votosCandidatos.length > 0 && (
            <Card title={`📋 Tabla Consolidada de Resultados (${nombreAmbitoActual})`}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-xs font-bold text-gray-600 uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Lista</th>
                      <th className="px-4 py-3 text-left">Candidato Oficial</th>
                      <th className="px-4 py-3 text-left">Organización Política</th>
                      <th className="px-4 py-3 text-center">Siglas</th>
                      <th className="px-4 py-3 text-right">Votos Verificados</th>
                      <th className="px-4 py-3 text-right">% Votos Válidos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {votosCandidatos.map((c, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-extrabold text-red-700">
                          <span className="w-6 h-6 rounded-full bg-red-100 text-red-800 inline-flex items-center justify-center text-xs font-mono">
                            {c.numero_lista || idx + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900 flex items-center gap-2">
                          {idx === 0 && (
                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-extrabold border border-amber-300">
                              1° Lugar
                            </span>
                          )}
                          {c.candidato}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{c.organizacion}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded bg-gray-100 font-mono font-bold text-xs">
                            {c.siglas}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-black font-mono text-gray-900">
                          {c.votos.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-black font-mono text-red-700">
                          {c.porcentaje.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ===================================================== */}
          {/* TABLA DE DESGLOSE TERRITORIAL (DRILL-DOWN)            */}
          {/* ===================================================== */}
          <Card 
            title={
              <div className="flex items-center gap-3">
                {(filtroDistrito || filtroLocal) && (
                  <button
                    onClick={() => {
                      if (filtroLocal) {
                        setFiltroLocal('');
                      } else if (filtroDistrito) {
                        setFiltroDistrito('');
                        setFiltroLocal('');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg transition-colors border border-red-200 shadow-xs cursor-pointer"
                    title={filtroLocal ? `Volver a todos los locales de ${nombreDistritoActual}` : 'Volver al listado general de distritos'}
                  >
                    <ArrowLeft size={15} />
                    <span>Atrás</span>
                  </button>
                )}
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                    {filtroLocal ? (
                      <>
                        <Building2 size={18} className="text-red-600" />
                        <span>Desglose por Local: {nombreLocalActual}</span>
                      </>
                    ) : filtroDistrito ? (
                      <>
                        <Building2 size={18} className="text-red-600" />
                        <span>Desglose por Locales de {nombreDistritoActual} ({localesStats.length} locales)</span>
                      </>
                    ) : (
                      <>
                        <MapPin size={18} className="text-red-600" />
                        <span>Desglose de Avance y Votos por Distritos de Huamanga ({distritosStats.length} distritos)</span>
                      </>
                    )}
                  </h3>

                  {/* Breadcrumbs de navegación */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                    <button
                      onClick={() => { setFiltroDistrito(''); setFiltroLocal(''); }}
                      className={`hover:underline cursor-pointer ${!filtroDistrito ? 'font-bold text-red-700' : 'text-gray-600'}`}
                    >
                      Huamanga
                    </button>
                    {filtroDistrito && (
                      <>
                        <span className="text-gray-400">/</span>
                        <button
                          onClick={() => setFiltroLocal('')}
                          className={`hover:underline cursor-pointer ${filtroDistrito && !filtroLocal ? 'font-bold text-red-700' : 'text-gray-600'}`}
                        >
                          {nombreDistritoActual}
                        </button>
                      </>
                    )}
                    {filtroLocal && (
                      <>
                        <span className="text-gray-400">/</span>
                        <span className="font-bold text-red-700">{nombreLocalActual}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            }
            action={
              (filtroDistrito || filtroLocal) && (
                <div className="flex items-center gap-2">
                  {filtroLocal && (
                    <button
                      onClick={() => setFiltroLocal('')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors"
                      title={`Quitar selección de local y ver todos los locales de ${nombreDistritoActual}`}
                    >
                      <ArrowLeft size={12} />
                      <span>Ver todos los locales ({nombreDistritoActual})</span>
                    </button>
                  )}
                  <button
                    onClick={() => { setFiltroDistrito(''); setFiltroLocal(''); }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors"
                    title="Restablecer a todos los distritos"
                  >
                    <X size={12} />
                    <span>Ver todos los distritos</span>
                  </button>
                </div>
              )
            }
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-xs font-bold text-gray-600 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">{filtroDistrito ? 'Local de Votación' : 'Distrito'}</th>
                    <th className="px-4 py-3 text-center">Total Mesas</th>
                    <th className="px-4 py-3 text-center">Mesas Verificadas</th>
                    <th className="px-4 py-3 text-right">Votos Contados</th>
                    <th className="px-4 py-3 text-right">% Avance</th>
                    <th className="px-4 py-3 text-center no-export">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filtroDistrito ? (
                    localesStats.map((l) => {
                      const esSeleccionado = String(l.id) === String(filtroLocal);
                      return (
                        <tr 
                          key={l.id} 
                          className={`transition-colors ${esSeleccionado ? 'bg-red-50/70 border-l-4 border-red-600' : 'hover:bg-gray-50'}`}
                        >
                          <td className="px-4 py-3 font-bold text-gray-900">
                            <div className="flex items-center gap-2">
                              <span>{l.nombre}</span>
                              {esSeleccionado && (
                                <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-red-600 text-white shadow-xs">
                                  Seleccionado
                                </span>
                              )}
                            </div>
                            <span className="block text-xs font-normal text-gray-500">{l.direccion}</span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono">{l.total_mesas}</td>
                          <td className="px-4 py-3 text-center font-mono font-bold text-emerald-700">{l.mesas_verificadas}</td>
                          <td className="px-4 py-3 text-right font-mono font-extrabold text-gray-900">{(l.votos_contados || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-mono font-black text-red-700">{l.porcentaje_avance}%</td>
                          <td className="px-4 py-3 text-center no-export">
                            {esSeleccionado ? (
                              <button
                                onClick={() => setFiltroLocal('')}
                                className="px-2.5 py-1 text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 flex items-center gap-1 mx-auto shadow-2xs"
                                title="Quitar selección de este local"
                              >
                                <X size={12} />
                                Quitar Filtro
                              </button>
                            ) : (
                              <button
                                onClick={() => setFiltroLocal(String(l.id))}
                                className="px-2.5 py-1 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                              >
                                Filtrar este Local
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    distritosStats.map((d) => (
                      <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-bold text-gray-900">
                          {d.nombre}
                          <span className="block text-xs font-normal text-gray-500">Cód: {d.codigo} • {d.total_locales} locales</span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono">{d.total_mesas}</td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-emerald-700">{d.mesas_verificadas}</td>
                        <td className="px-4 py-3 text-right font-mono font-extrabold text-gray-900">{(d.votos_contados || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono font-black text-red-700">{d.porcentaje_avance}%</td>
                        <td className="px-4 py-3 text-center no-export">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setFiltroDistrito(String(d.id));
                                setFiltroLocal('');
                              }}
                              className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200 flex items-center gap-1 cursor-pointer"
                              title={`Desglosar locales del distrito ${d.nombre}`}
                            >
                              Desglosar Locales
                              <ChevronRight size={14} />
                            </button>
                            <button
                              onClick={() => descargarZip('distrital', d.id, d.nombre)}
                              disabled={descargando}
                              className="px-2 py-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200 flex items-center gap-1 shadow-2xs cursor-pointer"
                              title={`Descargar ZIP con actas distritales verificadas de ${d.nombre}`}
                            >
                              <Download size={12} />
                              <span>ZIP</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

        </div>
      )}

      {/* ========================================================= */}
      {/* 3. SECCIÓN DE MESAS DE SUFRAGIO Y AUDITORÍA DE ACTAS     */}
      {/* ========================================================= */}
      {(vistaModo === 'completo' || vistaModo === 'mesas') && (
        <Card title="🗳️ Auditoría de Mesas de Sufragio y Actas de Escrutinio">
          {/* Barra de Filtros Avanzados para la Tabla */}
          <div className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-gray-700 uppercase flex items-center gap-1.5">
                <Filter size={14} className="text-red-600" />
                Filtros de Búsqueda de Mesas
              </span>
              {(searchTerm || selectedDistrito || selectedLocal || selectedEstado) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedDistrito('');
                    setSelectedLocal('');
                    setSelectedEstado('');
                    setPage(1);
                  }}
                  className="text-xs text-red-600 hover:text-red-800 font-bold flex items-center gap-1"
                >
                  <X size={13} />
                  Limpiar Filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <SearchInput
                placeholder="Buscar por N° mesa..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              />

              <select
                value={selectedDistrito}
                onChange={(e) => { setSelectedDistrito(e.target.value); setSelectedLocal(''); setPage(1); }}
                className="text-xs font-medium border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                <option value="">{tipoEleccion === 'distrital' ? 'Todos los Distritos con Candidatura' : 'Todos los Distritos'}</option>
                {distritosDisponibles.map(d => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </select>

              <select
                value={selectedLocal}
                onChange={(e) => { setSelectedLocal(e.target.value); setPage(1); }}
                disabled={!selectedDistrito && localesParaFiltroTabla.length === 0}
                className="text-xs font-medium border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                <option value="">Todos los Locales</option>
                {localesParaFiltroTabla.map(l => (
                  <option key={l.id} value={l.id}>{l.nombre}</option>
                ))}
              </select>

              <select
                value={selectedEstado}
                onChange={(e) => { setSelectedEstado(e.target.value); setPage(1); }}
                className="text-xs font-medium border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                <option value="">Todos los Estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="reportada">Reportada / En Revisión</option>
                <option value="verificada">Verificada (Aprobada)</option>
                <option value="observada">Observada (Declinada)</option>
              </select>
            </div>
          </div>

          {/* Tabla de Mesas */}
          <Table headers={['N° Mesa', 'Distrito', 'Local de Votación', 'Estado', 'Personero', 'Acciones']}>
            {mesas.map((row) => {
              const estadoAMostrar = tipoEleccion === 'distrital' ? (row.estado_distrital || 'pendiente') : row.estado;
              return (
              <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className="font-extrabold font-mono text-gray-900">{row.numero_mesa}</span>
                  <span className="block text-[11px] text-gray-500">{row.total_electores_habiles || 300} electores</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                  {row.distrito_nombre}
                </td>
                <td className="px-6 py-4 text-sm">
                  <p className="font-bold text-gray-800 text-xs">{row.local_nombre}</p>
                  <p className="text-[11px] text-gray-500">{row.local_direccion}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant={estadoAMostrar}>{estadoAMostrar}</Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {row.personero_nombre ? (
                    <div>
                      <p className="font-semibold text-xs text-gray-900">{row.personero_nombre}</p>
                      <p className="text-[11px] text-gray-500">DNI: {row.personero_dni}</p>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Sin asignar</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Button
                    size="sm"
                    variant={row.estado === 'pendiente' ? 'secondary' : 'primary'}
                    onClick={() => handleVerDetalle(row)}
                    className="flex items-center gap-1 text-xs"
                  >
                    <Eye size={13} />
                    Ver Detalle
                  </Button>
                </td>
              </tr>
            );})}
          </Table>

          {/* Paginación */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-gray-200">
            <span className="text-xs text-gray-500">
              Mostrando página <strong>{page}</strong> de <strong>{totalPages}</strong> ({totalMesas} mesas totales)
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ========================================================= */}
      {/* 4. MODAL DETALLE DE MESA Y VISOR DE ACTA CON ZOOM         */}
      {/* ========================================================= */}
      <Modal
        isOpen={modalDetalleOpen}
        onClose={() => { setModalDetalleOpen(false); setSelectedResultado(null); }}
        title={`Detalle Oficial de Mesa N° ${selectedResultado?.numero_mesa || ''}`}
        size="lg"
      >
        {loadingDetalle ? (
          <div className="flex flex-col items-center justify-center p-8">
            <RefreshCw className="animate-spin text-red-600 mb-2" size={32} />
            <p className="text-xs text-gray-500 font-medium">Cargando información del acta...</p>
          </div>
        ) : selectedResultado ? (
          <div className="space-y-4">
            {/* Cabecera del Modal */}
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-gray-500 block">Distrito:</span>
                <strong className="text-gray-900">{selectedResultado.distrito_nombre}</strong>
              </div>
              <div>
                <span className="text-gray-500 block">Local:</span>
                <strong className="text-gray-900">{selectedResultado.local_nombre}</strong>
              </div>
              <div>
                <span className="text-gray-500 block">Estado Actual:</span>
                <Badge variant={selectedResultado.estado}>{selectedResultado.estado}</Badge>
              </div>
              <div>
                <span className="text-gray-500 block">Electores Hábiles:</span>
                <strong className="font-mono text-gray-900">{selectedResultado.total_electores_habiles || 300}</strong>
              </div>
            </div>

            {/* Fotografía del Acta */}
            {modalPhotoUrl ? (
              <div className="bg-gray-900 p-2 rounded-xl text-center">
                <div className="flex justify-between items-center px-2 py-1 text-white text-xs">
                  <span className="flex items-center gap-1 text-gray-300">
                    <ImageIcon size={14} /> Fotografía del Acta Transmitida
                  </span>
                  <button
                    onClick={() => setZoomFoto(!zoomFoto)}
                    className="text-red-400 hover:text-red-300 font-bold flex items-center gap-1"
                  >
                    <ExternalLink size={13} />
                    {zoomFoto ? 'Reducir' : 'Ampliar Zoom'}
                  </button>
                </div>
                <div className={`overflow-auto transition-all ${zoomFoto ? 'max-h-[70vh]' : 'max-h-64'}`}>
                  <img
                    src={modalPhotoUrl}
                    alt={`Acta Mesa ${selectedResultado.numero_mesa}`}
                    className="w-full h-auto object-contain rounded-lg mx-auto"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://placehold.co/600x400/1e293b/white?text=Foto+del+Acta+No+Disponible';
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-center text-amber-800 text-xs">
                <AlertTriangle size={24} className="mx-auto mb-1 text-amber-600" />
                Esta mesa aún no tiene fotografía de acta transmitida por el personero.
              </div>
            )}

            {/* Votos del Acta */}
            {selectedResultado.resultadoDetalle?.votos && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-700 uppercase">Votos Registrados en el Acta</h4>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Candidato / Opción</th>
                        <th className="px-3 py-2 text-right">Votos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white font-mono">
                      {selectedResultado.resultadoDetalle.votos.map((v, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 font-bold font-sans text-gray-900">{v.candidato_nombre}</td>
                          <td className="px-3 py-1.5 text-right font-extrabold text-red-700">{v.votos}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-bold">
                        <td className="px-3 py-1.5 font-sans">Votos en Blanco</td>
                        <td className="px-3 py-1.5 text-right">{selectedResultado.resultadoDetalle.votos_blanco || 0}</td>
                      </tr>
                      <tr className="bg-gray-50 font-bold">
                        <td className="px-3 py-1.5 font-sans">Votos Nulos</td>
                        <td className="px-3 py-1.5 text-right">{selectedResultado.resultadoDetalle.votos_nulo || 0}</td>
                      </tr>
                      <tr className="bg-gray-50 font-bold">
                        <td className="px-3 py-1.5 font-sans">Votos Impugnados</td>
                        <td className="px-3 py-1.5 text-right">{selectedResultado.resultadoDetalle.votos_impugnados || 0}</td>
                      </tr>
                      <tr className="bg-red-50 text-red-900 font-black">
                        <td className="px-3 py-2 font-sans">TOTAL VOTOS EMITIDOS</td>
                        <td className="px-3 py-2 text-right text-sm">{selectedResultado.resultadoDetalle.total_votos_emitidos || 0}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

    </div>
  );
};

export default ResultadosAdminPage;
