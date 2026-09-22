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

  const renderSection = (title, resultado, estadoMesa, tipo) => {
    if (!resultado && (!estadoMesa || estadoMesa === 'pendiente')) {
      return (
        <Card className="mb-6">
          <div className="text-center p-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4">
              <Clock size={24} />
            </div>
            <h2 className="text-lg font-extrabold text-gray-900">Sin {title}</h2>
            <p className="text-sm text-gray-600 mt-2 mb-4">
              Aún no has transmitido los resultados.
            </p>
            <Button onClick={() => navigate(`/personero/cargar-resultado?tipo=${tipo}`)} className="w-full text-sm">
              📸 Cargar {title} Ahora
            </Button>
          </div>
        </Card>
      );
    }

    const estadoNorm = (resultado?.estado || estadoMesa || '').toLowerCase();
    const esReportada = estadoNorm === 'reportada' || estadoNorm === 'pendiente' || (resultado && estadoNorm === '');
    const esVerificada = estadoNorm === 'verificada' || estadoNorm === 'verificado';
    const esObservada = estadoNorm === 'observada' || estadoNorm === 'observado';

    const rawPhoto = resultado?.foto_acta_url_presigned || resultado?.foto_acta_url;
    const photoUrl = rawPhoto ? (rawPhoto.startsWith('http') || rawPhoto.startsWith('/') ? rawPhoto : `/${rawPhoto}`) : null;

    const renderEstadoIcon = () => {
      if (esReportada) return <Send className="w-12 h-12 text-amber-500" />;
      if (esVerificada) return <CheckCircle className="w-12 h-12 text-emerald-500" />;
      if (esObservada) return <AlertTriangle className="w-12 h-12 text-red-600" />;
      return <Clock className="w-12 h-12 text-gray-400" />;
    };

    const getEstadoColor = () => {
      if (esReportada) return 'bg-amber-50 text-amber-800 border-amber-200';
      if (esVerificada) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      if (esObservada) return 'bg-red-50 text-red-800 border-red-200';
      return 'bg-gray-50 text-gray-800 border-gray-200';
    };

    return (
      <div className="space-y-6 mb-8">
        <Card className="text-center pt-8 pb-6">
          <div className="flex justify-center mb-4">
            {renderEstadoIcon()}
          </div>
          <p className="text-xs uppercase font-bold text-gray-500">Estado del {title}</p>
          <h2 className="text-3xl font-black capitalize mb-2 text-gray-900">
            {esVerificada ? 'Verificada' : esObservada ? 'Observada' : 'Reportada (En Revisión)'}
          </h2>
          
          <div className={`mx-4 p-3.5 rounded-xl border text-sm font-medium ${getEstadoColor()}`}>
            {esReportada && 'Resultados transmitidos con éxito. En espera de revisión por el coordinador de su local.'}
            {esVerificada && '¡Acta validada y verificada oficialmente! Cómputo registrado.'}
            {esObservada && (
              <div className="text-left space-y-1">
                <p className="font-extrabold text-red-900 flex items-center gap-1">
                  <AlertTriangle size={16} /> Acta Declinada / Observada:
                </p>
                <p className="bg-white/80 p-2 rounded border border-red-200 text-xs">
                  {resultado?.observaciones_coordinador || 'Por favor revise y corrija las cantidades ingresadas.'}
                </p>
              </div>
            )}
          </div>

          {esObservada && (
            <div className="mt-6 px-4">
              <Button className="w-full font-black py-3" variant="danger" onClick={() => navigate(`/personero/cargar-resultado?tipo=${tipo}`)}>
                ✏️ Corregir y Reenviar Resultado
              </Button>
            </div>
          )}
        </Card>

        {photoUrl && (
          <Card title={`Foto del ${title}`}>
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-900 flex justify-center p-1">
              <img src={photoUrl} alt="Acta transmitida" className="max-h-72 object-contain rounded" />
            </div>
          </Card>
        )}

        {resultado && (
          <Card title="Resumen de Escrutinio">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Mesa</span>
                <span className="font-extrabold text-gray-900">Mesa {mesa?.numero_mesa}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Fecha de Transmisión</span>
                <span className="font-medium text-gray-900">
                  {resultado?.created_at || resultado?.subido_en ? new Date(resultado.created_at || resultado.subido_en).toLocaleString() : 'Recién transmitido'}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Total Votos Contabilizados</span>
                <span className="font-black text-red-700 text-lg">{resultado?.total_votos_emitidos || resultado?.total_votos || 0}</span>
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto">
      {data?.tiene_distrital ? (
        <>
          {renderSection('Acta Provincial', data.resultado_provincial || data.resultado, mesa?.estado, 'provincial')}
          {renderSection('Acta Distrital', data.resultado_distrital, mesa?.estado_distrital, 'distrital')}
        </>
      ) : (
        renderSection('Acta Provincial', data?.resultado_provincial || data?.resultado, mesa?.estado, 'provincial')
      )}
    </div>
  );
};

export default EstadoResultadoPage;
