import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { Camera, ChevronLeft, Save, CheckCircle, AlertTriangle, Image as ImageIcon, ShieldAlert } from 'lucide-react';
import { compressImage, formatFileSize } from '../../utils/imageCompressor';

const MAXIMO_VOTOS_POR_MESA = 300;

const CargarResultadoPage = () => {
  const [step, setStep] = useState(1);
  const [candidatos, setCandidatos] = useState([]);
  const [mesaInfo, setMesaInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const navigate = useNavigate();

  // Form state
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [compressionInfo, setCompressionInfo] = useState(null);
  const [votos, setVotos] = useState({});
  const [votosBlanco, setVotosBlanco] = useState('');
  const [votosNulos, setVotosNulos] = useState('');
  const [votosImpugnados, setVotosImpugnados] = useState('');
  const [totalCedulas, setTotalCedulas] = useState('');
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch candidatos ordenados por número de lista
        const resCandidatos = await api.get('/candidatos');
        const candidatosList = resCandidatos.data?.data || resCandidatos.data || [];
        const sorted = [...candidatosList].sort((a, b) => (a.numero_lista || 0) - (b.numero_lista || 0));
        setCandidatos(sorted);

        const initialVotos = {};
        sorted.forEach(c => initialVotos[c.id] = '');
        setVotos(initialVotos);

        // Fetch info de la mesa asignada al personero
        try {
          const resMesa = await api.get('/resultados/mi-mesa');
          const dataMesa = resMesa.data?.data || resMesa.data;
          setMesaInfo(dataMesa?.mesa || dataMesa);
        } catch (e) {
          console.warn('No se pudo obtener info de mesa:', e);
        }
      } catch (error) {
        console.error(error);
        toast.error('Error al cargar datos del formulario');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Compresión automática al tomar o seleccionar foto del acta física
  const handlePhotoCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor seleccione un archivo de imagen válido');
      return;
    }

    setCompressing(true);
    try {
      const result = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.7,
        maxSizeKB: 400,
      });

      setFotoFile(result.file);
      setFotoPreview(result.preview);
      setCompressionInfo({
        original: result.originalSize,
        compressed: result.compressedSize,
        saved: Math.round((1 - result.compressedSize / result.originalSize) * 100),
      });

      toast.success('Foto del acta comprimida y lista');
    } catch (error) {
      console.error('Error al comprimir:', error);
      setFotoFile(file);
      setFotoPreview(URL.createObjectURL(file));
      setCompressionInfo(null);
      toast('Foto cargada sin compresión', { icon: '⚠️' });
    } finally {
      setCompressing(false);
    }
  };

  const clearPhoto = () => {
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    setFotoFile(null);
    setFotoPreview(null);
    setCompressionInfo(null);
  };

  // Cálculo en tiempo real de los votos emitidos
  const calculateTotal = () => {
    const sumCandidatos = Object.values(votos).reduce((acc, val) => acc + (parseInt(val, 10) || 0), 0);
    return sumCandidatos +
      (parseInt(votosBlanco, 10) || 0) +
      (parseInt(votosNulos, 10) || 0) +
      (parseInt(votosImpugnados, 10) || 0);
  };

  const totalVotos = calculateTotal();
  const electoresHabiles = mesaInfo?.total_electores_habiles || 300;
  
  // Validación estricta: No puede superar los 300 votos por mesa
  const excedeLimite300 = totalVotos > MAXIMO_VOTOS_POR_MESA;
  const excedeElectores = electoresHabiles > 0 && totalVotos > electoresHabiles;
  const excedeCualquierLimite = excedeLimite300 || excedeElectores;

  const handleSubmit = async () => {
    if (totalVotos <= 0) {
      toast.error('Debe ingresar los votos antes de transmitir');
      return;
    }

    if (excedeLimite300) {
      toast.error(`❌ El total de votos (${totalVotos}) excede el límite máximo de 300 votos por mesa`);
      return;
    }

    if (excedeElectores) {
      toast.error(`❌ El total de votos (${totalVotos}) excede los electores hábiles (${electoresHabiles}) de esta mesa`);
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();

      if (fotoFile) {
        formData.append('foto_acta', fotoFile);
      }

      if (mesaInfo?.id) {
        formData.append('mesa_id', mesaInfo.id);
      }

      // Votos por candidato en formato JSON
      const votosArray = Object.entries(votos).map(([id, cant]) => ({
        candidato_id: parseInt(id, 10),
        votos: parseInt(cant, 10) || 0
      }));
      formData.append('votos', JSON.stringify(votosArray));

      formData.append('votos_blanco', parseInt(votosBlanco, 10) || 0);
      formData.append('votos_nulo', parseInt(votosNulos, 10) || 0);
      formData.append('votos_impugnados', parseInt(votosImpugnados, 10) || 0);
      formData.append('total_cedulas_votacion', parseInt(totalCedulas, 10) || totalVotos);
      formData.append('total_votos_emitidos', totalVotos);

      if (observaciones) {
        formData.append('observaciones_personero', observaciones);
      }

      await api.post('/resultados', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });

      toast.success('✅ ¡Acta y resultados transmitidos con éxito!');
      navigate('/personero/estado');
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al enviar resultados';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Spinner text="Cargando datos de mesa..." /></div>;

  return (
    <div className="max-w-lg mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center mb-4">
        {step > 1 && (
          <button 
            onClick={() => setStep(step - 1)} 
            className="flex items-center p-2 -ml-2 text-red-700 font-bold hover:text-red-900 transition-colors"
          >
            <ChevronLeft size={20} /> Atrás
          </button>
        )}
        <div className="ml-auto text-xs font-semibold px-2.5 py-1 bg-red-100 text-red-800 rounded-full">
          Paso {step} de 3
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map(s => (
          <div 
            key={s} 
            className={`h-2 flex-1 rounded-full transition-all duration-300 ${
              s <= step ? 'bg-red-600' : 'bg-gray-200'
            }`} 
          />
        ))}
      </div>

      {/* PASO 1: FOTO DEL ACTA */}
      {step === 1 && (
        <Card title="📸 Paso 1: Foto del Acta de Escrutinio">
          <div className="space-y-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              Tome una fotografía nítida y legible del <strong>Acta de Escrutinio</strong> firmada por los miembros de mesa. La imagen se optimizará automáticamente.
            </p>

            {compressing ? (
              <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-red-300 rounded-lg bg-red-50">
                <Spinner text="Optimizando foto para transmisión rápida..." />
              </div>
            ) : fotoPreview ? (
              <div className="relative">
                <img 
                  src={fotoPreview} 
                  alt="Acta Electoral" 
                  className="w-full h-auto rounded-lg border border-gray-300 shadow-md object-contain max-h-96" 
                />
                <button
                  onClick={clearPhoto}
                  className="absolute top-2 right-2 bg-red-700 hover:bg-red-800 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg transition-colors"
                >
                  Cambiar foto
                </button>

                {compressionInfo && (
                  <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-700 text-sm font-semibold">
                      <CheckCircle size={16} />
                      Foto optimizada para subida móvil
                    </div>
                    <div className="text-xs text-green-600 mt-1 space-y-0.5">
                      <p>Tamaño: {formatFileSize(compressionInfo.compressed)} (Ahorro del {compressionInfo.saved}%)</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-red-300 rounded-lg bg-red-50/50 cursor-pointer hover:bg-red-100/50 active:bg-red-200/50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
                    <Camera size={32} />
                  </div>
                  <p className="text-base text-red-700 font-bold">Tomar foto del Acta</p>
                  <p className="text-xs text-red-400 mt-1">o seleccionar desde la galería</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoCapture}
                />
              </label>
            )}

            <Button
              className="w-full mt-4"
              onClick={() => setStep(2)}
              disabled={!fotoFile}
            >
              Continuar al Registro de Votos →
            </Button>
          </div>
        </Card>
      )}

      {/* PASO 2: REGISTRO DE VOTOS */}
      {step === 2 && (
        <Card title="✏️ Paso 2: Registro de Votos">
          <div className="space-y-4">
            {/* Advertencia de límite de 300 votos */}
            <div className="bg-red-50 border-l-4 border-red-600 p-3 rounded-r-lg">
              <p className="text-xs text-red-900 font-medium">
                ⚠️ <strong>Reglamento Electoral:</strong> El total de votos emitidos por mesa <strong>no puede exceder los 300 votos</strong>. Transcriba con exactitud cada cifra del acta física.
              </p>
            </div>

            {/* Votos por cada lista o candidato */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                Votos por Partido / Organización Política (9 Listas)
              </p>

              {candidatos.map((c) => (
                <div 
                  key={c.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-red-300 transition-colors"
                >
                  <div className="flex items-center space-x-3 flex-1 pr-2">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-red-700 text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
                      {c.numero_lista}
                    </span>
                    <div className="truncate">
                      <p className="font-bold text-sm text-gray-900 truncate leading-snug">
                        {c.nombre_completo}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {c.organizacion_politica} {c.siglas ? `(${c.siglas})` : ''}
                      </p>
                    </div>
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="300"
                    className="w-20 text-center text-lg py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-extrabold text-gray-900 bg-white"
                    placeholder="0"
                    value={votos[c.id]}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setVotos({ ...votos, [c.id]: val });
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Blancos, Nulos, Impugnados y Cédulas */}
            <div className="pt-4 border-t-2 border-gray-200 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Otros Votos Electorales
              </p>

              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-sm font-semibold text-gray-700">⚪ Votos en Blanco</span>
                <input 
                  type="number" 
                  inputMode="numeric" 
                  min="0" 
                  max="300"
                  className="w-20 text-center py-2 border-2 border-gray-300 rounded-lg font-bold text-base focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white" 
                  placeholder="0" 
                  value={votosBlanco} 
                  onChange={(e) => setVotosBlanco(e.target.value.replace(/\D/g, ''))} 
                />
              </div>

              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-sm font-semibold text-gray-700">✖️ Votos Nulos</span>
                <input 
                  type="number" 
                  inputMode="numeric" 
                  min="0" 
                  max="300"
                  className="w-20 text-center py-2 border-2 border-gray-300 rounded-lg font-bold text-base focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white" 
                  placeholder="0" 
                  value={votosNulos} 
                  onChange={(e) => setVotosNulos(e.target.value.replace(/\D/g, ''))} 
                />
              </div>

              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-sm font-semibold text-gray-700">⚠️ Votos Impugnados</span>
                <input 
                  type="number" 
                  inputMode="numeric" 
                  min="0" 
                  max="300"
                  className="w-20 text-center py-2 border-2 border-gray-300 rounded-lg font-bold text-base focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white" 
                  placeholder="0" 
                  value={votosImpugnados} 
                  onChange={(e) => setVotosImpugnados(e.target.value.replace(/\D/g, ''))} 
                />
              </div>

              <div className="flex items-center justify-between p-2.5 bg-amber-50/60 rounded-lg border border-amber-200">
                <div>
                  <span className="text-sm font-bold text-amber-900 block">Total Cédulas de Votación</span>
                  <span className="text-xs text-amber-700">Utilizadas en la mesa</span>
                </div>
                <input 
                  type="number" 
                  inputMode="numeric" 
                  min="0" 
                  max="300"
                  className="w-20 text-center py-2 border-2 border-amber-300 rounded-lg font-bold text-base focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white" 
                  placeholder={String(totalVotos || 0)} 
                  value={totalCedulas} 
                  onChange={(e) => setTotalCedulas(e.target.value.replace(/\D/g, ''))} 
                />
              </div>
            </div>

            {/* Contador y Alerta del Total de Votos */}
            <div className={`p-4 rounded-xl mt-4 flex justify-between items-center transition-all ${
              excedeCualquierLimite 
                ? 'bg-red-100 border-2 border-red-500 shadow-sm' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div>
                <span className="font-bold text-gray-800 block text-sm">TOTAL VOTOS EMITIDOS:</span>
                <span className="text-xs text-gray-500">Límite máximo permitido: 300 votos</span>
              </div>
              <div className="text-right">
                <span className={`text-3xl font-black ${excedeCualquierLimite ? 'text-red-700' : 'text-red-600'}`}>
                  {totalVotos}
                </span>
                <span className="text-xs text-gray-500 block">/ 300 máx</span>
              </div>
            </div>

            {/* Mensaje de error bloqueante si supera 300 votos */}
            {excedeLimite300 && (
              <div className="flex items-start gap-2.5 bg-red-100 border-2 border-red-400 rounded-lg p-3 text-red-800">
                <ShieldAlert size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold">LÍMITE MÁXIMO SUPERADO</p>
                  <p className="text-xs mt-0.5 leading-tight">
                    El total de votos ({totalVotos}) excede el límite de <strong>300 votos por mesa</strong>. No es posible continuar hasta que corrija las cantidades ingresadas.
                  </p>
                </div>
              </div>
            )}

            {/* Mensaje si excede electores hábiles de la mesa */}
            {!excedeLimite300 && excedeElectores && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg p-3 text-amber-800">
                <AlertTriangle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs leading-tight">
                  El total ({totalVotos}) excede los electores hábiles registrados para esta mesa ({electoresHabiles}). Por favor verifique el conteo del acta.
                </p>
              </div>
            )}

            <Button 
              className="w-full mt-6" 
              onClick={() => setStep(3)} 
              disabled={excedeCualquierLimite || totalVotos === 0}
            >
              Revisar y Confirmar →
            </Button>
          </div>
        </Card>
      )}

      {/* PASO 3: CONFIRMACIÓN FINAL */}
      {step === 3 && (
        <Card title="📋 Paso 3: Confirmación de Resultados">
          <div className="space-y-4 text-sm">
            {/* Foto adjunta */}
            {fotoPreview && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <ImageIcon size={20} className="text-emerald-600" />
                <div className="flex-1">
                  <p className="font-bold text-gray-800 text-xs">Fotografía del Acta Adjunta</p>
                  {compressionInfo && (
                    <p className="text-xs text-gray-500">{formatFileSize(compressionInfo.compressed)}</p>
                  )}
                </div>
                <CheckCircle size={18} className="text-emerald-500" />
              </div>
            )}

            {/* Resumen de Votos por Partido */}
            <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
              <div className="bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 flex justify-between">
                <span>Partido / Organización</span>
                <span>Votos</span>
              </div>
              {candidatos.map(c => (
                <div key={c.id} className="flex justify-between items-center px-3 py-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-red-700 text-white font-bold flex items-center justify-center text-[10px]">
                      {c.numero_lista}
                    </span>
                    <span className="text-gray-800 font-medium">{c.nombre_completo} ({c.siglas || c.organizacion_politica})</span>
                  </div>
                  <span className="font-black text-sm text-gray-900">{parseInt(votos[c.id], 10) || 0}</span>
                </div>
              ))}
              <div className="flex justify-between px-3 py-2 text-xs bg-gray-50 font-medium">
                <span className="text-gray-600">Votos en Blanco</span>
                <span className="font-bold text-gray-900">{parseInt(votosBlanco, 10) || 0}</span>
              </div>
              <div className="flex justify-between px-3 py-2 text-xs bg-gray-50 font-medium">
                <span className="text-gray-600">Votos Nulos</span>
                <span className="font-bold text-gray-900">{parseInt(votosNulos, 10) || 0}</span>
              </div>
              <div className="flex justify-between px-3 py-2 text-xs bg-gray-50 font-medium">
                <span className="text-gray-600">Votos Impugnados</span>
                <span className="font-bold text-gray-900">{parseInt(votosImpugnados, 10) || 0}</span>
              </div>
            </div>

            {/* Total Destacado */}
            <div className="bg-red-50 p-3 rounded-lg border border-red-200 flex justify-between items-center">
              <div>
                <span className="font-extrabold text-red-900 text-sm block">TOTAL VOTOS EMITIDOS:</span>
                <span className="text-xs text-red-600">Conforme a reglamento (máx. 300)</span>
              </div>
              <span className="text-2xl font-black text-red-700">{totalVotos}</span>
            </div>

            {/* Observaciones opcionales */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Observaciones del Personero (Opcional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-xs"
                rows="2"
                placeholder="Escriba aquí cualquier incidencia o reclamación..."
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
              />
            </div>

            {/* Declaración y Botón Enviar */}
            <div className="bg-red-50/70 p-4 rounded-xl border border-red-200 mt-4 text-center">
              <p className="text-xs text-red-900 mb-3 leading-tight">
                Declaro bajo juramento que los votos ingresados corresponden exactamente al acta de escrutinio suscrita en mi mesa.
              </p>
              <Button
                className="w-full flex justify-center items-center h-12 text-base font-bold shadow-lg"
                onClick={handleSubmit}
                isLoading={submitting}
                disabled={submitting || excedeCualquierLimite}
              >
                <Save className="mr-2" size={20} /> TRANSMITIR RESULTADOS
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CargarResultadoPage;
