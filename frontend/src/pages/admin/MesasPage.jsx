import React, { useState, useEffect, useMemo } from 'react';
import { get, post, del } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import SearchInput from '../../components/ui/SearchInput';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';
import { Inbox, Plus, Trash2, Filter, X } from 'lucide-react';

const MesasPage = () => {
  const [mesas, setMesas] = useState([]);
  const [locales, setLocales] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [loading, setLoading] = useState(false);

  // Advanced Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrito, setSelectedDistrito] = useState('');
  const [selectedLocal, setSelectedLocal] = useState('');
  const [selectedEstado, setSelectedEstado] = useState('');
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
    fetchInitialFilters();
  }, []);

  useEffect(() => {
    fetchMesas();
  }, [searchTerm, selectedDistrito, selectedLocal, selectedEstado, page]);

  const fetchInitialFilters = async () => {
    try {
      const [distRes, locRes] = await Promise.all([
        get('/distritos'),
        get('/locales')
      ]);
      setDistritos(distRes.data?.data || distRes.data || []);
      setLocales(locRes.data?.data || locRes.data || []);
    } catch (error) {
      console.error('Error cargando filtros iniciales:', error);
    }
  };

  const fetchMesas = async () => {
    setLoading(true);
    try {
      let url = `/mesas?page=${page}&limit=25`;
      if (searchTerm) url += `&q=${encodeURIComponent(searchTerm)}`;
      if (selectedDistrito) url += `&distrito_id=${selectedDistrito}`;
      if (selectedLocal) url += `&local_id=${selectedLocal}`;
      if (selectedEstado) url += `&estado=${selectedEstado}`;

      const res = await get(url);
      const data = res.data?.data || res.data || [];
      const meta = res.data?.meta || {};
      
      setMesas(data);
      if (meta.total !== undefined) {
        setTotalMesas(meta.total);
        setTotalPages(Math.ceil(meta.total / 25));
      }
    } catch (error) {
      console.error('Error cargando mesas:', error);
      toast.error('Error al cargar mesas');
    } finally {
      setLoading(false);
    }
  };

  // Filter locales by selected district in the filter bar
  const filteredLocalesForFilter = useMemo(() => {
    if (!selectedDistrito) return locales;
    return locales.filter(l => String(l.distrito_id) === String(selectedDistrito));
  }, [locales, selectedDistrito]);

  const handleDistritoChange = (e) => {
    setSelectedDistrito(e.target.value);
    setSelectedLocal(''); // reset local if district changes
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedDistrito('');
    setSelectedLocal('');
    setSelectedEstado('');
    setPage(1);
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
      toast.error('Seleccione el local de votación');
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
      toast.error(error.response?.data?.message || 'No se puede eliminar la mesa');
    }
  };

  const hasActiveFilters = searchTerm || selectedDistrito || selectedLocal || selectedEstado;

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
            {totalMesas} mesas registradas • Padrón electoral oficial Huamanga 2026
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="flex items-center">
          <Plus size={18} className="mr-1" />
          Nueva Mesa
        </Button>
      </div>

      <Card>
        {/* Panel de Búsqueda Avanzada */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center">
              <Filter size={14} className="mr-1.5 text-red-600" />
              Búsqueda Avanzada y Filtros
            </span>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center transition-colors"
              >
                <X size={13} className="mr-1" />
                Limpiar Filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Buscador de texto */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Buscar por N° o Local</label>
              <SearchInput
                onSearch={(val) => { setSearchTerm(val); setPage(1); }}
                placeholder="Ej: 009434 o Guamán..."
              />
            </div>

            {/* Filtro por Distrito */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Filtrar por Distrito</label>
              <select
                value={selectedDistrito}
                onChange={handleDistritoChange}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 text-sm bg-white"
              >
                <option value="">Todos los distritos (16)</option>
                {distritos.map(d => (
                  <option key={d.id} value={String(d.id)}>{d.nombre}</option>
                ))}
              </select>
            </div>

            {/* Filtro por Local de Votación (dependiente del distrito) */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Local de Votación {selectedDistrito && `(${filteredLocalesForFilter.length})`}
              </label>
              <select
                value={selectedLocal}
                onChange={(e) => { setSelectedLocal(e.target.value); setPage(1); }}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 text-sm bg-white"
              >
                <option value="">Todos los locales</option>
                {filteredLocalesForFilter.map(l => (
                  <option key={l.id} value={String(l.id)}>{l.nombre}</option>
                ))}
              </select>
            </div>

            {/* Filtro por Estado */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Estado de Transmisión</label>
              <select
                value={selectedEstado}
                onChange={(e) => { setSelectedEstado(e.target.value); setPage(1); }}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 text-sm bg-white"
              >
                {estadoOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tabla de Mesas */}
        <Table headers={['N° Mesa', 'Local de Votación', 'Distrito', 'Electores', 'Estado', 'Acciones']}>
          {mesas.map((mesa) => (
            <tr key={mesa.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-gray-900">
                Mesa {mesa.numero_mesa}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                {mesa.local_nombre || 'Local asignado'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                {mesa.distrito_nombre || 'Ayacucho'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {mesa.total_electores_habiles} electores
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
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 pt-4 gap-3">
            <span className="text-sm text-gray-600">
              Mostrando página <span className="font-bold text-gray-900">{page}</span> de <span className="font-bold text-gray-900">{totalPages}</span> ({totalMesas} mesas totales)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-40 hover:bg-gray-50 font-medium transition-colors"
              >
                Anterior
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-40 hover:bg-gray-50 font-medium transition-colors"
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
            placeholder="Ej: 009434"
          />

          <Select
            label="Local de Votación"
            options={locales.map(l => ({ label: `${l.nombre} (${l.distrito_nombre || ''})`, value: String(l.id) }))}
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
