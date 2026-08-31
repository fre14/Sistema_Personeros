import React, { useState, useEffect } from 'react';
import { get } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { MapPin, Users } from 'lucide-react';

const MiMesaPage = () => {
  const [mesa, setMesa] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMiMesa = async () => {
      try {
        const res = await get('/personero/mesa');
        setMesa(res.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchMiMesa();
  }, []);

  if (loading) return <div className="flex justify-center mt-20"><Spinner /></div>;

  if (!mesa) {
    return (
      <div className="text-center mt-20 p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold text-gray-800">No tienes mesa asignada</h2>
        <p className="text-gray-600 mt-2">Por favor contacta con tu coordinador para que te asigne una mesa de votación.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <Card>
        <div className="text-center pb-4 border-b">
          <h2 className="text-4xl font-extrabold text-blue-600">Mesa {mesa.numero_mesa}</h2>
          <div className="mt-2 inline-block">
             <Badge variant={mesa.estado}>{mesa.estado}</Badge>
          </div>
        </div>
        
        <div className="py-4 space-y-4">
          <div className="flex items-start text-gray-700">
            <MapPin className="mr-3 text-gray-400 shrink-0 mt-1" />
            <div>
              <p className="font-semibold">{mesa.local_nombre}</p>
              <p className="text-sm text-gray-500">{mesa.local_direccion}</p>
              <p className="text-sm text-gray-500">{mesa.distrito}</p>
            </div>
          </div>
          
          <div className="flex items-center text-gray-700">
            <Users className="mr-3 text-gray-400" />
            <p><span className="font-semibold">{mesa.electores_habiles}</span> electores hábiles</p>
          </div>
        </div>

        <div className="pt-4 border-t">
          {mesa.estado === 'pendiente' ? (
            <Button 
              size="lg" 
              className="w-full text-lg py-3"
              onClick={() => navigate('/personero/cargar-resultado')}
            >
              Cargar Resultados
            </Button>
          ) : (
            <Button 
              size="lg"
              variant="secondary"
              className="w-full text-lg py-3"
              onClick={() => navigate('/personero/estado')}
            >
              Ver Estado
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default MiMesaPage;
