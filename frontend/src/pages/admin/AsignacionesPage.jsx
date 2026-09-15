import React, { useState, useEffect, useMemo } from 'react';
import { get, post, del } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import SearchInput from '../../components/ui/SearchInput';
import toast from 'react-hot-toast';
import { ClipboardList, UserCheck, Shield, Trash2, Plus, Filter, X } from 'lucide-react';

const AsignacionesPage = () => {
  const [activeTab, setActiveTab] = useState('personeros'); // 'personeros' | 'coordinadores'
  const [asignacionesPersoneros, setAsignacionesPersoneros] = useState([]);
  const [asignacionesCoordinadores, setAsignacionesCoordinadores] = useState([]);
  const [personerosDisponibles, setPersonerosDisponibles] = useState([]);
  const [coordinadoresDisponibles, setCoordinadoresDisponibles] = useState([]);
  const [mesasDisponibles, setMesasDisponibles] = useState([]);
  const [localesDisponibles, setLocalesDisponibles] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [loading, setLoading] = useState(false);

  // Advanced Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrito, setSelectedDistrito] = useState('');
  const [selectedLocal, setSelectedLocal] = useState('');

  // Modal State
  const [modalPersoneroOpen, setModalPersoneroOpen] = useState(false);
  const [modalCoordinadorOpen, setModalCoordinadorOpen] = useState(false);
  const [selectedUsuarioId, setSelectedUsuarioId] = useState('');
  const [selectedMesaId, setSelectedMesaId] = useState('');
  const [selectedLocalId, setSelectedLocalId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDistritos();
  }, []);

  useEffect(() => {
    fetchData();
  }, [activeTab, searchTerm, selectedDistrito, selectedLocal]);

  const fetchDistritos = async () => {
    try {
      const [distRes, locRes] = await Promise.all([
        get('/distritos'),
        get('/locales')
      ]);
      setDistritos(distRes.data?.data || distRes.data || []);
      setLocalesDisponibles(locRes.data?.data || locRes.data || []);
    } catch (error) {
      console.error('Error cargando distritos y locales:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let params = `?t=${Date.now()}`;
      if (searchTerm) params += `&q=${encodeURIComponent(searchTerm)}`;
      if (selectedDistrito) params += `&distrito_id=${selectedDistrito}`;
      if (selectedLocal) params += `&local_id=${selectedLocal}`;

      if (activeTab === 'personeros') {
        const [asigRes, usersRes, mesasRes] = await Promise.all([
          get(`/asignaciones/personeros${params}`),
          get('/usuarios?rol=personero'),
          get('/mesas?limit=500')
        ]);
        setAsignacionesPersoneros(asigRes.data?.data || asigRes.data || []);
        setPersonerosDisponibles(usersRes.data?.data || usersRes.data || []);
        setMesasDisponibles(mesasRes.data?.data || mesasRes.data || []);
      } else {
        const [asigRes, usersRes] = await Promise.all([
          get(`/asignaciones/coordinadores${params}`),
          get('/usuarios?rol=coordinador')
        ]);
        setAsignacionesCoordinadores(asigRes.data?.data || asigRes.data || []);
        setCoordinadoresDisponibles(usersRes.data?.data || usersRes.data || []);
      }
    } catch (error) {
      console.error('Error cargando asignaciones:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  // Filter locales by selected district in the filter bar
  const filteredLocalesForFilter = useMemo(() => {
    if (!selectedDistrito) return localesDisponibles;
    return localesDisponibles.filter(l => String(l.distrito_id) === String(selectedDistrito));
  }, [localesDisponibles, selectedDistrito]);

  const handleDistritoChange = (e) => {
    setSelectedDistrito(e.target.value);
    setSelectedLocal('');
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedDistrito('');
    setSelectedLocal('');
  };

  const handleOpenAssignPersonero = () => {
    setSelectedUsuarioId(personerosDisponibles.length > 0 ? String(personerosDisponibles[0].id) : '');
    setSelectedMesaId(mesasDisponibles.length > 0 ? String(mesasDisponibles[0].id) : '');
    setModalPersoneroOpen(true);
  };

  const handleOpenAssignCoordinador = () => {
    setSelectedUsuarioId(coordinadoresDisponibles.length > 0 ? String(coordinadoresDisponibles[0].id) : '');
    setSelectedLocalId(localesDisponibles.length > 0 ? String(localesDisponibles[0].id) : '');
    setModalCoordinadorOpen(true);
  };

  const handleSavePersonero = async (e) => {
    e.preventDefault();
    if (!selectedUsuarioId || !selectedMesaId) {
      toast.error('Seleccione personero y mesa');
      return;
    }

    setSaving(true);
    try {
      await post('/asignaciones/personeros', {
        usuario_id: Number(selectedUsuarioId),
        mesa_id: Number(selectedMesaId)
      });
      toast.success('Personero asignado exitosamente');
      setModalPersoneroOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al asignar personero (mesa posiblemente ya ocupada)');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCoordinador = async (e) => {
    e.preventDefault();
    if (!selectedUsuarioId || !selectedLocalId) {
      toast.error('Seleccione coordinador y local');
      return;
    }

    setSaving(true);
    try {
      await post('/asignaciones/coordinadores', {
        usuario_id: Number(selectedUsuarioId),
        local_id: Number(selectedLocalId)
      });
      toast.success('Coordinador asignado exitosamente');
      setModalCoordinadorOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al asignar coordinador');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePersonero = async (id, nombre, mesa) => {
    if (!window.confirm(`¿Desea desasignar a ${nombre} de la Mesa ${mesa}?`)) return;

    try {
      await del(`/asignaciones/personeros/${id}`);
      toast.success('Asignación cancelada');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al desasignar');
    }
  };

  const handleDeleteCoordinador = async (id, nombre, local) => {
    if (!window.confirm(`¿Desea desasignar a ${nombre} del local "${local}"?`)) return;

    try {
      await del(`/asignaciones/coordinadores/${id}`);
      toast.success('Asignación cancelada');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al desasignar');
    }
  };

  const hasActiveFilters = searchTerm || selectedDistrito || selectedLocal;

  const personeroOptions = personerosDisponibles.map(u => ({
    label: `${u.dni} - ${u.nombres} ${u.apellidos}`,
    value: String(u.id)
  }));

  const mesaOptions = mesasDisponibles.map(m => ({
    label: `Mesa ${m.numero_mesa} (${m.local_nombre || 'Local'})`,
    value: String(m.id)
  }));

  const coordinadorOptions = coordinadoresDisponibles.map(u => ({
    label: `${u.dni} - ${u.nombres} ${u.apellidos}`,
    value: String(u.id)
  }));

  const localOptions = localesDisponibles.map(l => ({
    label: `${l.nombre} (${l.distrito_nombre || 'Ayacucho'})`,
    value: String(l.id)
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <ClipboardList className="mr-2 text-red-600" size={28} />
            Asignaciones de Personal
          </h1>
          <p className="text-sm text-gray-500">Distribución y control de personeros y coordinadores electorales</p>
        </div>

        {activeTab === 'personeros' ? (
          <Button onClick={handleOpenAssignPersonero} className="flex items-center">
            <Plus size={18} className="mr-1" />
            Asignar a Mesa
          </Button>
        ) : (
          <Button onClick={handleOpenAssignCoordinador} className="flex items-center">
            <Plus size={18} className="mr-1" />
            Asignar a Local
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => { setActiveTab('personeros'); handleResetFilters(); }}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
              activeTab === 'personeros'
                ? 'border-red-600 text-red-600 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <UserCheck size={18} className="mr-2" />
            Personeros de Mesa ({asignacionesPersoneros.length})
          </button>
          <button
            onClick={() => { setActiveTab('coordinadores'); handleResetFilters(); }}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
              activeTab === 'coordinadores'
                ? 'border-red-600 text-red-600 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Shield size={18} className="mr-2" />
            Coordinadores de Local ({asignacionesCoordinadores.length})
          </button>
        </nav>
      </div>

      <Card>
        {/* Panel de Búsqueda Avanzada */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center">
              <Filter size={14} className="mr-1.5 text-red-600" />
              Búsqueda Avanzada por Distrito y Local
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Buscador */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {activeTab === 'personeros' ? 'Buscar DNI, Personero o Mesa' : 'Buscar DNI o Coordinador'}
              </label>
              <SearchInput
                onSearch={setSearchTerm}
                placeholder="Ej: 74725178 o Juan..."
              />
            </div>

            {/* Filtro Distrito */}
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

            {/* Filtro Local */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Local de Votación {selectedDistrito && `(${filteredLocalesForFilter.length})`}
              </label>
              <select
                value={selectedLocal}
                onChange={(e) => setSelectedLocal(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 text-sm bg-white"
              >
                <option value="">Todos los locales</option>
                {filteredLocalesForFilter.map(l => (
                  <option key={l.id} value={String(l.id)}>{l.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tablas de Resultados */}
        {activeTab === 'personeros' ? (
          <Table headers={['DNI', 'Personero Titular', 'N° Mesa', 'Local de Votación', 'Distrito', 'Acciones']}>
            {asignacionesPersoneros.map((asig) => (
              <tr key={asig.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 font-semibold">
                  {asig.dni}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {asig.nombres} {asig.apellidos}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-red-700">
                  Mesa {asig.numero_mesa}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {asig.local_nombre || 'Local'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                  {asig.distrito_nombre || 'Ayacucho'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleDeletePersonero(asig.id, asig.nombres, asig.numero_mesa)}
                    className="text-red-600 hover:text-red-900 inline-flex items-center transition-colors"
                  >
                    <Trash2 size={16} className="mr-1" />
                    Desasignar
                  </button>
                </td>
              </tr>
            ))}
            {asignacionesPersoneros.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                  No se encontraron asignaciones de personeros con los filtros seleccionados.
                </td>
              </tr>
            )}
          </Table>
        ) : (
          <Table headers={['DNI', 'Coordinador Responsable', 'Local de Votación Asignado', 'Distrito', 'Acciones']}>
            {asignacionesCoordinadores.map((asig) => (
              <tr key={asig.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 font-semibold">
                  {asig.dni}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {asig.nombres} {asig.apellidos}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                  {asig.local_nombre}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                  {asig.distrito_nombre || 'Ayacucho'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleDeleteCoordinador(asig.id, asig.nombres, asig.local_nombre)}
                    className="text-red-600 hover:text-red-900 inline-flex items-center transition-colors"
                  >
                    <Trash2 size={16} className="mr-1" />
                    Desasignar
                  </button>
                </td>
              </tr>
            ))}
            {asignacionesCoordinadores.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                  No se encontraron asignaciones de coordinadores con los filtros seleccionados.
                </td>
              </tr>
            )}
          </Table>
        )}
      </Card>

      {/* Modal Asignar Personero */}
      <Modal
        isOpen={modalPersoneroOpen}
        onClose={() => setModalPersoneroOpen(false)}
        title="Asignar Personero a Mesa de Sufragio"
      >
        <form onSubmit={handleSavePersonero} className="space-y-4">
          <Select
            label="Seleccionar Personero Registrado"
            options={personeroOptions}
            value={selectedUsuarioId}
            onChange={(e) => setSelectedUsuarioId(e.target.value)}
            required
          />

          <Select
            label="Seleccionar Mesa de Sufragio"
            options={mesaOptions}
            value={selectedMesaId}
            onChange={(e) => setSelectedMesaId(e.target.value)}
            required
          />

          <div className="mt-6 flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setModalPersoneroOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              isLoading={saving}
            >
              Confirmar Asignación
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Asignar Coordinador */}
      <Modal
        isOpen={modalCoordinadorOpen}
        onClose={() => setModalCoordinadorOpen(false)}
        title="Asignar Coordinador a Local de Votación"
      >
        <form onSubmit={handleSaveCoordinador} className="space-y-4">
          <Select
            label="Seleccionar Coordinador Registrado"
            options={coordinadorOptions}
            value={selectedUsuarioId}
            onChange={(e) => setSelectedUsuarioId(e.target.value)}
            required
          />

          <Select
            label="Seleccionar Local de Votación"
            options={localOptions}
            value={selectedLocalId}
            onChange={(e) => setSelectedLocalId(e.target.value)}
            required
          />

          <div className="mt-6 flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setModalCoordinadorOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              isLoading={saving}
            >
              Confirmar Asignación
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AsignacionesPage;
