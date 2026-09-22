import React, { useState, useEffect } from 'react';
import { get, post, put, del } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';
import { UsersRound, Plus, Edit2, Trash2, MapPin } from 'lucide-react';

const CandidatosPage = () => {
  const [tipoEleccionTab, setTipoEleccionTab] = useState('provincial'); // 'provincial' | 'distrital'
  const [distritos, setDistritos] = useState([]);
  const [filtroDistrito, setFiltroDistrito] = useState('');

  const [candidatos, setCandidatos] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCandidato, setEditingCandidato] = useState(null);
  const [modalTipoEleccion, setModalTipoEleccion] = useState('provincial');
  const [modalDistritoId, setModalDistritoId] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [organizacionPolitica, setOrganizacionPolitica] = useState('');
  const [siglas, setSiglas] = useState('');
  const [numeroLista, setNumeroLista] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchDistritos = async () => {
      try {
        const res = await get('/distritos');
        const lista = res.data?.data || res.data || [];
        const distritales = lista.filter(d => d.tiene_eleccion_distrital);
        setDistritos(distritales);
        if (distritales.length > 0 && !filtroDistrito) {
          setFiltroDistrito(String(distritales[0].id));
        }
      } catch (error) {
        console.error('Error cargando distritos:', error);
      }
    };
    fetchDistritos();
  }, []);

  const fetchCandidatos = async () => {
    setLoading(true);
    try {
      let url = `/candidatos?tipo_eleccion=${tipoEleccionTab}`;
      if (tipoEleccionTab === 'distrital' && filtroDistrito) {
        url += `&distrito_id=${filtroDistrito}`;
      }
      const res = await get(url);
      setCandidatos(res.data?.data || res.data || []);
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

  const handleOpenCreate = () => {
    setEditingCandidato(null);
    setModalTipoEleccion(tipoEleccionTab);
    setModalDistritoId(tipoEleccionTab === 'distrital' ? filtroDistrito : '');
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
        toast.success('Candidato actualizado');
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

  const headersTabla = tipoEleccionTab === 'distrital'
    ? ['N° Lista', 'Candidato / Representante', 'Organización Política', 'Siglas', 'Distrito', 'Acciones']
    : ['N° Lista', 'Candidato / Representante', 'Organización Política', 'Siglas', 'Acciones'];

  return (
    <div className="space-y-6">
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
              className={`px-3 py-1.5 rounded-lg transition-all ${
                tipoEleccionTab === 'provincial' ? 'bg-red-700 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🏛️ Provinciales
            </button>
            <button
              onClick={() => setTipoEleccionTab('distrital')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                tipoEleccionTab === 'distrital' ? 'bg-red-700 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🏘️ Distritales
            </button>
          </div>

          {/* Distrito selector if distrital tab */}
          {tipoEleccionTab === 'distrital' && (
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-xl px-2 py-1">
              <MapPin size={14} className="text-red-600" />
              <select
                value={filtroDistrito}
                onChange={(e) => setFiltroDistrito(e.target.value)}
                className="text-xs font-bold bg-transparent text-gray-800 focus:outline-none"
              >
                {distritos.map(d => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <Button onClick={handleOpenCreate} className="flex items-center">
            <Plus size={18} className="mr-1" />
            Registrar Candidato
          </Button>
        </div>
      </div>

      <Card>
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
                <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-xs">
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
                  className="text-gray-600 hover:text-red-700 inline-flex items-center transition-colors"
                >
                  <Edit2 size={16} className="mr-1" />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(c.id, c.nombre_completo)}
                  className="text-red-600 hover:text-red-900 inline-flex items-center transition-colors"
                >
                  <Trash2 size={16} className="mr-1" />
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
          {candidatos.length === 0 && !loading && (
            <tr>
              <td colSpan={headersTabla.length} className="px-6 py-10 text-center text-sm text-gray-500">
                No hay candidatos registrados en esta categoría.
              </td>
            </tr>
          )}
        </Table>
      </Card>

      {/* Modal Crear / Editar */}
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
              onChange={(e) => setModalTipoEleccion(e.target.value)}
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
