import React, { useState, useEffect } from 'react';
import { get } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { MapPin, Users, AlertCircle } from 'lucide-react';

const MiMesaPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMiMesa = async () => {
      try {
        const res = await get('/resultados/mi-mesa');
        setData(res.data?.data || res.data || null);
      } catch (error) {
        console.error('Error obteniendo mesa asignada:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMiMesa();
  }, []);

  if (loading) return <div className="flex justify-center mt-20"><Spinner text="Consultando asignación..." /></div>;

  const mesa = data?.mesa;
  const local = data?.local;

  if (!mesa) {
    return (
      <div className="max-w-md mx-auto text-center mt-12 p-6 bg-white rounded-xl shadow border border-gray-200">
        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-extrabold text-gray-900">Mesa No Asignada</h2>
        <p className="text-sm text-gray-600 mt-2 mb-4 leading-relaxed">
          Su cuenta aún no tiene una mesa de votación asignada por el Administrador o Coordinador. Por favor contáctelos para que vinculen su DNI a una mesa de sufragio.
        </p>
      </div>
    );
  }

  const renderActaCard = (title, tipo, estadoMesa, resultadoObj) => (
    <Card className="mb-6">
      <div className="text-center pb-5 border-b border-gray-100">
        <p className="text-xs font-bold uppercase tracking-wider text-red-600 mb-1">{title}</p>
        <h2 className="text-4xl font-black text-gray-900 tracking-tight">Mesa {mesa.numero_mesa}</h2>
        <div className="mt-2 inline-block">
          <Badge variant={estadoMesa || 'pendiente'}>{estadoMesa || 'pendiente'}</Badge>
        </div>
      </div>
      
      <div className="py-5 space-y-4 text-sm">
        <div className="flex items-start text-gray-700">
          <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center mr-3 shrink-0">
            <MapPin size={18} />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-base">{local?.nombre || 'Local de Votación'}</p>
            <p className="text-xs text-gray-500 mt-0.5">{local?.direccion || 'Dirección registrada'}</p>
            <p className="text-xs font-semibold text-red-700 mt-0.5">{local?.distrito_nombre || 'Huamanga'}</p>
          </div>
        </div>
        
        <div className="flex items-center text-gray-700 pt-2 border-t border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center mr-3 shrink-0">
            <Users size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Padrón de Electores Hábiles</p>
            <p className="font-black text-gray-900 text-base">
              {mesa.total_electores_habiles || 300} electores
              <span className="text-xs font-normal text-gray-500 ml-1">(máx. 300 votos)</span>
            </p>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100 space-y-3">
        {(estadoMesa === 'observada' || resultadoObj?.estado === 'observado' || resultadoObj?.estado === 'observada') ? (
          <>
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-left space-y-1">
              <p className="font-extrabold text-red-900 text-xs flex items-center gap-1.5">
                <AlertCircle size={15} className="text-red-600" />
                Acta Observada por el Coordinador:
              </p>
              <p className="text-xs text-red-700 font-medium">
                {resultadoObj?.observaciones_coordinador || 'Por favor revise y corrija las cantidades ingresadas.'}
              </p>
            </div>
            <Button 
              size="lg" 
              variant="danger"
              className="w-full text-base font-black py-3.5 shadow-md"
              onClick={() => navigate(`/personero/cargar-resultado?tipo=${tipo}`)}
            >
              ✏️ Corregir y Reenviar Acta
            </Button>
          </>
        ) : ((estadoMesa === 'pendiente' || !estadoMesa) && !resultadoObj) ? (
          <Button 
            size="lg" 
            className="w-full text-base font-black py-3.5 shadow-lg"
            onClick={() => navigate(`/personero/cargar-resultado?tipo=${tipo}`)}
          >
            📸 Cargar Resultados de Acta
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
              <p className="text-xs font-bold text-amber-900">
                {estadoMesa === 'verificada' ? '✅ Acta verificada oficialmente' : '⏳ Acta transmitida — En espera de validación'}
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                No se permite volver a enviar datos mientras esté en revisión o haya sido aprobada.
              </p>
            </div>
            <Button 
              size="lg" 
              variant="secondary"
              className="w-full text-base font-bold py-3.5 shadow-sm"
              onClick={() => navigate('/personero/estado')}
            >
              Ver Estado de Transmisión
            </Button>
          </div>
        )}
      </div>
    </Card>
  );

  return (
    <div className="max-w-md mx-auto space-y-6">
      {data?.tiene_distrital ? (
        <>
          {renderActaCard('🏛️ Acta Provincial', 'provincial', mesa.estado, data.resultado_provincial || data.resultado)}
          {renderActaCard('🏘️ Acta Distrital', 'distrital', mesa.estado_distrital, data.resultado_distrital)}
        </>
      ) : (
        renderActaCard('🏛️ Acta Provincial', 'provincial', mesa.estado, data.resultado_provincial || data.resultado)
      )}
    </div>
  );
};

export default MiMesaPage;
