import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get } from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import { ArrowLeft, User, Phone, CheckCircle2, Clock, AlertTriangle, FileText } from 'lucide-react';

const MesasLocalPage = () => {
  const { localId } = useParams();
  const [mesas, setMesas] = useState([]);
  const [localInfo, setLocalInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const { socket } = useSocket();
  const navigate = useNavigate();

  const fetchMesas = async () => {
    try {
      const res = await get(`/coordinador/locales/${localId}/mesas`);
      const data = res.data?.data || res.data || {};
      setMesas(data.mesas || []);
      setLocalInfo(data.local || null);
    } catch (error) {
      console.error('Error cargando mesas del local:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMesas();
    if (socket) {
      socket.on('resultado:nuevo', fetchMesas);
      socket.on('resultado:verificado', fetchMesas);
      socket.on('resultado:observado', fetchMesas);
      return () => {
        socket.off('resultado:nuevo');
        socket.off('resultado:verificado');
        socket.off('resultado:observado');
      };
    }
  }, [localId, socket]);

  const mesasFiltradas = mesas.filter(m => filtroEstado === 'todas' || m.estado === filtroEstado);

  if (loading) return <div className="flex justify-center p-8"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/coordinador/mis-locales')} className="flex items-center">
            <ArrowLeft size={16} className="mr-1" />
            Volver a Locales
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{localInfo?.nombre || 'Local de Votación'}</h1>
            <p className="text-xs sm:text-sm text-gray-500">
              {localInfo?.direccion} • {localInfo?.distrito} • {mesas.length} mesas en total
            </p>
          </div>
        </div>
      </div>

      {/* Píldoras de filtro por estado */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['todas', 'pendiente', 'reportada', 'verificada', 'observada'].map(estado => {
          const count = estado === 'todas' ? mesas.length : mesas.filter(m => m.estado === estado).length;
          return (
            <button
              key={estado}
              onClick={() => setFiltroEstado(estado)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                filtroEstado === estado
                  ? 'bg-red-700 text-white shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              <span>{estado}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filtroEstado === estado ? 'bg-red-900 text-red-100' : 'bg-gray-200 text-gray-700'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tarjetas de Mesas y Personeros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {mesasFiltradas.map((mesa) => {
          const esClickeable = Boolean(mesa.resultado_id);

          return (
            <Card 
              key={mesa.id}
              className={`transition-all ${
                mesa.estado === 'reportada' ? 'border-amber-400 ring-2 ring-amber-200 cursor-pointer shadow-md' : 
                esClickeable ? 'hover:border-red-300 cursor-pointer' : 'opacity-90'
              }`}
              onClick={() => {
                if (mesa.resultado_id) {
                  navigate(`/coordinador/resultado/${mesa.resultado_id}`);
                }
              }}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-lg font-extrabold text-gray-900">Mesa {mesa.numero_mesa}</span>
                <Badge variant={mesa.estado}>{mesa.estado}</Badge>
              </div>

              <div className="text-xs text-gray-600 space-y-1 mt-2">
                <p><span className="font-semibold">Padrón:</span> {mesa.electores_habiles || 0} electores</p>
                
                {/* Personero Supervisado */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center text-xs font-semibold text-gray-800">
                    <User size={13} className="mr-1 text-red-600" />
                    Personero:
                  </div>
                  {mesa.personero_nombre ? (
                    <div className="mt-1 pl-4 space-y-0.5">
                      <p className="font-medium text-gray-900 truncate">{mesa.personero_nombre}</p>
                      <p className="text-[11px] text-gray-500 font-mono">DNI: {mesa.personero_dni}</p>
                      {mesa.personero_telefono && (
                        <p className="text-[11px] text-red-700 flex items-center font-medium">
                          <Phone size={11} className="mr-1" />
                          <a 
                            href={`tel:${mesa.personero_telefono}`} 
                            onClick={(e) => e.stopPropagation()} 
                            className="hover:underline"
                          >
                            {mesa.personero_telefono}
                          </a>
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="pl-4 text-[11px] text-amber-600 font-medium italic mt-0.5">Sin personero asignado</p>
                  )}
                </div>
              </div>

              {mesa.estado === 'reportada' && (
                <div className="mt-3 text-center text-xs font-bold text-amber-800 bg-amber-50 py-1.5 px-2 rounded border border-amber-200 flex items-center justify-center gap-1">
                  <Clock size={13} />
                  Revisar Acta Transmitida
                </div>
              )}
              {mesa.estado === 'verificada' && mesa.resultado_id && (
                <div className="mt-3 text-center text-xs font-semibold text-green-700 bg-green-50 py-1 px-2 rounded flex items-center justify-center gap-1">
                  <CheckCircle2 size={13} />
                  Acta Verificada
                </div>
              )}
              {mesa.estado === 'observada' && mesa.resultado_id && (
                <div className="mt-3 text-center text-xs font-semibold text-red-700 bg-red-50 py-1 px-2 rounded flex items-center justify-center gap-1">
                  <AlertTriangle size={13} />
                  Acta Observada
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {mesasFiltradas.length === 0 && (
        <Card>
          <div className="text-center py-10 text-gray-500 text-sm">
            No se encontraron mesas con el estado seleccionado.
          </div>
        </Card>
      )}
    </div>
  );
};

export default MesasLocalPage;
