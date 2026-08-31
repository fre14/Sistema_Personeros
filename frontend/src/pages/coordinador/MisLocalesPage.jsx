import React, { useState, useEffect } from 'react';
import { get } from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { MapPin } from 'lucide-react';
import Spinner from '../../components/ui/Spinner';

const MisLocalesPage = () => {
  const [locales, setLocales] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();
  const navigate = useNavigate();

  const fetchLocales = async () => {
    try {
      const res = await get('/coordinador/locales');
      setLocales(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocales();
    if (socket) {
      socket.on('resultado:nuevo', fetchLocales);
      socket.on('resultado:verificado', fetchLocales);
      return () => {
        socket.off('resultado:nuevo');
        socket.off('resultado:verificado');
      };
    }
  }, [socket]);

  if (loading) return <div className="flex justify-center p-8"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Mis Locales Asignados</h1>
      
      {locales.length === 0 ? (
        <Card>
          <div className="text-center py-8 text-gray-500">
            No tienes locales asignados. Contacta al administrador.
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locales.map((local) => (
            <Card 
              key={local.id} 
              onClick={() => navigate(`/coordinador/mesas/${local.id}`)}
              className="hover:border-indigo-300"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{local.nombre}</h3>
                  <p className="text-sm text-gray-500 flex items-center mt-1">
                    <MapPin size={16} className="mr-1" /> {local.direccion} - {local.distrito}
                  </p>
                </div>
              </div>
              
              <div className="mt-6">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">Avance</span>
                  <span className="font-bold text-indigo-600">
                    {local.stats.verificadas} / {local.stats.total} mesas
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full" 
                    style={{ width: `${local.stats.total > 0 ? (local.stats.verificadas / local.stats.total) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div className="mt-4 flex gap-2 flex-wrap">
                <Badge variant="gray">{local.stats.pendientes} Pen</Badge>
                <Badge variant="yellow">{local.stats.reportadas} Rep</Badge>
                <Badge variant="green">{local.stats.verificadas} Ver</Badge>
                <Badge variant="red">{local.stats.observadas} Obs</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MisLocalesPage;
