import React, { useState, useEffect } from 'react';
import { get } from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { MapPin, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import Spinner from '../../components/ui/Spinner';

const MisLocalesPage = () => {
  const [locales, setLocales] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();
  const navigate = useNavigate();

  const fetchLocales = async () => {
    try {
      const res = await get('/coordinador/locales');
      const data = res.data?.data || res.data || [];
      setLocales(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al obtener locales del coordinador:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocales();
    if (socket) {
      socket.on('resultado:nuevo', fetchLocales);
      socket.on('resultado:verificado', fetchLocales);
      socket.on('resultado:observado', fetchLocales);
      return () => {
        socket.off('resultado:nuevo');
        socket.off('resultado:verificado');
        socket.off('resultado:observado');
      };
    }
  }, [socket]);

  if (loading) return <div className="flex justify-center p-8"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <MapPin className="mr-2 text-red-600" size={28} />
            Mis Locales de Votación
          </h1>
          <p className="text-sm text-gray-500">
            Supervisión directa de locales y mesas asignadas • Elecciones Huamanga 2026
          </p>
        </div>
      </div>
      
      {locales.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-500 space-y-2">
            <AlertCircle className="mx-auto text-amber-500" size={40} />
            <p className="text-base font-semibold text-gray-700">No tienes locales asignados actualmente</p>
            <p className="text-sm text-gray-500">Comunícate con el administrador del sistema para que asigne tu local de votación.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locales.map((local) => {
            const stats = local.stats || { total: 0, verificadas: 0, pendientes: 0, reportadas: 0, observadas: 0, personeros_asignados: 0 };
            const pct = stats.total > 0 ? (stats.verificadas / stats.total) * 100 : 0;
            
            const statsDist = local.stats_distrital || { total: 0, verificadas: 0, pendientes: 0, reportadas: 0, observadas: 0 };
            const pctDist = statsDist.total > 0 ? (statsDist.verificadas / statsDist.total) * 100 : 0;

            return (
              <Card 
                key={local.id} 
                onClick={() => navigate(`/coordinador/mesas/${local.id}`)}
                className="hover:border-red-400 hover:shadow-md cursor-pointer transition-all border-l-4 border-l-red-600"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-red-700">{local.nombre}</h3>
                    <p className="text-xs text-gray-500 flex items-center mt-1">
                      <MapPin size={14} className="mr-1 text-red-500 flex-shrink-0" /> {local.direccion || 'Sin dirección'} • {local.distrito}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
                  <span className="flex items-center">
                    <Users size={14} className="mr-1 text-gray-500" />
                    Personeros asignados:
                  </span>
                  <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                    {stats.personeros_asignados || 0} / {stats.total} mesas
                  </span>
                </div>
                
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">Avance Provincial</span>
                      <span className="font-bold text-blue-700">
                        {stats.verificadas} / {stats.total} mesas ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      ></div>
                    </div>
                  </div>

                  {local.tiene_distrital && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700">Avance Distrital</span>
                        <span className="font-bold text-purple-700">
                          {statsDist.verificadas} / {statsDist.total} mesas ({pctDist.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-purple-600 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, Math.max(0, pctDist))}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700 font-medium">P: {stats.pendientes} {local.tiene_distrital ? `| ${statsDist.pendientes}` : ''} Pen</span>
                  <span className="px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-800 font-medium">R: {stats.reportadas} {local.tiene_distrital ? `| ${statsDist.reportadas}` : ''} Rep</span>
                  <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-800 font-medium">V: {stats.verificadas} {local.tiene_distrital ? `| ${statsDist.verificadas}` : ''} Ver</span>
                  <span className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-800 font-medium">O: {stats.observadas} {local.tiene_distrital ? `| ${statsDist.observadas}` : ''} Obs</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MisLocalesPage;
