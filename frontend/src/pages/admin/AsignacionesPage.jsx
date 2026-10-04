import React, { useState, useEffect, useMemo } from 'react';
import { get, post, del } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import SearchInput from '../../components/ui/SearchInput';
import toast from 'react-hot-toast';
import { ClipboardList, UserCheck, Shield, Trash2, Plus, Filter, X, Search, Zap, CheckCircle2 } from 'lucide-react';

const AsignacionesPage = () => {
  const [activeTab, setActiveTab] = useState('personeros'); // 'personeros' | 'coordinadores'
  const [asignacionesPersoneros, setAsignacionesPersoneros] = useState([]);
  const [todasAsignacionesPersoneros, setTodasAsignacionesPersoneros] = useState([]);
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

  // Modal State (Manual Assignment)
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
  const [modalPersoneroSearch, setModalPersoneroSearch] = useState('');
  const [modalSoloPersonerosLibres, setModalSoloPersonerosLibres] = useState(true);

  // Auto-Assign State
  const [modalAutoAsignarOpen, setModalAutoAsignarOpen] = useState(false);
  const [autoAsignarDistritoId, setAutoAsignarDistritoId] = useState('');
  const [autoAsignarLocalId, setAutoAsignarLocalId] = useState('');
  const [selectedAutoPersoneroIds, setSelectedAutoPersoneroIds] = useState(new Set());
  const [autoAsignando, setAutoAsignando] = useState(false);
  const [autoAsignarResult, setAutoAsignarResult] = useState(null);

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
        const [asigRes, allAsigRes, usersRes, mesasRes] = await Promise.all([
          get(`/asignaciones/personeros${params}`),
          get('/asignaciones/personeros'),
          get('/usuarios?rol=personero&limit=2000'),
          get('/mesas?limit=1000')
        ]);
        setAsignacionesPersoneros(asigRes.data?.data || asigRes.data || []);
        setTodasAsignacionesPersoneros(allAsigRes.data?.data || allAsigRes.data || []);
        setPersonerosDisponibles(usersRes.data?.data || usersRes.data || []);
        setMesasDisponibles(mesasRes.data?.data || mesasRes.data || []);
      } else {
        const [asigRes, usersRes] = await Promise.all([
          get(`/asignaciones/coordinadores${params}`),
          get('/usuarios?rol=coordinador&limit=2000')
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

  // Helper para normalizar texto (ignorar tildes y mayúsculas en búsquedas)
  const normalize = (str) => (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

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

  // Mapa global de personeros asignados (a nivel de toda la provincia, independiente de filtros de tabla)
  const assignedPersoneroUserIds = useMemo(() => {
    return new Set(todasAsignacionesPersoneros.map(a => a.usuario_id));
  }, [todasAsignacionesPersoneros]);

  const personeroAssignmentMap = useMemo(() => {
    const map = new Map();
    todasAsignacionesPersoneros.forEach(a => map.set(a.usuario_id, a));
    return map;
  }, [todasAsignacionesPersoneros]);

  // Lista de personeros completamente libres (sin ninguna mesa asignada)
  const personerosLibresGlobal = useMemo(() => {
    return personerosDisponibles.filter(u => !assignedPersoneroUserIds.has(u.id));
  }, [personerosDisponibles, assignedPersoneroUserIds]);

  const personerosLibresCount = personerosLibresGlobal.length;

  const filteredModalPersoneros = useMemo(() => {
    const q = normalize(modalPersoneroSearch);
    const list = personerosDisponibles.filter(u => {
      const isAssigned = assignedPersoneroUserIds.has(u.id);
      if (modalSoloPersonerosLibres && isAssigned) return false;
      if (q) {
        const dniMatch = u.dni && u.dni.includes(q);
        const nameMatch = normalize(`${u.nombres} ${u.apellidos}`).includes(q);
        if (!dniMatch && !nameMatch) return false;
      }
      return true;
    });

    // Ordenar: primero los DISPONIBLES (libres), y luego alfabéticamente
    return list.sort((a, b) => {
      const aAssigned = assignedPersoneroUserIds.has(a.id) ? 1 : 0;
      const bAssigned = assignedPersoneroUserIds.has(b.id) ? 1 : 0;
      if (aAssigned !== bAssigned) return aAssigned - bAssigned;
      return `${a.nombres} ${a.apellidos}`.localeCompare(`${b.nombres} ${b.apellidos}`);
    });
  }, [personerosDisponibles, assignedPersoneroUserIds, modalSoloPersonerosLibres, modalPersoneroSearch]);

  const selectedPersoneroAssignment = useMemo(() => {
    if (!selectedUsuarioId) return null;
    return personeroAssignmentMap.get(Number(selectedUsuarioId));
  }, [selectedUsuarioId, personeroAssignmentMap]);

  // Auto-sync selectedUsuarioId with filteredModalPersoneros
  useEffect(() => {
    if (modalPersoneroOpen && filteredModalPersoneros.length > 0) {
      const exists = filteredModalPersoneros.some(u => String(u.id) === String(selectedUsuarioId));
      if (!exists) {
        setSelectedUsuarioId(String(filteredModalPersoneros[0].id));
      }
    } else if (modalPersoneroOpen && filteredModalPersoneros.length === 0) {
      setSelectedUsuarioId('');
    }
  }, [filteredModalPersoneros, modalPersoneroOpen]);

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
    setModalDistritoId(selectedDistrito || '');
    setModalLocalId(selectedLocal || '');
    setModalMesaSearch('');
    setModalSoloDisponibles(true);
    setModalPersoneroSearch('');
    setModalSoloPersonerosLibres(true);
    const firstFreePerson = personerosLibresGlobal.length > 0 ? personerosLibresGlobal[0] : personerosDisponibles[0];
    setSelectedUsuarioId(firstFreePerson ? String(firstFreePerson.id) : '');
    const firstFree = mesasDisponibles.find(m => !m.asignacion_id && (!selectedLocal || String(m.local_id) === String(selectedLocal))) || mesasDisponibles.find(m => !m.asignacion_id) || mesasDisponibles[0];
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

  const handleOpenAutoAsignar = () => {
    setAutoAsignarDistritoId(selectedDistrito || '');
    setAutoAsignarLocalId(selectedLocal || '');
    setAutoAsignarResult(null);
    const libreIds = new Set(personerosLibresGlobal.map(u => u.id));
    setSelectedAutoPersoneroIds(libreIds);
    setModalAutoAsignarOpen(true);
  };

  const handleToggleSelectAutoPersonero = (id) => {
    setSelectedAutoPersoneroIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAllAutoPersoneros = () => {
    if (selectedAutoPersoneroIds.size === personerosLibresGlobal.length) {
      setSelectedAutoPersoneroIds(new Set());
    } else {
      setSelectedAutoPersoneroIds(new Set(personerosLibresGlobal.map(u => u.id)));
    }
  };

  const mesasLibresAutoAsignar = useMemo(() => {
    return mesasDisponibles.filter(m => {
      if (m.asignacion_id) return false;
      if (autoAsignarLocalId && String(m.local_id) !== String(autoAsignarLocalId)) return false;
      if (autoAsignarDistritoId && String(m.distrito_id) !== String(autoAsignarDistritoId)) return false;
      return true;
    });
  }, [mesasDisponibles, autoAsignarLocalId, autoAsignarDistritoId]);

  const handleExecuteAutoAsignar = async () => {
    if (selectedAutoPersoneroIds.size === 0) {
      toast.error('Seleccione al menos un personero libre');
      return;
    }
    if (mesasLibresAutoAsignar.length === 0) {
      toast.error('No hay mesas libres disponibles en la ubicación seleccionada');
      return;
    }

    setAutoAsignando(true);
    try {
      const res = await post('/asignaciones/personeros/auto-asignar', {
        local_id: autoAsignarLocalId ? Number(autoAsignarLocalId) : null,
        distrito_id: autoAsignarDistritoId ? Number(autoAsignarDistritoId) : null,
        usuario_ids: Array.from(selectedAutoPersoneroIds)
      });

      toast.success(res.data?.message || 'Personeros asignados automáticamente');
      setAutoAsignarResult(res.data?.data || null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al auto-asignar personeros');
    } finally {
      setAutoAsignando(false);
    }
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
        mesa_id: Number(selectedMesaId),
        reubicar: !!selectedPersoneroAssignment
      });
      toast.success(
        selectedPersoneroAssignment
          ? 'Personero reubicado exitosamente a la nueva mesa'
          : 'Personero asignado exitosamente'
      );
      setModalPersoneroOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al asignar personero');
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
      toast.success(`Asignación cancelada. ${nombre} ahora está disponible para reasignar en cualquier local.`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al desasignar');
    }
  };

  const handleDeleteCoordinador = async (id, nombre, local) => {
    if (!window.confirm(`¿Desea desasignar a ${nombre} del local "${local}"?`)) return;

    try {
      await del(`/asignaciones/coordinadores/${id}`);
      toast.success(`Asignación cancelada. ${nombre} ahora está disponible para reasignar.`);
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
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAutoAsignar}
              className="px-3.5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center font-medium shadow-sm transition-colors text-sm"
              title="Asignar automáticamente personeros libres a mesas vacías"
            >
              <Zap size={16} className="mr-1.5 text-amber-300" />
              ⚡ Auto-Asignar Libres ({personerosLibresCount})
            </button>
            <Button onClick={handleOpenAssignPersonero} className="flex items-center">
              <Plus size={18} className="mr-1" />
              Asignar a Mesa
            </Button>
          </div>
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                1. Seleccionar Personero <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalSoloPersonerosLibres(!modalSoloPersonerosLibres)}
                  className={`px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors ${
                    modalSoloPersonerosLibres 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                      : 'bg-gray-100 text-gray-600 border border-gray-200'
                  }`}
                >
                  {modalSoloPersonerosLibres ? `🟢 Solo Disponibles (${personerosLibresCount})` : `Todos (${personerosDisponibles.length})`}
                </button>
              </div>
            </div>

            {/* Buscador de Personero en Modal */}
            <div className="relative">
              <input
                type="text"
                value={modalPersoneroSearch}
                onChange={(e) => setModalPersoneroSearch(e.target.value)}
                placeholder="Buscar por DNI, Nombre o Apellidos (ej: Jackeline, Quispe, 7435...)"
                className="w-full pl-8 pr-8 py-2 border border-gray-300 rounded-md text-xs focus:ring-red-500 focus:border-red-500 bg-white"
                autoFocus
              />
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              {modalPersoneroSearch && (
                <button
                  type="button"
                  onClick={() => setModalPersoneroSearch('')}
                  className="absolute right-2.5 top-2 text-xs text-gray-400 hover:text-gray-600 font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex justify-between items-center text-[11px] text-gray-500 px-1">
              <span>
                Mostrando <b>{filteredModalPersoneros.length}</b> de <b>{personerosDisponibles.length}</b> personeros
                ({filteredModalPersoneros.filter(u => !assignedPersoneroUserIds.has(u.id)).length} libres)
              </span>
              {modalPersoneroSearch && (
                <span className="text-red-600 font-semibold">Búsqueda: "{modalPersoneroSearch}"</span>
              )}
            </div>

            <select
              value={selectedUsuarioId}
              onChange={(e) => setSelectedUsuarioId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 text-sm bg-white font-medium"
              required
            >
              <option value="">-- Seleccionar Personero ({filteredModalPersoneros.length}) --</option>
              {filteredModalPersoneros.map(u => {
                const asig = personeroAssignmentMap.get(u.id);
                return (
                  <option key={u.id} value={String(u.id)}>
                    {asig 
                      ? `🟡 [En Mesa ${asig.numero_mesa} - ${asig.local_nombre || 'Local'}] ${u.dni} — ${u.nombres} ${u.apellidos}`
                      : `🟢 [DISPONIBLE] ${u.dni} — ${u.nombres} ${u.apellidos}`}
                  </option>
                );
              })}
            </select>

            {selectedPersoneroAssignment && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 leading-relaxed">
                <span>⚠️ Este personero ya se encuentra asignado a la <b>Mesa {selectedPersoneroAssignment.numero_mesa}</b> ({selectedPersoneroAssignment.local_nombre}). Al confirmar esta asignación, se <b>liberará automáticamente su mesa anterior</b> y se reubicará a la nueva mesa seleccionada.</span>
              </div>
            )}
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

      {/* Modal Auto-Asignar Personeros */}
      <Modal
        isOpen={modalAutoAsignarOpen}
        onClose={() => setModalAutoAsignarOpen(false)}
        title="⚡ Auto-Asignación Rápida de Personeros Libres"
        maxWidth="max-w-2xl"
      >
        {autoAsignarResult ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
              <CheckCircle2 size={24} className="text-emerald-600 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-emerald-900">¡Asignación Automática Completada con Éxito!</h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Se asignaron <b>{autoAsignarResult.total_asignados}</b> personeros a sus mesas correspondientes. Sus contraseñas se han establecido con su número de mesa para facilitar su ingreso al sistema.
                </p>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold text-gray-700">DNI</th>
                    <th className="px-3 py-2 text-left font-bold text-gray-700">Personero</th>
                    <th className="px-3 py-2 text-left font-bold text-gray-700">Local de Votación</th>
                    <th className="px-3 py-2 text-left font-bold text-gray-700">Mesa</th>
                    <th className="px-3 py-2 text-left font-bold text-gray-700">Contraseña</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {autoAsignarResult.detalles?.map((det, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono font-bold text-gray-900">{det.dni}</td>
                      <td className="px-3 py-2 font-medium text-gray-800">{det.nombres}</td>
                      <td className="px-3 py-2 text-gray-600">{det.local_nombre}</td>
                      <td className="px-3 py-2 font-bold text-red-600">{det.numero_mesa}</td>
                      <td className="px-3 py-2 font-mono bg-emerald-50 text-emerald-800 font-semibold">{det.contrasena_asignada}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setModalAutoAsignarOpen(false)}>
                Aceptar y Ver Tabla
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resumen estadístico */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                <span className="block text-xs font-semibold text-emerald-700 uppercase">Personeros Libres</span>
                <span className="text-xl font-extrabold text-emerald-900">{personerosLibresGlobal.length}</span>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                <span className="block text-xs font-semibold text-blue-700 uppercase">Mesas Libres Destino</span>
                <span className="text-xl font-extrabold text-blue-900">{mesasLibresAutoAsignar.length}</span>
              </div>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                <span className="block text-xs font-semibold text-red-700 uppercase">Se Asignarán</span>
                <span className="text-xl font-extrabold text-red-900">
                  {Math.min(selectedAutoPersoneroIds.size, mesasLibresAutoAsignar.length)}
                </span>
              </div>
            </div>

            {/* Selector de Ubicación Destino */}
            <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200 space-y-2.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-800">
                1. Seleccionar Local Destino para las Mesas
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Distrito (Opcional)</label>
                  <select
                    value={autoAsignarDistritoId}
                    onChange={(e) => {
                      setAutoAsignarDistritoId(e.target.value);
                      setAutoAsignarLocalId('');
                    }}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs bg-white focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">Todos los distritos</option>
                    {distritos.map(d => (
                      <option key={d.id} value={String(d.id)}>{d.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Local de Votación</label>
                  <select
                    value={autoAsignarLocalId}
                    onChange={(e) => setAutoAsignarLocalId(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs bg-white focus:ring-red-500 focus:border-red-500 font-medium"
                  >
                    <option value="">-- Cualquier Local con Mesas Libres --</option>
                    {localesDisponibles
                      .filter(l => !autoAsignarDistritoId || String(l.distrito_id) === String(autoAsignarDistritoId))
                      .map(l => {
                        const freeCount = mesasDisponibles.filter(m => String(m.local_id) === String(l.id) && !m.asignacion_id).length;
                        return (
                          <option key={l.id} value={String(l.id)}>
                            {l.nombre} ({freeCount} mesas libres)
                          </option>
                        );
                      })}
                  </select>
                </div>
              </div>
            </div>

            {/* Lista de Personeros a Asignar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-800">
                  2. Personeros Libres a Incluir ({selectedAutoPersoneroIds.size} seleccionados)
                </label>
                {personerosLibresGlobal.length > 0 && (
                  <button
                    type="button"
                    onClick={handleToggleSelectAllAutoPersoneros}
                    className="text-xs text-red-600 hover:text-red-800 font-semibold cursor-pointer"
                  >
                    {selectedAutoPersoneroIds.size === personerosLibresGlobal.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                  </button>
                )}
              </div>

              {personerosLibresGlobal.length === 0 ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 text-center">
                  🎉 ¡No hay personeros libres sin mesa! Todos los personeros del sistema ya cuentan con una mesa asignada.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 bg-white">
                  {personerosLibresGlobal.map(u => {
                    const isChecked = selectedAutoPersoneroIds.has(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => handleToggleSelectAutoPersonero(u.id)}
                        className={`p-2.5 flex items-center justify-between text-xs cursor-pointer hover:bg-gray-50 transition-colors ${
                          isChecked ? 'bg-red-50/40' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded text-red-600 focus:ring-red-500 h-4 w-4 pointer-events-none"
                          />
                          <div>
                            <span className="font-bold text-gray-900">{u.nombres} {u.apellidos}</span>
                            <span className="text-gray-500 ml-2 font-mono">DNI: {u.dni}</span>
                          </div>
                        </div>
                        {u.telefono && <span className="text-gray-400 font-mono text-[11px]">{u.telefono}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed">
              💡 <b>Nota:</b> Cada personero será asignado automáticamente a la siguiente mesa libre en orden correlativo. Su contraseña de acceso al sistema quedará configurada con su número de mesa correspondiente.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setModalAutoAsignarOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleExecuteAutoAsignar}
                isLoading={autoAsignando}
                disabled={selectedAutoPersoneroIds.size === 0 || mesasLibresAutoAsignar.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Zap size={15} className="mr-1.5" />
                Ejecutar Auto-Asignación
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AsignacionesPage;
