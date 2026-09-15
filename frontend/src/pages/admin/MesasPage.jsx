import React, { useState, useEffect } from 'react';
import { get, post, put, del } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import SearchInput from '../../components/ui/SearchInput';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';
import { Inbox, Plus, Trash2, Users } from 'lucide-react';

const MesasPage = () => {
  const [mesas, setMesas] = useState([]);
  const [locales, setLocales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstado, setSelectedEstado] = useState('');
  const [selectedLocal, setSelectedLocal] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMesas, setTotalMesas] = useState(0);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [numeroMesa, setNumeroMesa] = useState('');
  const [localId, setLocalId] = useState('');
  const [electores, setElectores] = useState(300);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLocales();
  }, []);

  useEffect(() => {
    fetchMesas();
  }, [searchTerm, selectedEstado, selectedLocal, page]);

  const fetchLocales = async () => {
    try {
      const res = await get('/locales');
      setLocales(res.data?.data || res.data || []);
    } catch (error) {
      console.error('Error cargando locales:', error);
    }
  };

  const fetchMesas = async () => {
    setLoading(true);
    try {
      let url = `/mesas?page=${page}&limit=20`;
      if (searchTerm) url += `&q=${encodeURIComponent(searchTerm)}`;
      if (selectedEstado) url += `&estado=${selectedEstado}`;
      if (selectedLocal) url += `&local_id=${selectedLocal}`;

      const res = await get(url);
      const data = res.data?.data || res.data || [];
      const meta = res.data?.meta || {};
      
      setMesas(data);
      if (meta.total) {
        setTotalMesas(meta.total);
        setTotalPages(Math.ceil(meta.total / 20));
      }
    } catch (error) {
      console.error('Error cargando mesas:', error);
      toast.error('Error al cargar mesas');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setNumeroMesa('');
    setLocalId(locales.length > 0 ? String(locales[0].id) : '');
    setElectores(300);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!numeroMesa.trim()) {
      toast.error('Ingrese el número de mesa');
      return;
    }
    if (!localId) {
      toast.error('Seleccione el local');
      return;
    }

    setSaving(true);
    try {
      await post('/mesas', {
        numero_mesa: numeroMesa.trim(),
        local_id: Number(localId),
        total_electores_habiles: Number(electores)
      });
      toast.success('Mesa creada exitosamente');
      setModalOpen(false);
      fetchMesas();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al crear la mesa');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, num) => {
    if (!window.confirm(`¿Seguro que desea eliminar la Mesa ${num}?`)) return;

    try {
      await del(`/mesas/${id}`);
      toast.success(`Mesa ${num} eliminada`);
      fetchMesas();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se puede eliminar la mesa si ya tiene votos registrados');
    }
  };

  const localOptions = [
    { label: 'Todos los locales', value: '' },
    ...locales.map(l => ({ label: l.nombre, value: String(l.id) }))
  ];

  const modalLocalOptions = locales.map(l => ({ label: l.nombre, value: String(l.id) }));

  const estadoOptions = [
    { label: 'Todos los estados', value: '' },
    { label: 'Pendiente', value: 'pendiente' },
    { label: 'Reportada', value: 'reportada' },
    { label: 'Observada', value: 'observada' },
    { label: 'Verificada', value: 'verificada' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Inbox className="mr-2 text-red-600" size={28} />
            Mesas de Sufragio
          </h1>
          <p className="text-sm text-gray-500">
            {totalMesas > 0 ? `${totalMesas} mesas registradas` : 'Control de mesas electorales oficiales'}
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="flex items-center">
          <Plus size={18} className="mr-1" />
          Nueva Mesa
        </Button>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <SearchInput
              onSearch={(val) => { setSearchTerm(val); setPage(1); }}
              placeholder="Buscar por número de mesa..."
            />
          </div>
          <div>
            <select
              value={selectedEstado}
              onChange={(e) => { setSelectedEstado(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 text-sm bg-white"
            >
              {estadoOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={selectedLocal}
              onChange={(e) => { setSelectedLocal(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 text-sm bg-white"
            >
              {localOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <Table headers={['N° Mesa', 'Local de Votación', 'Distrito', 'Electores', 'Estado', 'Acciones']}>
          {mesas.map((mesa) => (
            <tr key={mesa.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-gray-900">
                Mesa {mesa.numero_mesa}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                {mesa.local_nombre || 'Local asignado'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {mesa.distrito_nombre || 'Ayacucho'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                {mesa.total_electores_habiles} hab.
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge variant={mesa.estado}>{mesa.estado}</Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  onClick={() => handleDelete(mesa.id, mesa.numero_mesa)}
                  className="text-red-600 hover:text-red-900 inline-flex items-center transition-colors"
                  title="Eliminar mesa"
                >
                  <Trash2 size={16} className="mr-1" />
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
          {mesas.length === 0 && !loading && (
            <tr>
              <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                No se encontraron mesas con los filtros aplicados.
              </td>
            </tr>
          )}
        </Table>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
            <span className="text-sm text-gray-700">
              Página <span className="font-semibold">{page}</span> de <span className="font-semibold">{totalPages}</span>
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-40 hover:bg-gray-50"
              >
                Anterior
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-40 hover:bg-gray-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal Nueva Mesa */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Registrar Nueva Mesa de Sufragio"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Número de Mesa (6 dígitos)"
            required
            maxLength={6}
            value={numeroMesa}
            onChange={(e) => setNumeroMesa(e.target.value.replace(/\D/g, ''))}
            placeholder="Ej: 001001"
          />

          <Select
            label="Local de Votación"
            options={modalLocalOptions}
            value={localId}
            onChange={(e) => setLocalId(e.target.value)}
            required
          />

          <Input
            label="Total de Electores Hábiles"
            type="number"
            required
            min={1}
            max={500}
            value={electores}
            onChange={(e) => setElectores(Number(e.target.value))}
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
              Guardar Mesa
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MesasPage;
