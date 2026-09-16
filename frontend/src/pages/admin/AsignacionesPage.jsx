import React, { useState, useEffect, useMemo } from 'react';
import { get, post, del } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import SearchInput from '../../components/ui/SearchInput';
import toast from 'react-hot-toast';
import { ClipboardList, UserCheck, Shield, Trash2, Plus, Filter, X, Search } from 'lucide-react';

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

  // Advanced Filters (Page list)
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

  // Modal Filters (Personero -> Mesa)
  const [modalDistritoId, setModalDistritoId] = useState('');
  const [modalLocalId, setModalLocalId] = useState('');
  const [modalMesaSearch, setModalMesaSearch] = useState('');
  const [modalSoloDisponibles, setModalSoloDisponibles] = useState(true);

  // Modal Filters (Coordinador -> Local)
  const [modalCoordDistritoId, setModalCoordDistritoId] = useState('');
  const [modalCoordSearch, setModalCoordSearch] = useState('');

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
          get('/mesas?limit=1000')
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

  // Filter locales by selected district in the page filter bar
  const filteredLocalesForFilter = useMemo(() => {
    if (!selectedDistrito) return localesDisponibles;
    return localesDisponibles.filter(l => String(l.distrito_id) === String(selectedDistrito));
  }, [localesDisponibles, selectedDistrito]);

  // Modal Locales filtered by modalDistritoId
  const modalLocales = useMemo(() => {
    if (!modalDistritoId) return localesDisponibles;
    return localesDisponibles.filter(l => String(l.distrito_id) === String(modalDistritoId));
  }, [localesDisponibles, modalDistritoId]);

  // Modal Mesas filtered by distrito, local, search input, and disponibilidad
  const filteredModalMesas = useMemo(() => {
    return mesasDisponibles.filter(m => {
      if (modalDistritoId && String(m.distrito_id) !== String(modalDistritoId)) return false;
      if (modalLocalId && String(m.local_id) !== String(modalLocalId)) return false;
      if (modalMesaSearch.trim()) {
        const q = modalMesaSearch.trim().toLowerCase();
        const numMatches = m.numero_mesa && m.numero_mesa.toLowerCase().includes(q);
        const locMatches = m.local_nombre && m.local_nombre.toLowerCase().includes(q);
        if (!numMatches && !locMatches) return false;
      }
      if (modalSoloDisponibles && m.asignacion_id) return false;
      return true;
    });
  }, [mesasDisponibles, modalDistritoId, modalLocalId, modalMesaSearch, modalSoloDisponibles]);

  // Auto-sync selectedMesaId with filteredModalMesas
  useEffect(() => {
    if (modalPersoneroOpen && filteredModalMesas.length > 0) {
      const exists = filteredModalMesas.some(m => String(m.id) === String(selectedMesaId));
      if (!exists) {
        const firstAvail = filteredModalMesas.find(m => !m.asignacion_id) || filteredModalMesas[0];
        setSelectedMesaId(firstAvail ? String(firstAvail.id) : '');
      }
    } else if (modalPersoneroOpen && filteredModalMesas.length === 0) {
      setSelectedMesaId('');
    }
  }, [filteredModalMesas, modalPersoneroOpen]);

  // Modal Locales for coordinador modal
  const filteredModalLocales = useMemo(() => {
    return localesDisponibles.filter(l => {
      if (modalCoordDistritoId && String(l.distrito_id) !== String(modalCoordDistritoId)) return false;
      if (modalCoordSearch.trim()) {
        const q = modalCoordSearch.trim().toLowerCase();
        const nameMatches = l.nombre && l.nombre.toLowerCase().includes(q);
        const dirMatches = l.direccion && l.direccion.toLowerCase().includes(q);
        if (!nameMatches && !dirMatches) return false;
      }
      return true;
    });
  }, [localesDisponibles, modalCoordDistritoId, modalCoordSearch]);

  // Auto-sync selectedLocalId with filteredModalLocales
  useEffect(() => {
    if (modalCoordinadorOpen && filteredModalLocales.length > 0) {
      const exists = filteredModalLocales.some(l => String(l.id) === String(selectedLocalId));
      if (!exists) {
        setSelectedLocalId(String(filteredModalLocales[0].id));
      }
    } else if (modalCoordinadorOpen && filteredModalLocales.length === 0) {
      setSelectedLocalId('');
    }
  }, [filteredModalLocales, modalCoordinadorOpen]);

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
    setModalDistritoId('');
    setModalLocalId('');
    setModalMesaSearch('');
    setModalSoloDisponibles(true);
    setSelectedUsuarioId(personerosDisponibles.length > 0 ? String(personerosDisponibles[0].id) : '');
    const firstFree = mesasDisponibles.find(m => !m.asignacion_id) || mesasDisponibles[0];
    setSelectedMesaId(firstFree ? String(firstFree.id) : '');
    setModalPersoneroOpen(true);
  };

  const handleOpenAssignCoordinador = () => {
    setModalCoordDistritoId('');
    setModalCoordSearch('');
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
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              1. Seleccionar Personero Registrado <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedUsuarioId}
              onChange={(e) => setSelectedUsuarioId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 text-sm bg-white"
              required
            >
              <option value="">-- Seleccionar Personero ({personerosDisponibles.length}) --</option>
              {personerosDisponibles.map(u => (
                <option key={u.id} value={String(u.id)}>
                  {u.dni} — {u.nombres} {u.apellidos}
                </option>
              ))}
            </select>
          </div>

          {/* Panel de Filtros para Encontrar Mesa */}
          <div className="bg-red-50/70 p-3.5 rounded-lg border border-red-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-900 uppercase tracking-wider flex items-center">
                <Filter size={13} className="mr-1.5 text-red-600" />
                2. Filtrar Mesas Rápidamente
              </span>
              {(modalDistritoId || modalLocalId || modalMesaSearch) && (
                <button
                  type="button"
                  onClick={() => { setModalDistritoId(''); setModalLocalId(''); setModalMesaSearch(''); }}
                  className="text-xs text-red-700 hover:text-red-900 font-semibold underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Filtro Distrito */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Distrito
                </label>
                <select
                  value={modalDistritoId}
                  onChange={(e) => {
                    setModalDistritoId(e.target.value);
                    setModalLocalId('');
                  }}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 text-xs bg-white"
                >
                  <option value="">Todos los distritos (16)</option>
                  {distritos.map(d => (
                    <option key={d.id} value={String(d.id)}>{d.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Filtro Local */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Local de Votación {modalDistritoId && `(${modalLocales.length})`}
                </label>
                <select
                  value={modalLocalId}
                  onChange={(e) => setModalLocalId(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 text-xs bg-white"
                >
                  <option value="">Todos los locales</option>
                  {modalLocales.map(l => (
                    <option key={l.id} value={String(l.id)}>{l.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Buscar por número de mesa */}
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
              <div className="w-full sm:w-2/3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Buscar por N° de Mesa
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={modalMesaSearch}
                    onChange={(e) => setModalMesaSearch(e.target.value)}
                    placeholder="Ej: 009434 o 9434..."
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-red-500 focus:border-red-500 bg-white"
                  />
                  <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
                </div>
              </div>

              <div className="pt-2 sm:pt-4">
                <label className="inline-flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modalSoloDisponibles}
                    onChange={(e) => setModalSoloDisponibles(e.target.checked)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500 mr-1.5"
                  />
                  Solo mesas sin personero
                </label>
              </div>
            </div>
          </div>

          {/* Selector de Mesa */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                3. Seleccionar Mesa de Sufragio <span className="text-red-500">*</span>
              </label>
              <span className="text-xs font-semibold text-red-700">
                {filteredModalMesas.length} mesa(s) encontrada(s)
              </span>
            </div>

            {filteredModalMesas.length > 0 ? (
              <select
                value={selectedMesaId}
                onChange={(e) => setSelectedMesaId(e.target.value)}
                size={Math.min(6, Math.max(3, filteredModalMesas.length))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 text-xs bg-white font-mono"
                required
              >
                {filteredModalMesas.map(m => (
                  <option
                    key={m.id}
                    value={String(m.id)}
                    disabled={Boolean(m.asignacion_id)}
                    className={m.asignacion_id ? 'text-gray-400 bg-gray-100 py-1' : 'text-gray-900 font-semibold py-1'}
                  >
                    Mesa {m.numero_mesa} — {m.local_nombre} ({m.distrito_nombre}) {m.asignacion_id ? '[YA OCUPADA]' : '[DISPONIBLE]'}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 text-center">
                No se encontraron mesas con los filtros seleccionados. Pruebe cambiando el distrito, local o número de mesa.
              </div>
            )}
          </div>

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
              disabled={!selectedMesaId || !selectedUsuarioId}
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
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              1. Seleccionar Coordinador Registrado <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedUsuarioId}
              onChange={(e) => setSelectedUsuarioId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 text-sm bg-white"
              required
            >
              <option value="">-- Seleccionar Coordinador ({coordinadoresDisponibles.length}) --</option>
              {coordinadoresDisponibles.map(u => (
                <option key={u.id} value={String(u.id)}>
                  {u.dni} — {u.nombres} {u.apellidos}
                </option>
              ))}
            </select>
          </div>

          {/* Filtros para Local */}
          <div className="bg-red-50/70 p-3.5 rounded-lg border border-red-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-900 uppercase tracking-wider flex items-center">
                <Filter size={13} className="mr-1.5 text-red-600" />
                2. Filtrar Local por Distrito y Nombre
              </span>
              {(modalCoordDistritoId || modalCoordSearch) && (
                <button
                  type="button"
                  onClick={() => { setModalCoordDistritoId(''); setModalCoordSearch(''); }}
                  className="text-xs text-red-700 hover:text-red-900 font-semibold underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Distrito
                </label>
                <select
                  value={modalCoordDistritoId}
                  onChange={(e) => setModalCoordDistritoId(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs bg-white focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">Todos los distritos (16)</option>
                  {distritos.map(d => (
                    <option key={d.id} value={String(d.id)}>{d.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Buscar por Nombre o Dirección
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={modalCoordSearch}
                    onChange={(e) => setModalCoordSearch(e.target.value)}
                    placeholder="Ej: Moran o Guamán..."
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-red-500 focus:border-red-500 bg-white"
                  />
                  <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                3. Seleccionar Local de Votación <span className="text-red-500">*</span>
              </label>
              <span className="text-xs font-semibold text-red-700">
                {filteredModalLocales.length} local(es) encontrado(s)
              </span>
            </div>

            {filteredModalLocales.length > 0 ? (
              <select
                value={selectedLocalId}
                onChange={(e) => setSelectedLocalId(e.target.value)}
                size={Math.min(6, Math.max(3, filteredModalLocales.length))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 text-xs bg-white"
                required
              >
                {filteredModalLocales.map(l => (
                  <option key={l.id} value={String(l.id)} className="py-1">
                    {l.nombre} — {l.distrito_nombre || 'Ayacucho'} ({l.total_mesas} mesas)
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 text-center">
                No se encontraron locales con los filtros seleccionados.
              </div>
            )}
          </div>

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
              disabled={!selectedLocalId || !selectedUsuarioId}
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
