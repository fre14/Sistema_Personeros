import React, { useState, useEffect } from 'react';
import { get, post, put, del } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import SearchInput from '../../components/ui/SearchInput';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import toast from 'react-hot-toast';
import { MapPin, Plus, Edit2, Trash2 } from 'lucide-react';

const LocalesPage = () => {
  const [locales, setLocales] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrito, setSelectedDistrito] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLocal, setEditingLocal] = useState(null);
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [distritoId, setDistritoId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDistritos();
  }, []);

  useEffect(() => {
    fetchLocales();
  }, [searchTerm, selectedDistrito]);

  const fetchDistritos = async () => {
    try {
      const res = await get('/distritos');
      const data = res.data?.data || res.data || [];
      setDistritos(data);
    } catch (error) {
      console.error('Error cargando distritos:', error);
    }
  };

  const fetchLocales = async () => {
    setLoading(true);
    try {
      let url = `/locales?q=${encodeURIComponent(searchTerm)}`;
      if (selectedDistrito) {
        url += `&distrito_id=${selectedDistrito}`;
      }
      const res = await get(url);
      setLocales(res.data?.data || res.data || []);
    } catch (error) {
      console.error('Error cargando locales:', error);
      toast.error('Error al cargar la lista de locales');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingLocal(null);
    setNombre('');
    setDireccion('');
    setDistritoId(distritos.length > 0 ? String(distritos[0].id) : '');
    setModalOpen(true);
  };

  const handleOpenEdit = (local) => {
    setEditingLocal(local);
    setNombre(local.nombre || '');
    setDireccion(local.direccion || '');
    setDistritoId(String(local.distrito_id || ''));
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error('El nombre del local es requerido');
      return;
    }
    if (!distritoId) {
      toast.error('Seleccione un distrito');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nombre: nombre.trim(),
        direccion: direccion.trim(),
        distrito_id: Number(distritoId)
      };

      if (editingLocal) {
        await put(`/locales/${editingLocal.id}`, payload);
        toast.success('Local actualizado correctamente');
      } else {
        await post('/locales', payload);
        toast.success('Local creado con éxito');
      }

      setModalOpen(false);
      fetchLocales();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar el local');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, nombreLocal) => {
    if (!window.confirm(`¿Está seguro de eliminar el local "${nombreLocal}"?`)) return;

    try {
      await del(`/locales/${id}`);
      toast.success('Local eliminado correctamente');
      fetchLocales();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se puede eliminar el local (puede tener mesas asociadas)');
    }
  };

  const distritoOptions = [
    { label: 'Todos los distritos', value: '' },
    ...distritos.map(d => ({ label: d.nombre, value: String(d.id) }))
  ];

  const modalDistritoOptions = distritos.map(d => ({ label: d.nombre, value: String(d.id) }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <MapPin className="mr-2 text-red-600" size={28} />
            Locales de Votación
          </h1>
          <p className="text-sm text-gray-500">Gestión de colegios y centros de sufragio en Huamanga</p>
        </div>
        <Button onClick={handleOpenCreate} className="flex items-center">
          <Plus size={18} className="mr-1" />
          Nuevo Local
        </Button>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <SearchInput
              onSearch={setSearchTerm}
              placeholder="Buscar por nombre de local..."
            />
          </div>
          <div className="w-full md:w-64">
            <select
              value={selectedDistrito}
              onChange={(e) => setSelectedDistrito(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 text-sm bg-white"
            >
              {distritoOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <Table headers={['Nombre del Local', 'Distrito', 'Dirección', 'Acciones']}>
          {locales.map((local) => (
            <tr key={local.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 flex items-center">
                <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center mr-3 font-bold text-xs">
                  IE
                </div>
                {local.nombre}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                {local.distrito_nombre || 'Ayacucho'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {local.direccion || 'Sin dirección registrada'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                <button
                  onClick={() => handleOpenEdit(local)}
                  className="text-gray-600 hover:text-red-700 inline-flex items-center transition-colors"
                  title="Editar"
                >
                  <Edit2 size={16} className="mr-1" />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(local.id, local.nombre)}
                  className="text-red-600 hover:text-red-900 inline-flex items-center transition-colors"
                  title="Eliminar"
                >
                  <Trash2 size={16} className="mr-1" />
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
          {locales.length === 0 && !loading && (
            <tr>
              <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">
                No se encontraron locales de votación con los filtros seleccionados.
              </td>
            </tr>
          )}
        </Table>
      </Card>

      {/* Modal Crear / Editar */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingLocal ? 'Editar Local de Votación' : 'Nuevo Local de Votación'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nombre de la Institución o Local"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: I.E. Mariscal Cáceres"
          />

          <Select
            label="Distrito"
            options={modalDistritoOptions}
            value={distritoId}
            onChange={(e) => setDistritoId(e.target.value)}
            required
          />

          <Input
            label="Dirección"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Ej: Jr. 28 de Julio N° 450"
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
              {editingLocal ? 'Actualizar' : 'Guardar Local'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LocalesPage;
