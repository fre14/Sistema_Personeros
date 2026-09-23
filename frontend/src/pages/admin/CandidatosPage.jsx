import React, { useState, useEffect, useMemo } from 'react';
import { get, post, put, del } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';
import { 
  UsersRound, 
  Plus, 
  Edit2, 
  Trash2, 
  MapPin, 
  Building2, 
  CheckCircle2, 
  PowerOff,
  Sparkles
} from 'lucide-react';

const CandidatosPage = () => {
  const [tipoEleccionTab, setTipoEleccionTab] = useState('provincial'); // 'provincial' | 'distrital'
  const [allDistritos, setAllDistritos] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [filtroDistrito, setFiltroDistrito] = useState('');

  const [candidatos, setCandidatos] = useState([]);
  const [candidateCounts, setCandidateCounts] = useState({});
  const [loading, setLoading] = useState(false);

  // Modal Candidato State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCandidato, setEditingCandidato] = useState(null);
  const [modalTipoEleccion, setModalTipoEleccion] = useState('provincial');
  const [modalDistritoId, setModalDistritoId] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [organizacionPolitica, setOrganizacionPolitica] = useState('');
  const [siglas, setSiglas] = useState('');
  const [numeroLista, setNumeroLista] = useState(1);
  const [saving, setSaving] = useState(false);

  // Modal Agregar Distrito State
  const [modalDistritoOpen, setModalDistritoOpen] = useState(false);
  const [modoAgregarDistrito, setModoAgregarDistrito] = useState('existente'); // 'existente' | 'nuevo'
  const [distritoAActivarId, setDistritoAActivarId] = useState('');
  const [nuevoDistritoNombre, setNuevoDistritoNombre] = useState('');
  const [nuevoDistritoCodigo, setNuevoDistritoCodigo] = useState('');
  const [savingDistrito, setSavingDistrito] = useState(false);

  // Carga inicial y recarga de distritos
  const fetchDistritos = async (preferredDistritoId = null) => {
    try {
      const res = await get('/distritos');
      const lista = res.data?.data || res.data || [];
      setAllDistritos(lista);
      const distritales = lista.filter(d => d.tiene_eleccion_distrital);
      setDistritos(distritales);

      if (preferredDistritoId) {
        setFiltroDistrito(String(preferredDistritoId));
      } else if (distritales.length > 0 && (!filtroDistrito || !distritales.some(d => String(d.id) === String(filtroDistrito)))) {
        setFiltroDistrito(String(distritales[0].id));
      }
    } catch (error) {
      console.error('Error cargando distritos:', error);
      toast.error('Error al cargar la lista de distritos');
    }
  };

  useEffect(() => {
    fetchDistritos();
  }, []);

  // Carga de candidatos y cálculo de conteos por distrito
  const fetchCandidatos = async () => {
    setLoading(true);
    try {
      const [candActualRes, allDistritalRes] = await Promise.all([
        get(`/candidatos?tipo_eleccion=${tipoEleccionTab}${tipoEleccionTab === 'distrital' && filtroDistrito ? `&distrito_id=${filtroDistrito}` : ''}`),
        get('/candidatos?tipo_eleccion=distrital')
      ]);

      const dataActual = candActualRes.data?.data || candActualRes.data || [];
      setCandidatos(dataActual);

      const allDistrital = allDistritalRes.data?.data || allDistritalRes.data || [];
      const counts = {};
      allDistrital.forEach(c => {
        if (c.distrito_id) {
          counts[c.distrito_id] = (counts[c.distrito_id] || 0) + 1;
        }
      });
      setCandidateCounts(counts);
    } catch (error) {
      console.error('Error cargando candidatos:', error);
      toast.error('Error al cargar candidatos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidatos();
  }, [tipoEleccionTab, filtroDistrito]);

  // Distritos disponibles para habilitar (que aún no tienen elección distrital activa)
  const distritosDisponiblesParaActivar = useMemo(() => {
    return allDistritos.filter(d => !d.tiene_eleccion_distrital);
  }, [allDistritos]);

  // Distrito actualmente seleccionado en el modo distrital
  const currentDistrito = useMemo(() => {
    if (!filtroDistrito) return null;
    return distritos.find(d => String(d.id) === String(filtroDistrito)) || null;
  }, [distritos, filtroDistrito]);

  // Manejo de Modal Candidato
  const handleOpenCreate = (targetDistritoId = null) => {
    setEditingCandidato(null);
    const tipo = targetDistritoId ? 'distrital' : tipoEleccionTab;
    const distId = targetDistritoId || (tipo === 'distrital' ? filtroDistrito : '');
    setModalTipoEleccion(tipo);
    setModalDistritoId(distId ? String(distId) : '');
    setNombreCompleto('');
    setOrganizacionPolitica('');
    setSiglas('');
    setNumeroLista(candidatos.length + 1);
    setModalOpen(true);
  };

  const handleOpenEdit = (c) => {
    setEditingCandidato(c);
    setModalTipoEleccion(c.tipo_eleccion || 'provincial');
    setModalDistritoId(c.distrito_id ? String(c.distrito_id) : '');
    setNombreCompleto(c.nombre_completo || '');
    setOrganizacionPolitica(c.organizacion_politica || '');
    setSiglas(c.siglas || '');
    setNumeroLista(c.numero_lista || 1);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!nombreCompleto.trim() || !organizacionPolitica.trim()) {
      toast.error('Nombre y organización política son requeridos');
      return;
    }

    if (modalTipoEleccion === 'distrital' && !modalDistritoId) {
      toast.error('Debe seleccionar el distrito para un candidato distrital');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nombre_completo: nombreCompleto.trim(),
        organizacion_politica: organizacionPolitica.trim(),
        siglas: siglas.trim(),
        numero_lista: Number(numeroLista),
        tipo_eleccion: modalTipoEleccion,
        distrito_id: modalTipoEleccion === 'distrital' ? Number(modalDistritoId) : null,
      };

      if (editingCandidato) {
        await put(`/candidatos/${editingCandidato.id}`, payload);
        toast.success('Candidato actualizado con éxito');
      } else {
        await post('/candidatos', payload);
        toast.success('Candidato registrado exitosamente');
      }

      setModalOpen(false);
      fetchCandidatos();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar candidato');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, nombre) => {
    if (!window.confirm(`¿Desea dar de baja al candidato "${nombre}"?`)) return;

    try {
      await del(`/candidatos/${id}`);
      toast.success('Candidato eliminado');
      fetchCandidatos();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar');
    }
  };

  // Manejo de Modal Agregar Distrito
  const handleOpenAddDistrito = () => {
    setModoAgregarDistrito('existente');
    setDistritoAActivarId(distritosDisponiblesParaActivar.length > 0 ? String(distritosDisponiblesParaActivar[0].id) : '');
    setNuevoDistritoNombre('');
    setNuevoDistritoCodigo('');
    setModalDistritoOpen(true);
  };

  const handleSaveDistrito = async (e) => {
    e.preventDefault();
    setSavingDistrito(true);
    try {
      let nuevoId = null;
      let nombreDistritoCreado = '';

      if (modoAgregarDistrito === 'existente') {
        if (!distritoAActivarId) {
          toast.error('Selecciona un distrito para habilitar');
          setSavingDistrito(false);
          return;
        }
        const distObj = allDistritos.find(d => String(d.id) === String(distritoAActivarId));
        nombreDistritoCreado = distObj ? distObj.nombre : 'Distrito';

        await put(`/distritos/${distritoAActivarId}`, { tiene_eleccion_distrital: true });
        nuevoId = distritoAActivarId;
        toast.success(`Distrito "${nombreDistritoCreado}" habilitado para elección distrital`);
      } else {
        if (!nuevoDistritoNombre.trim() || !nuevoDistritoCodigo.trim()) {
          toast.error('Nombre y código son requeridos');
          setSavingDistrito(false);
          return;
        }
        nombreDistritoCreado = nuevoDistritoNombre.trim();
        const res = await post('/distritos', {
          nombre: nuevoDistritoNombre.trim(),
          codigo: nuevoDistritoCodigo.trim().toUpperCase(),
          tiene_eleccion_distrital: true
        });
        const distData = res.data?.data || res.data;
        nuevoId = distData.id;
        toast.success(`Nuevo distrito "${nombreDistritoCreado}" creado exitosamente`);
      }

      setModalDistritoOpen(false);
      setTipoEleccionTab('distrital');
      await fetchDistritos(nuevoId);
    } catch (error) {
      console.error('Error guardando distrito:', error);
      toast.error(error.response?.data?.message || 'Error al agregar distrito');
    } finally {
      setSavingDistrito(false);
    }
  };

  const handleDeshabilitarDistrito = async (distrito) => {
    if (!window.confirm(`¿Desea deshabilitar la elección distrital para "${distrito.nombre}"? Las mesas de este distrito dejarán de exigir acta distrital.`)) {
      return;
    }
    try {
      await put(`/distritos/${distrito.id}`, { tiene_eleccion_distrital: false });
      toast.success(`Elección distrital deshabilitada para ${distrito.nombre}`);
      const otros = distritos.filter(d => String(d.id) !== String(distrito.id));
      const nextId = otros.length > 0 ? otros[0].id : null;
      await fetchDistritos(nextId);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al deshabilitar elección distrital');
    }
  };

  const headersTabla = tipoEleccionTab === 'distrital'
    ? ['N° Lista', 'Candidato / Representante', 'Organización Política', 'Siglas', 'Distrito', 'Acciones']
    : ['N° Lista', 'Candidato / Representante', 'Organización Política', 'Siglas', 'Acciones'];

  return (
    <div className="space-y-6">
      {/* Encabezado y Navegación Principal */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <UsersRound className="mr-2 text-red-600" size={28} />
            Candidatos y Listas Electorales
          </h1>
          <p className="text-sm text-gray-500">Mantenimiento de listas que compiten en las elecciones 2026</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Tabs Provincial / Distrital */}
          <div className="bg-gray-100 p-1 rounded-xl flex text-xs font-bold border border-gray-200">
            <button
              onClick={() => setTipoEleccionTab('provincial')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                tipoEleccionTab === 'provincial' ? 'bg-red-700 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🏛️ Provinciales
            </button>
            <button
              onClick={() => setTipoEleccionTab('distrital')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                tipoEleccionTab === 'distrital' ? 'bg-red-700 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🏘️ Distritales
            </button>
          </div>

          <Button onClick={() => handleOpenCreate(tipoEleccionTab === 'distrital' ? filtroDistrito : null)} className="flex items-center">
            <Plus size={18} className="mr-1" />
            Registrar Candidato
          </Button>
        </div>
      </div>

      {/* Barra Interactiva de Distritos Electorales (Pills + Botón Agregar Distrito) */}
      {tipoEleccionTab === 'distrital' && (
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-red-600" />
              <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wide">
                Distritos con Elección Distrital Activa ({distritos.length}):
              </span>
            </div>

            <button
              onClick={handleOpenAddDistrito}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Habilitar un distrito existente o crear un nuevo distrito electoral"
            >
              <Plus size={15} />
              <span>Agregar Distrito</span>
            </button>
          </div>

          {/* Lista de Distritos con badge de candidatos */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {distritos.map((d) => {
              const isSelected = String(d.id) === String(filtroDistrito);
              const totalCand = candidateCounts[d.id] || 0;
              return (
                <button
                  key={d.id}
                  onClick={() => setFiltroDistrito(String(d.id))}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-red-700 text-white shadow-sm ring-2 ring-red-300'
                      : 'bg-gray-50 text-gray-700 hover:bg-red-50 hover:text-red-700 border border-gray-200 shadow-2xs'
                  }`}
                >
                  <Building2 size={13} />
                  <span>{d.nombre}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono transition-colors ${
                      isSelected ? 'bg-white text-red-700' : 'bg-gray-200 text-gray-700'
                    }`}
                    title={`${totalCand} candidato(s) registrado(s)`}
                  >
                    {totalCand}
                  </span>
                </button>
              );
            })}

            {distritos.length === 0 && (
              <div className="text-xs text-gray-500 italic py-1">
                No hay distritos con elección distrital activa. Haz clic en "+ Agregar Distrito" para habilitar uno.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabla de Candidatos Oficiales */}
      <Card
        title={
          <div className="flex items-center gap-2.5">
            <span className="text-base font-extrabold text-gray-900">
              {tipoEleccionTab === 'distrital'
                ? `📋 Tabla de Candidatos: ${currentDistrito?.nombre || 'Distrito'}`
                : '🏛️ Tabla de Candidatos Oficiales (Alcaldía Provincial de Huamanga)'}
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
              {candidatos.length} Candidato(s)
            </span>
          </div>
        }
        action={
          tipoEleccionTab === 'distrital' && currentDistrito ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenCreate(filtroDistrito)}
                className="px-2.5 py-1 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200 flex items-center gap-1 cursor-pointer"
              >
                <Plus size={13} />
                <span>Inscribir en {currentDistrito.nombre}</span>
              </button>
              <button
                onClick={() => handleDeshabilitarDistrito(currentDistrito)}
                className="px-2.5 py-1 text-xs font-semibold text-gray-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-gray-200 flex items-center gap-1 cursor-pointer"
                title={`Deshabilitar elección distrital en ${currentDistrito.nombre}`}
              >
                <PowerOff size={13} />
                <span>Deshabilitar</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleOpenCreate(null)}
              className="px-2.5 py-1 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200 flex items-center gap-1 cursor-pointer"
            >
              <Plus size={13} />
              <span>Registrar Candidato</span>
            </button>
          )
        }
      >
        {candidatos.length === 0 && !loading ? (
          <div className="py-12 px-4 text-center space-y-3">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-100 shadow-2xs">
              <Sparkles size={28} />
            </div>
            <h4 className="text-base font-bold text-gray-900">
              {tipoEleccionTab === 'distrital'
                ? `No hay candidatos inscritos aún en ${currentDistrito?.nombre || 'este distrito'}`
                : 'No hay candidatos provinciales inscritos'}
            </h4>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              {tipoEleccionTab === 'distrital'
                ? `La tabla para ${currentDistrito?.nombre} está lista. Inscribe las listas de los partidos y candidatos que postulan a la alcaldía de este distrito.`
                : 'Inscribe las listas de los partidos y candidatos para la alcaldía provincial de Huamanga.'}
            </p>
            <div className="pt-2">
              <Button
                onClick={() => handleOpenCreate(tipoEleccionTab === 'distrital' ? filtroDistrito : null)}
                className="inline-flex items-center text-xs font-bold"
              >
                <Plus size={16} className="mr-1.5" />
                {tipoEleccionTab === 'distrital'
                  ? `Inscribir Primer Candidato en ${currentDistrito?.nombre}`
                  : 'Inscribir Candidato Provincial'}
              </Button>
            </div>
          </div>
        ) : (
          <Table headers={headersTabla}>
            {candidatos.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-red-700">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-800 font-black">
                    {c.numero_lista}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  {c.nombre_completo}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {c.organizacion_politica}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-xs font-bold">
                    {c.siglas || '-'}
                  </span>
                </td>
                {tipoEleccionTab === 'distrital' && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                    {c.distrito_nombre || 'N/A'}
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                  <button
                    onClick={() => handleOpenEdit(c)}
                    className="text-gray-600 hover:text-red-700 inline-flex items-center transition-colors cursor-pointer"
                  >
                    <Edit2 size={16} className="mr-1" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(c.id, c.nombre_completo)}
                    className="text-red-600 hover:text-red-900 inline-flex items-center transition-colors cursor-pointer"
                  >
                    <Trash2 size={16} className="mr-1" />
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {/* Modal Agregar Distrito */}
      <Modal
        isOpen={modalDistritoOpen}
        onClose={() => setModalDistritoOpen(false)}
        title="Agregar Distrito Electoral"
      >
        <form onSubmit={handleSaveDistrito} className="space-y-4">
          <div className="bg-gray-100 p-1 rounded-xl flex text-xs font-bold border border-gray-200">
            <button
              type="button"
              onClick={() => setModoAgregarDistrito('existente')}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                modoAgregarDistrito === 'existente' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Habilitar Distrito de Huamanga ({distritosDisponiblesParaActivar.length})
            </button>
            <button
              type="button"
              onClick={() => setModoAgregarDistrito('nuevo')}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                modoAgregarDistrito === 'nuevo' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Crear Nuevo Distrito
            </button>
          </div>

          {modoAgregarDistrito === 'existente' ? (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-700">
                Selecciona el Distrito a Activar para Elección Distrital:
              </label>
              {distritosDisponiblesParaActivar.length > 0 ? (
                <select
                  value={distritoAActivarId}
                  onChange={(e) => setDistritoAActivarId(e.target.value)}
                  className="w-full text-xs font-semibold border border-gray-300 rounded-lg p-2.5 bg-white text-gray-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  {distritosDisponiblesParaActivar.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.nombre} (Cód: {d.codigo})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  Todos los distritos existentes de Huamanga ya tienen la elección distrital habilitada. Puedes crear uno nuevo en la pestaña "Crear Nuevo Distrito".
                </div>
              )}
              <p className="text-[11px] text-gray-500">
                Al habilitar un distrito, se generará inmediatamente su tabla de candidatos y sus mesas permitirán el ingreso de actas distritales.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                label="Nombre del Nuevo Distrito"
                required
                value={nuevoDistritoNombre}
                onChange={(e) => setNuevoDistritoNombre(e.target.value)}
                placeholder="Ej: Nuevo Distrito Ejemplo"
              />
              <Input
                label="Código / Acrónimo (Máx 10 caracteres)"
                required
                value={nuevoDistritoCodigo}
                onChange={(e) => setNuevoDistritoCodigo(e.target.value)}
                placeholder="Ej: NDE"
                maxLength={10}
              />
              <p className="text-[11px] text-gray-500">
                Se registrará en el sistema y se activará inmediatamente para elecciones distritales con su propia tabla de candidatos.
              </p>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setModalDistritoOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              isLoading={savingDistrito}
              disabled={modoAgregarDistrito === 'existente' && distritosDisponiblesParaActivar.length === 0}
            >
              {modoAgregarDistrito === 'existente' ? 'Habilitar Distrito' : 'Crear y Activar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Crear / Editar Candidato */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCandidato ? 'Editar Candidato' : 'Registrar Nuevo Candidato'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Tipo de Elección
            </label>
            <select
              value={modalTipoEleccion}
              onChange={(e) => {
                setModalTipoEleccion(e.target.value);
                if (e.target.value === 'distrital' && !modalDistritoId && distritos.length > 0) {
                  setModalDistritoId(String(distritos[0].id));
                }
              }}
              className="w-full text-xs font-semibold border border-gray-300 rounded-lg p-2.5 bg-white text-gray-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              <option value="provincial">Provincial (Alcaldía de Huamanga)</option>
              <option value="distrital">Distrital (Alcaldía Distrital)</option>
            </select>
          </div>

          {modalTipoEleccion === 'distrital' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Distrito al que Postula
              </label>
              <select
                value={modalDistritoId}
                onChange={(e) => setModalDistritoId(e.target.value)}
                required
                className="w-full text-xs font-semibold border border-gray-300 rounded-lg p-2.5 bg-white text-gray-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                <option value="">Seleccione Distrito...</option>
                {distritos.map(d => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <Input
            label="Número de Lista / Posición"
            type="number"
            min={1}
            required
            value={numeroLista}
            onChange={(e) => setNumeroLista(Number(e.target.value))}
          />

          <Input
            label="Nombre Completo del Candidato"
            required
            value={nombreCompleto}
            onChange={(e) => setNombreCompleto(e.target.value)}
            placeholder="Ej: Juan Carlos Quispe Alanya"
          />

          <Input
            label="Organización Política / Partido"
            required
            value={organizacionPolitica}
            onChange={(e) => setOrganizacionPolitica(e.target.value)}
            placeholder="Ej: Movimiento Regional Wari Llaqta"
          />

          <Input
            label="Siglas (opcional)"
            value={siglas}
            onChange={(e) => setSiglas(e.target.value)}
            placeholder="Ej: WARI"
          />

          <div className="mt-6 flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              isLoading={saving}
            >
              {editingCandidato ? 'Actualizar' : 'Guardar Candidato'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CandidatosPage;
