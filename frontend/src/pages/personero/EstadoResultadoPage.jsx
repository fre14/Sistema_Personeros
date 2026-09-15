import React, { useState, useEffect } from 'react';
import { get } from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import { CheckCircle, Clock, AlertTriangle, Send } from 'lucide-react';

const EstadoResultadoPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();
  const navigate = useNavigate();

  const fetchEstado = async () => {
    try {
      const res = await get('/resultados/mi-mesa');
      setData(res.data?.data || res.data || null);
    } catch (error) {
      console.error('Error obteniendo estado de mesa:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstado();
    if (socket) {
      socket.on('resultado:verificado', fetchEstado);
      socket.on('resultado:observado', fetchEstado);
      return () => {
        socket.off('resultado:verificado');
        socket.off('resultado:observado');
      };
    }
  }, [socket]);

  if (loading) return <div className="flex justify-center mt-20"><Spinner text="Consultando estado..." /></div>;

  const mesa = data?.mesa;
  const resultado = data?.resultado;

  if (!resultado) {
    return (
      <div className="max-w-md mx-auto text-center mt-16 p-6 bg-white rounded-xl shadow border border-gray-200">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-4">
          <Clock size={32} />
        </div>
        <h2 className="text-xl font-extrabold text-gray-900">Sin Resultados Transmitidos</h2>
        <p className="text-sm text-gray-600 mt-2 mb-6">
          Aún no has transmitido la fotografía ni los votos del acta para la Mesa {mesa?.numero_mesa || ''}.
        </p>
        <Button onClick={() => navigate('/personero/cargar-resultado')} className="w-full">
          📸 Cargar Resultados Ahora
        </Button>
      </div>
    );
  }

  const renderEstadoIcon = () => {
    switch(resultado.estado) {
      case 'reportada': return <Send className="w-12 h-12 text-amber-500" />;
      case 'verificada': return <CheckCircle className="w-12 h-12 text-emerald-500" />;
      case 'observada': return <AlertTriangle className="w-12 h-12 text-red-600" />;
      default: return <Clock className="w-12 h-12 text-gray-400" />;
    }
  };

  const getEstadoColor = () => {
    switch(resultado.estado) {
      case 'reportada': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'verificada': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'observada': return 'bg-red-50 text-red-800 border-red-200';
      default: return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <Card className="text-center pt-8 pb-6">
        <div className="flex justify-center mb-4">
          {renderEstadoIcon()}
        </div>
        <p className="text-xs uppercase font-bold text-gray-500">Estado del Acta</p>
        <h2 className="text-3xl font-black capitalize mb-2 text-gray-900">{resultado.estado}</h2>
        
        <div className={`mx-4 p-3 rounded-lg border text-sm font-medium ${getEstadoColor()}`}>
          {resultado.estado === 'reportada' && 'Resultados transmitidos con éxito. En espera de revisión por el coordinador.'}
          {resultado.estado === 'verificada' && '¡Acta validada y verificada oficialmente!'}
          {resultado.estado === 'observada' && (
            <div>
              <p className="font-bold mb-1">Acta Observada:</p>
              <p>{resultado.observaciones_coordinador || 'Por favor revise y corrija las cantidades ingresadas.'}</p>
            </div>
          )}
        </div>

        {resultado.estado === 'observada' && (
          <div className="mt-6 px-4">
            <Button className="w-full" variant="danger" onClick={() => navigate('/personero/cargar-resultado')}>
              Corregir y Reenviar Resultado
            </Button>
          </div>
        )}
      </Card>

      <Card title="Resumen de Escrutinio">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-600">Mesa</span>
            <span className="font-extrabold text-gray-900">Mesa {mesa?.numero_mesa}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-600">Fecha de Transmisión</span>
            <span className="font-medium text-gray-900">
              {resultado.created_at ? new Date(resultado.created_at).toLocaleString() : 'Recién transmitido'}
            </span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-600">Total Votos Contabilizados</span>
            <span className="font-black text-red-700 text-lg">{resultado.total_votos_emitidos || resultado.total_votos || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Límite Permitido</span>
            <span className="text-xs font-semibold text-gray-500">Máx. 300 votos</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EstadoResultadoPage;
