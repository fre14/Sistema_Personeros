import React, { useState, useEffect } from 'react';
import { get } from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import { CheckCircle, Clock, AlertTriangle, Send } from 'lucide-react';

const EstadoResultadoPage = () => {
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();
  const navigate = useNavigate();

  const fetchEstado = async () => {
    try {
      // Simulating fetch by using mesa endpoint which should include resultado info
      const res = await get('/personero/mesa');
      setResultado(res.data.resultado);
    } catch (error) {
      console.error(error);
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

  if (loading) return <div className="flex justify-center mt-20"><Spinner /></div>;

  if (!resultado) {
    return (
      <div className="text-center mt-20 p-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <Clock className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Sin Resultados</h2>
        <p className="text-gray-600 mt-2 mb-6">Aún no has enviado los resultados de tu mesa.</p>
        <Button onClick={() => navigate('/personero/cargar-resultado')}>Cargar Ahora</Button>
      </div>
    );
  }

  const renderEstadoIcon = () => {
    switch(resultado.estado) {
      case 'reportada': return <Send className="w-12 h-12 text-yellow-500" />;
      case 'verificada': return <CheckCircle className="w-12 h-12 text-green-500" />;
      case 'observada': return <AlertTriangle className="w-12 h-12 text-red-500" />;
      default: return <Clock className="w-12 h-12 text-gray-500" />;
    }
  };

  const getEstadoColor = () => {
    switch(resultado.estado) {
      case 'reportada': return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      case 'verificada': return 'bg-green-50 text-green-800 border-green-200';
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
        <h2 className="text-2xl font-bold capitalize mb-2">{resultado.estado}</h2>
        
        <div className={`mx-4 p-3 rounded-lg border text-sm ${getEstadoColor()}`}>
          {resultado.estado === 'reportada' && 'Resultados enviados. Esperando verificación del coordinador.'}
          {resultado.estado === 'verificada' && 'Acta verificada exitosamente. ¡Buen trabajo!'}
          {resultado.estado === 'observada' && (
            <div>
              <p className="font-bold mb-1">Acta Observada:</p>
              <p>{resultado.observaciones_coordinador || 'Por favor corrige los datos enviados.'}</p>
            </div>
          )}
        </div>

        {resultado.estado === 'observada' && (
          <div className="mt-6 px-4">
            <Button className="w-full" variant="danger" onClick={() => navigate('/personero/cargar-resultado')}>
              Corregir Resultado
            </Button>
          </div>
        )}
      </Card>

      <Card title="Resumen de Envío">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-600">Fecha de envío</span>
            <span className="font-medium">{new Date(resultado.fecha_registro).toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-600">Total Votos Contabilizados</span>
            <span className="font-bold text-blue-600">{resultado.total_votos}</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EstadoResultadoPage;
