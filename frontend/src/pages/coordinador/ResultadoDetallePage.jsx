import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get, put } from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

const ResultadoDetallePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [obsModalOpen, setObsModalOpen] = useState(false);
  const [observacion, setObservacion] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchDetalle();
  }, [id]);

  const fetchDetalle = async () => {
    try {
      const res = await get(`/resultados/${id}`);
      setResultado(res.data?.data || res.data);
    } catch (error) {
      toast.error('Error al cargar detalle');
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = async () => {
    if (!window.confirm('¿Estás seguro de APROBAR esta acta?')) return;
    setActionLoading(true);
    try {
      await put(`/resultados/${id}/verificar`);
      toast.success('Acta verificada correctamente');
      fetchDetalle(); // reload state
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al verificar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleObservar = async () => {
    if (!observacion.trim()) {
      toast.error('Debe ingresar una observación');
      return;
    }
    setActionLoading(true);
    try {
      await put(`/resultados/${id}/observar`, { observacion });
      toast.success('Acta observada');
      setObsModalOpen(false);
      fetchDetalle(); // reload state
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al observar');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Spinner /></div>;
  if (!resultado) return <div>No se encontró el resultado</div>;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="secondary" onClick={() => navigate(-1)}>Volver</Button>
        <h1 className="text-2xl font-bold text-gray-900">Detalle de Resultado</h1>
        <Badge variant={resultado.estado}>{resultado.estado}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Info y Votos */}
        <div className="space-y-6">
          <Card title="Información de la Mesa">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="font-semibold">Mesa:</span> {resultado.numero_mesa}</div>
              <div><span className="font-semibold">Local:</span> {resultado.local_nombre}</div>
              <div><span className="font-semibold">Personero:</span> {resultado.personero_nombre}</div>
              <div><span className="font-semibold">Fecha/Hora:</span> {new Date(resultado.fecha_registro).toLocaleString()}</div>
              <div><span className="font-semibold">Electores Hábiles:</span> {resultado.electores_habiles}</div>
              <div><span className="font-semibold">Total Votos:</span> {resultado.total_votos}</div>
            </div>
            {resultado.observaciones_personero && (
              <div className="mt-4 p-3 bg-gray-50 border rounded text-sm text-gray-700">
                <span className="font-semibold">Observación del Personero:</span>
                <p>{resultado.observaciones_personero}</p>
              </div>
            )}
             {resultado.estado === 'observada' && resultado.observaciones_coordinador && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <span className="font-semibold text-red-900">Observado por Coordinador:</span>
                <p>{resultado.observaciones_coordinador}</p>
              </div>
            )}
          </Card>

          <Card title="Votos">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <tbody className="divide-y divide-gray-200">
                {resultado.votos_candidatos?.map((v, i) => (
                  <tr key={i}>
                    <td className="py-2 font-medium text-gray-900">{v.nombre} ({v.organizacion})</td>
                    <td className="py-2 text-right font-bold">{v.votos}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50">
                  <td className="py-2 font-medium">Votos en Blanco</td>
                  <td className="py-2 text-right font-bold">{resultado.votos_blanco}</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-2 font-medium">Votos Nulos</td>
                  <td className="py-2 text-right font-bold">{resultado.votos_nulos}</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-2 font-medium">Votos Impugnados</td>
                  <td className="py-2 text-right font-bold">{resultado.votos_impugnados}</td>
                </tr>
              </tbody>
            </table>
          </Card>
        </div>

        {/* Foto y Acciones */}
        <div className="space-y-6">
          <Card title="Foto del Acta">
             <div className="flex justify-center border bg-gray-100 p-2 min-h-[400px]">
              {resultado.foto_acta_url ? (
                <img src={resultado.foto_acta_url} alt="Acta" className="max-w-full h-auto object-contain" />
              ) : (
                <div className="text-gray-500 self-center">No hay foto disponible</div>
              )}
            </div>
          </Card>

          {resultado.estado === 'reportada' && (
            <div className="flex flex-col sm:flex-row gap-4 p-4 bg-white rounded-lg shadow border-t-4 border-indigo-500">
              <Button 
                variant="success" 
                size="lg" 
                className="flex-1"
                onClick={handleAprobar}
                isLoading={actionLoading}
              >
                ✅ Aprobar Acta
              </Button>
              <Button 
                variant="danger" 
                size="lg" 
                className="flex-1"
                onClick={() => setObsModalOpen(true)}
                disabled={actionLoading}
              >
                ⚠️ Observar
              </Button>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={obsModalOpen} onClose={() => setObsModalOpen(false)} title="Observar Acta">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Indique el motivo por el cual el acta está siendo observada. El personero deberá corregirla.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de observación</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
              rows="4"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Ej. Suma incorrecta, foto borrosa, etc."
            ></textarea>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setObsModalOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleObservar} isLoading={actionLoading}>Confirmar Observación</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ResultadoDetallePage;
