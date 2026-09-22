import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get, put } from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { CheckCircle2, AlertTriangle, ArrowLeft, Maximize2, ShieldCheck } from 'lucide-react';

const ResultadoDetallePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [obsModalOpen, setObsModalOpen] = useState(false);
  const [zoomModalOpen, setZoomModalOpen] = useState(false);
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
    if (!window.confirm('¿Confirmas que los votos coinciden con el acta física y deseas APROBAR el resultado como VÁLIDO?')) return;
    setActionLoading(true);
    try {
      await put(`/resultados/${id}/verificar`);
      toast.success('✅ ¡Acta verificada y aprobada correctamente!');
      fetchDetalle();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al verificar el acta');
    } finally {
      setActionLoading(false);
    }
  };

  const handleObservar = async () => {
    if (!observacion.trim()) {
      toast.error('Debe indicar el motivo de la observación');
      return;
    }
    setActionLoading(true);
    try {
      await put(`/resultados/${id}/observar`, { observacion: observacion.trim() });
      toast.success('⚠️ Acta observada. El personero ha sido notificado para corregirla.');
      setObsModalOpen(false);
      setObservacion('');
      fetchDetalle();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al observar el acta');
    } finally {
      setActionLoading(false);
    }
  };

  const quickReasons = [
    'Suma de votos no coincide con el total',
    'Fotografía borrosa o ilegible',
    'Acta cortada o datos incompletos',
    'Número de mesa erróneo',
    'Discrepancia en votos de candidatos'
  ];

  if (loading) return <div className="flex justify-center p-8"><Spinner text="Cargando detalle del acta..." /></div>;
  if (!resultado) return <div className="p-8 text-center text-gray-600">No se encontró el resultado de esta acta</div>;

  const rawUrl = resultado.foto_acta_url_presigned || resultado.foto_acta_url;
  const photoUrl = rawUrl
    ? (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`)
    : null;

  const estadoNorm = (resultado.estado || '').toLowerCase();
  const estadoMesaNorm = (resultado.estado_mesa || '').toLowerCase();

  const estaVerificada = estadoNorm === 'verificado' || estadoNorm === 'verificada' || estadoMesaNorm === 'verificada';
  const estaObservada = estadoNorm === 'observado' || estadoNorm === 'observada' || estadoMesaNorm === 'observada';

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate(-1)} className="flex items-center">
            <ArrowLeft size={16} className="mr-1.5" />
            Volver
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              {resultado.tipo_eleccion && (
                <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded text-white ${
                  resultado.tipo_eleccion === 'distrital' ? 'bg-purple-600' : 'bg-blue-600'
                }`}>
                  ACTA {resultado.tipo_eleccion === 'distrital' ? 'DISTRITAL' : 'PROVINCIAL'}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              Acta de Escrutinio • Mesa {resultado.numero_mesa}
            </h1>
            <p className="text-xs text-gray-500">
              {resultado.local_nombre} • Transmitido: {resultado.fecha_registro ? new Date(resultado.fecha_registro).toLocaleString() : 'Reciente'}
            </p>
          </div>
        </div>
        <div>
          <Badge variant={estaVerificada ? 'verificada' : estaObservada ? 'observada' : 'reportada'} className="text-sm px-3 py-1 font-bold">
            {estaVerificada ? 'Acta Verificada' : estaObservada ? 'Acta Observada' : 'Pendiente de Validación'}
          </Badge>
        </div>
      </div>

      {estaVerificada && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-3 text-emerald-900 shadow-sm">
          <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
          <div>
            <p className="font-bold text-sm">Acta validada y aprobada</p>
            <p className="text-xs text-emerald-700">Esta acta de escrutinio ha sido contrastada con la fotografía oficial y computada oficialmente en el sistema.</p>
          </div>
        </div>
      )}

      {estaObservada && (
        <div className="p-4 bg-red-50 border border-red-300 rounded-xl flex items-start gap-3 text-red-900 shadow-sm">
          <AlertTriangle size={24} className="text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-sm">Acta Declinada / Observada por Coordinador</p>
            <p className="text-xs text-red-800 bg-white/70 p-2 rounded border border-red-200 font-medium">
              Motivo: {resultado.observaciones_coordinador || 'Se solicitó corrección al personero.'}
            </p>
            <p className="text-xs text-red-600">El personero tiene habilitada la opción de subsanar y reenviar los resultados de esta mesa.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card title="Información de la Mesa">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-2 bg-gray-50 rounded">
                <span className="font-semibold text-gray-500 text-xs block">Número de Mesa</span>
                <span className="font-black text-gray-900 text-lg">Mesa {resultado.numero_mesa}</span>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <span className="font-semibold text-gray-500 text-xs block">Local de Votación</span>
                <span className="font-bold text-gray-900 text-sm truncate block" title={resultado.local_nombre}>{resultado.local_nombre}</span>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <span className="font-semibold text-gray-500 text-xs block">Personero Asignado</span>
                <span className="font-semibold text-gray-800 text-sm block">{resultado.personero_nombre || 'No registrado'}</span>
                <span className="text-xs text-gray-500 font-mono">DNI: {resultado.personero_dni || '-'}</span>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <span className="font-semibold text-gray-500 text-xs block">Total Votos Emitidos</span>
                <span className="font-black text-red-700 text-lg">{resultado.total_votos || 0}</span>
                <span className="text-[11px] text-gray-500 block">Padrón: {resultado.electores_habiles || 300} electores (máx. 300)</span>
              </div>
            </div>

            {resultado.observaciones_personero && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
                <span className="font-bold block mb-0.5">Nota enviada por el Personero:</span>
                <p>{resultado.observaciones_personero}</p>
              </div>
            )}
          </Card>

          <Card title="Votos por Candidato / Organización Política">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase">
                  <th className="py-2 text-left">Lista / Candidato</th>
                  <th className="py-2 text-right">Votos Digitados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {resultado.votos_candidatos?.map((v, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-2.5 font-medium text-gray-900">
                      <div>{v.nombre}</div>
                      <div className="text-xs text-gray-500">{v.organizacion}</div>
                    </td>
                    <td className="py-2.5 text-right font-black text-base text-gray-900">{v.votos}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50/70">
                  <td className="py-2 font-medium text-gray-700">Votos en Blanco</td>
                  <td className="py-2 text-right font-bold text-gray-700">{resultado.votos_blanco}</td>
                </tr>
                <tr className="bg-gray-50/70">
                  <td className="py-2 font-medium text-gray-700">Votos Nulos</td>
                  <td className="py-2 text-right font-bold text-gray-700">{resultado.votos_nulos}</td>
                </tr>
                <tr className="bg-gray-50/70">
                  <td className="py-2 font-medium text-gray-700">Votos Impugnados</td>
                  <td className="py-2 text-right font-bold text-gray-700">{resultado.votos_impugnados}</td>
                </tr>
                <tr className="bg-red-50 border-t-2 border-red-200">
                  <td className="py-2.5 font-black text-gray-900 text-sm">TOTAL COMPUTADO</td>
                  <td className="py-2.5 text-right font-black text-red-700 text-lg">{resultado.total_votos || 0}</td>
                </tr>
              </tbody>
            </table>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Fotografía del Acta Física">
            <div className="relative group border border-gray-300 rounded-xl overflow-hidden bg-gray-900 min-h-[420px] flex items-center justify-center">
              {photoUrl ? (
                <>
                  <img 
                    src={photoUrl} 
                    alt="Foto del Acta Oficial" 
                    className="max-h-[520px] w-auto object-contain cursor-zoom-in transition-transform duration-200 hover:scale-[1.01]" 
                    onClick={() => setZoomModalOpen(true)}
                  />
                  <button
                    onClick={() => setZoomModalOpen(true)}
                    className="absolute bottom-3 right-3 bg-black/75 hover:bg-black text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 backdrop-blur shadow"
                  >
                    <Maximize2 size={14} />
                    Ampliar Fotografía
                  </button>
                </>
              ) : (
                <div className="text-gray-400 p-8 text-center text-sm">
                  <AlertTriangle size={32} className="mx-auto mb-2 text-amber-500" />
                  No se pudo cargar la imagen del acta o no fue enviada.
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              💡 Haz clic sobre la imagen para abrir el visor ampliado y verificar números con precisión.
            </p>
          </Card>

          <div className="p-5 bg-white rounded-xl shadow-md border-2 border-gray-200 space-y-3">
            <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
              <ShieldCheck className="text-red-600" size={20} />
              Validación de Acta Oficial
            </h3>
            <p className="text-xs text-gray-600">
              Verifica minuciosamente que la suma de votos y los totales digitados coincidan con el documento firmado por los miembros de mesa.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Button 
                variant="success" 
                size="lg" 
                className="w-full py-3 font-extrabold text-sm shadow flex items-center justify-center gap-2"
                onClick={handleAprobar}
                isLoading={actionLoading}
                disabled={estaVerificada}
              >
                <CheckCircle2 size={18} />
                {estaVerificada ? 'Acta Ya Aprobada' : 'Aprobar Acta (Válida)'}
              </Button>

              <Button 
                variant="danger" 
                size="lg" 
                className="w-full py-3 font-extrabold text-sm shadow flex items-center justify-center gap-2"
                onClick={() => setObsModalOpen(true)}
                disabled={actionLoading}
              >
                <AlertTriangle size={18} />
                Observar / Declinar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={zoomModalOpen} onClose={() => setZoomModalOpen(false)} title={`Acta Oficial - Mesa ${resultado.numero_mesa}`} size="full">
        <div className="flex flex-col items-center justify-center bg-gray-950 p-4 rounded-xl min-h-[75vh]">
          {photoUrl && (
            <img 
              src={photoUrl} 
              alt="Acta Completa" 
              className="max-h-[85vh] w-auto object-contain rounded shadow-2xl"
            />
          )}
          <div className="mt-4 flex gap-4">
            <a 
              href={photoUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition-colors"
            >
              Abrir archivo original en nueva pestaña ↗
            </a>
            <Button variant="secondary" onClick={() => setZoomModalOpen(false)}>
              Cerrar Visor
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={obsModalOpen} onClose={() => setObsModalOpen(false)} title="Observar / Declinar Acta Electoral">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            Indica el motivo exacto por el cual esta acta no es válida. El personero de la mesa recibirá una notificación inmediata y se le habilitará la pantalla para corregir y reenviar los datos.
          </p>

          <div>
            <span className="text-xs font-bold text-gray-700 block mb-1.5">Motivos Frecuentes (selección rápida):</span>
            <div className="flex flex-wrap gap-1.5">
              {quickReasons.map((reason, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setObservacion(reason)}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-red-50 hover:text-red-700 hover:border-red-300 border border-gray-200 rounded-full text-xs text-gray-700 transition-colors"
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">Detalle de la Observación *</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
              rows="4"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Ej. La suma de votos en la foto es 280 pero se digitaron 300 votos. Por favor volver a sumar."
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-gray-200">
            <Button variant="secondary" onClick={() => setObsModalOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleObservar} isLoading={actionLoading}>Confirmar Observación</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ResultadoDetallePage;
