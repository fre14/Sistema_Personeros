import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { Camera, ChevronLeft, Save, CheckCircle, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { compressImage, formatFileSize } from '../../utils/imageCompressor';

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
        // Fetch candidatos
        const resCandidatos = await api.get('/candidatos');
        const candidatosList = resCandidatos.data.data || resCandidatos.data;
        setCandidatos(candidatosList);

        const initialVotos = {};
        candidatosList.forEach(c => initialVotos[c.id] = '');
        setVotos(initialVotos);

        // Fetch mesa info
        try {
          const resMesa = await api.get('/resultados/mi-mesa');
          setMesaInfo(resMesa.data.data || resMesa.data);
        } catch (e) {
          console.warn('No se pudo obtener info de mesa:', e);
        }
      } catch (error) {
        console.error(error);
        toast.error('Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Compresión automática al seleccionar foto
  const handlePhotoCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar que sea imagen
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor seleccione una imagen');
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

      toast.success('Foto comprimida automáticamente');
    } catch (error) {
      console.error('Error al comprimir:', error);
      // Fallback: usar original
      setFotoFile(file);
      setFotoPreview(URL.createObjectURL(file));
      setCompressionInfo(null);
      toast('Foto cargada sin comprimir', { icon: '⚠️' });
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

  const calculateTotal = () => {
    const sumCandidatos = Object.values(votos).reduce((acc, val) => acc + (parseInt(val) || 0), 0);
    return sumCandidatos +
      (parseInt(votosBlanco) || 0) +
      (parseInt(votosNulos) || 0) +
      (parseInt(votosImpugnados) || 0);
  };

  const totalVotos = calculateTotal();
  const electoresHabiles = mesaInfo?.total_electores_habiles || 0;
  const excedeLimite = electoresHabiles > 0 && totalVotos > electoresHabiles;

  const handleSubmit = async () => {
    if (excedeLimite) {
      toast.error(`El total de votos (${totalVotos}) excede los electores hábiles (${electoresHabiles})`);
      return;
    }

    setSubmitting(true);
    try {
      // Construir FormData para enviar foto + datos
      const formData = new FormData();

      if (fotoFile) {
        formData.append('foto_acta', fotoFile);
      }

      if (mesaInfo?.id) {
        formData.append('mesa_id', mesaInfo.id);
      }

      // Votos por candidato como JSON
      const votosArray = Object.entries(votos).map(([id, cant]) => ({
        candidato_id: parseInt(id),
        votos: parseInt(cant) || 0
      }));
      formData.append('votos', JSON.stringify(votosArray));

      formData.append('votos_blanco', parseInt(votosBlanco) || 0);
      formData.append('votos_nulo', parseInt(votosNulos) || 0);
      formData.append('votos_impugnados', parseInt(votosImpugnados) || 0);
      formData.append('total_cedulas_votacion', parseInt(totalCedulas) || totalVotos);
      formData.append('total_votos_emitidos', totalVotos);

      if (observaciones) {
        formData.append('observaciones_personero', observaciones);
      }

      await api.post('/resultados', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000, // 60 segundos para subir foto
      });

      toast.success('✅ Resultado enviado correctamente');
      navigate('/personero/estado');
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al enviar resultado';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Spinner text="Cargando datos..." /></div>;

  return (
    <div className="max-w-md mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center mb-4">
        {step > 1 && (
          <button onClick={() => setStep(step - 1)} className="flex items-center p-2 -ml-2 text-blue-600 font-medium">
            <ChevronLeft size={20} /> Atrás
          </button>
        )}
        <span className="ml-auto text-sm text-gray-500">Paso {step} de 3</span>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1 mb-6">
        {[1, 2, 3].map(s => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
        ))}
      </div>

      {/* PASO 1: FOTO DEL ACTA */}
      {step === 1 && (
        <Card title="📸 Foto del Acta de Escrutinio">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Tome una foto clara del acta. La imagen se comprimirá automáticamente.
            </p>

            {compressing ? (
              <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
                <Spinner text="Comprimiendo imagen..." />
              </div>
            ) : fotoPreview ? (
              <div className="relative">
                <img src={fotoPreview} alt="Acta" className="w-full h-auto rounded-lg border border-gray-300 shadow" />
                <button
                  onClick={clearPhoto}
                  className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg"
                >
                  Cambiar foto
                </button>

                {/* Info de compresión */}
                {compressionInfo && (
                  <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                      <CheckCircle size={16} />
                      Imagen comprimida automáticamente
                    </div>
                    <div className="text-xs text-green-600 mt-1 space-y-0.5">
                      <p>Original: {formatFileSize(compressionInfo.original)}</p>
                      <p>Comprimida: {formatFileSize(compressionInfo.compressed)}</p>
                      <p className="font-semibold">Ahorro: {compressionInfo.saved}%</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50 cursor-pointer hover:bg-blue-100 active:bg-blue-200 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Camera size={48} className="text-blue-500 mb-3" />
                  <p className="text-base text-blue-600 font-semibold">Tocar para tomar foto</p>
                  <p className="text-xs text-blue-400 mt-1">o seleccionar de galería</p>
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
              Continuar a Votos →
            </Button>
          </div>
        </Card>
      )}

      {/* PASO 2: REGISTRO DE VOTOS */}
      {step === 2 && (
        <Card title="✏️ Registro de Votos">
          <div className="space-y-4">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-2">
              <p className="text-xs text-yellow-700">
                Ingrese exactamente los mismos números que aparecen en el acta física.
              </p>
            </div>

            {/* Votos por candidato */}
            {candidatos.map(c => (
              <div key={c.id} className="flex items-center justify-between py-3 border-b border-gray-100">
                <div className="flex-1 pr-3">
                  <p className="font-medium text-sm text-gray-900">{c.nombre_completo || c.nombre}</p>
                  <p className="text-xs text-gray-500">{c.organizacion_politica || c.organizacion}</p>
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  className="w-20 text-center text-lg py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold"
                  placeholder="0"
                  value={votos[c.id]}
                  onChange={(e) => setVotos({ ...votos, [c.id]: e.target.value })}
                />
              </div>
            ))}

            {/* Blancos, nulos, impugnados */}
            <div className="pt-4 space-y-3 border-t-2 border-gray-200 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Votos en Blanco</span>
                <input type="number" inputMode="numeric" min="0" className="w-20 text-center py-2.5 border-2 border-gray-300 rounded-lg font-bold" placeholder="0" value={votosBlanco} onChange={e => setVotosBlanco(e.target.value)} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Votos Nulos</span>
                <input type="number" inputMode="numeric" min="0" className="w-20 text-center py-2.5 border-2 border-gray-300 rounded-lg font-bold" placeholder="0" value={votosNulos} onChange={e => setVotosNulos(e.target.value)} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Votos Impugnados</span>
                <input type="number" inputMode="numeric" min="0" className="w-20 text-center py-2.5 border-2 border-gray-300 rounded-lg font-bold" placeholder="0" value={votosImpugnados} onChange={e => setVotosImpugnados(e.target.value)} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Total Cédulas</span>
                <input type="number" inputMode="numeric" min="0" className="w-20 text-center py-2.5 border-2 border-gray-300 rounded-lg font-bold" placeholder="0" value={totalCedulas} onChange={e => setTotalCedulas(e.target.value)} />
              </div>
            </div>

            {/* Total calculado */}
            <div className={`p-4 rounded-lg mt-4 flex justify-between items-center ${excedeLimite ? 'bg-red-50 border border-red-300' : 'bg-gray-100'}`}>
              <span className="font-bold text-gray-700">Total Votos:</span>
              <span className={`text-2xl font-bold ${excedeLimite ? 'text-red-600' : 'text-blue-600'}`}>
                {totalVotos}
              </span>
            </div>

            {excedeLimite && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700">
                  El total ({totalVotos}) excede los electores hábiles ({electoresHabiles}). Verifique los datos.
                </p>
              </div>
            )}

            {electoresHabiles > 0 && !excedeLimite && (
              <p className="text-xs text-gray-400 text-center">
                Electores hábiles en esta mesa: {electoresHabiles}
              </p>
            )}

            <Button className="w-full mt-6" onClick={() => setStep(3)} disabled={excedeLimite}>
              Revisar y Confirmar →
            </Button>
          </div>
        </Card>
      )}

      {/* PASO 3: CONFIRMACIÓN */}
      {step === 3 && (
        <Card title="📋 Confirmación Final">
          <div className="space-y-4 text-sm">
            {/* Resumen foto */}
            {fotoPreview && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <ImageIcon size={20} className="text-green-600" />
                <div>
                  <p className="font-medium text-gray-800">Foto del acta adjunta</p>
                  {compressionInfo && (
                    <p className="text-xs text-gray-500">{formatFileSize(compressionInfo.compressed)}</p>
                  )}
                </div>
                <CheckCircle size={16} className="text-green-500 ml-auto" />
              </div>
            )}

            {/* Resumen votos */}
            <div className="divide-y divide-gray-100">
              {candidatos.map(c => (
                <div key={c.id} className="flex justify-between py-2">
                  <span className="text-gray-600">{c.nombre_completo || c.nombre}</span>
                  <span className="font-bold">{parseInt(votos[c.id]) || 0}</span>
                </div>
              ))}
              <div className="flex justify-between py-2">
                <span className="text-gray-600">En Blanco</span>
                <span className="font-bold">{parseInt(votosBlanco) || 0}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Nulos</span>
                <span className="font-bold">{parseInt(votosNulos) || 0}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Impugnados</span>
                <span className="font-bold">{parseInt(votosImpugnados) || 0}</span>
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg flex justify-between items-center">
              <span className="font-bold text-blue-800">TOTAL:</span>
              <span className="text-2xl font-bold text-blue-700">{totalVotos}</span>
            </div>

            {/* Observaciones */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones (Opcional)</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
                placeholder="Escriba aquí si hubo alguna incidencia..."
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
              />
            </div>

            {/* Botón enviar */}
            <div className="bg-blue-50 p-4 rounded-lg mt-6">
              <p className="text-xs text-blue-800 text-center mb-4">
                Al enviar, declaro bajo juramento que los datos ingresados son copia fiel del acta original.
              </p>
              <Button
                className="w-full flex justify-center items-center h-14 text-lg font-bold shadow-lg"
                onClick={handleSubmit}
                isLoading={submitting}
                disabled={submitting}
              >
                <Save className="mr-2" size={22} /> ENVIAR RESULTADOS
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CargarResultadoPage;
