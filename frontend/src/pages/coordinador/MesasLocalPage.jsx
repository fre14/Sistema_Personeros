import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get } from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';

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
      setMesas(res.data.mesas);
      setLocalInfo(res.data.local);
    } catch (error) {
      console.error(error);
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
      <div className="flex items-center gap-4 mb-4">
        <Button variant="secondary" onClick={() => navigate('/coordinador/mis-locales')}>Volver</Button>
        <h1 className="text-2xl font-bold text-gray-900">{localInfo?.nombre} - Mesas</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {['todas', 'pendiente', 'reportada', 'verificada', 'observada'].map(estado => (
          <button
            key={estado}
            onClick={() => setFiltroEstado(estado)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize whitespace-nowrap transition-colors ${
              filtroEstado === estado ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {estado}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {mesasFiltradas.map((mesa) => (
          <Card 
            key={mesa.id}
            className={`transition-colors ${
              mesa.estado === 'reportada' ? 'border-yellow-400 ring-2 ring-yellow-200 cursor-pointer' : 
              mesa.resultado_id ? 'cursor-pointer' : 'opacity-75'
            }`}
            onClick={() => {
              if (mesa.resultado_id) {
                navigate(`/coordinador/resultado/${mesa.resultado_id}`);
              }
            }}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-xl font-bold text-gray-900">Mesa {mesa.numero_mesa}</span>
              <Badge variant={mesa.estado}>{mesa.estado}</Badge>
            </div>
            <div className="text-sm text-gray-500 mt-2">
              <p>Electores: {mesa.electores_habiles}</p>
              <p className="truncate">Personero: {mesa.personero_nombre || 'No asignado'}</p>
            </div>
            {mesa.estado === 'reportada' && (
              <div className="mt-3 text-center text-sm font-medium text-yellow-700 bg-yellow-50 p-2 rounded">
                Click para revisar
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MesasLocalPage;
