import React, { useState, useEffect } from 'react';
import { get, post, put, patch, del } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import SearchInput from '../../components/ui/SearchInput';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import toast from 'react-hot-toast';
import { Users, Plus, UserCheck, UserX, Edit2, Trash2, AlertTriangle, ShieldCheck } from 'lucide-react';

const UsuariosPage = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRol, setSelectedRol] = useState('');

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [dni, setDni] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [rol, setRol] = useState('personero');
  const [password, setPassword] = useState('');
  const [telefono, setTelefono] = useState('');
  const [saving, setSaving] = useState(false);

  // Bulk State
  const [bulkModal, setBulkModal] = useState({ open: false, rol: '', activo: true, title: '', message: '' });
  const [loadingBulk, setLoadingBulk] = useState(false);

  // Delete State
  const [deleteModal, setDeleteModal] = useState({ open: false, usuario: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchUsuarios();
  }, [searchTerm, selectedRol]);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      let url = `/usuarios?limit=100`;
      if (searchTerm) url += `&q=${encodeURIComponent(searchTerm)}`;
      if (selectedRol) url += `&rol=${selectedRol}`;

      const res = await get(url);
      setUsuarios(res.data?.data || res.data || []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      toast.error('Error al cargar la lista de usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setDni('');
    setNombres('');
    setApellidos('');
    setRol('personero');
    setPassword('');
    setTelefono('');
    setModalOpen(true);
  };

  const handleOpenEdit = (u) => {
    setEditingId(u.id);
    setDni(u.dni);
    setNombres(u.nombres);
    setApellidos(u.apellidos);
    setRol(u.rol);
    setPassword('');
    setTelefono(u.telefono || '');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (dni.length !== 8) {
      toast.error('El DNI debe tener exactamente 8 dígitos');
      return;
    }
    if (!nombres.trim() || !apellidos.trim()) {
      toast.error('Nombres y apellidos son requeridos');
      return;
    }
    if (!editingId && (!password || password.length < 6)) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const payload = {
          nombres: nombres.trim(),
          apellidos: apellidos.trim(),
          rol,
          telefono: telefono.trim() || undefined
        };
        if (password && password.length >= 6) {
          payload.password = password;
        }
        await put(`/usuarios/${editingId}`, payload);
        toast.success('Usuario actualizado');
      } else {
        await post('/usuarios', {
          dni: dni.trim(),
          nombres: nombres.trim(),
          apellidos: apellidos.trim(),
          rol,
          password: password.trim(),
          telefono: telefono.trim() || undefined
        });
        toast.success('Usuario creado exitosamente');
      }

      setModalOpen(false);
      fetchUsuarios();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar el usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id, currentActive, nombre) => {
    try {
      await patch(`/usuarios/${id}/toggle-active`);
      toast.success(`Usuario ${currentActive ? 'desactivado' : 'activado'}`);
      fetchUsuarios();
    } catch (error) {
      toast.error('Error al cambiar el estado del usuario');
    }
  };

  // Manejador de Acción Masiva
  const handleOpenBulkModal = (rol, activo) => {
    const rolStr = rol === 'personero' ? 'Personeros de Mesa' : 'Coordinadores de Local';
    const accionStr = activo ? 'HABILITAR' : 'DESHABILITAR';
    setBulkModal({
      open: true,
      rol,
      activo,
      title: `${accionStr} Todos los ${rolStr}`,
      message: `¿Estás seguro de que deseas ${accionStr.toLowerCase()} a TODOS los ${rolStr.toLowerCase()} del sistema? ${activo ? 'Podrán iniciar sesión y registrar datos.' : 'No podrán acceder al sistema hasta que sean reactivados.'}`
    });
  };

  const handleConfirmBulk = async () => {
    setLoadingBulk(true);
    try {
      const res = await post('/usuarios/bulk-estado', {
        rol: bulkModal.rol,
        activo: bulkModal.activo
      });
      toast.success(res.data?.message || 'Actualización masiva completada');
      setBulkModal({ open: false, rol: '', activo: true, title: '', message: '' });
      fetchUsuarios();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error en la actualización masiva');
    } finally {
      setLoadingBulk(false);
    }
  };

  // Manejador de Eliminación Individual
  const handleOpenDeleteModal = (usuario) => {
    setDeleteModal({ open: true, usuario });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.usuario) return;
    setDeleting(true);
    try {
      const res = await del(`/usuarios/${deleteModal.usuario.id}`);
      toast.success(res.data?.message || 'Usuario eliminado');
      setDeleteModal({ open: false, usuario: null });
      fetchUsuarios();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo eliminar el usuario');
    } finally {
      setDeleting(false);
    }
  };

  const rolOptions = [
    { label: 'Todos los roles', value: '' },
    { label: 'Personero', value: 'personero' },
    { label: 'Coordinador', value: 'coordinador' },
    { label: 'Administrador', value: 'admin' },
  ];

  const modalRolOptions = [
    { label: 'Personero de Mesa', value: 'personero' },
    { label: 'Coordinador de Local', value: 'coordinador' },
    { label: 'Administrador del Sistema', value: 'admin' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Users className="mr-2 text-red-600" size={28} />
            Gestión de Usuarios
          </h1>
          <p className="text-sm text-gray-500">Administración de personeros, coordinadores de local y administradores</p>
        </div>
        <Button onClick={handleOpenCreate} className="flex items-center">
          <Plus size={18} className="mr-1" />
          Nuevo Usuario
        </Button>
      </div>

      <Card>
        {/* Barra de Filtros y Búsqueda */}
        <div className="flex flex-col sm:flex-row gap-4 mb-5">
          <div className="flex-1">
            <SearchInput
              onSearch={setSearchTerm}
              placeholder="Buscar por DNI, Nombres o Apellidos..."
            />
          </div>
          <div className="w-full sm:w-56">
            <select
              value={selectedRol}
              onChange={(e) => setSelectedRol(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 text-sm bg-white font-medium"
            >
              {rolOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Barra de Control Masivo de Acceso */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-red-600" />
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">
              Control Masivo de Acceso:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Personeros */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 shadow-2xs">
              <span className="text-xs font-bold text-blue-950 mr-1">Personeros:</span>
              <button
                type="button"
                onClick={() => handleOpenBulkModal('personero', true)}
                className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                title="Habilitar a todos los personeros de mesa"
              >
                <UserCheck size={13} />
                Habilitar Todos
              </button>
              <button
                type="button"
                onClick={() => handleOpenBulkModal('personero', false)}
                className="px-2.5 py-1 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 transition-colors flex items-center gap-1 cursor-pointer"
                title="Deshabilitar a todos los personeros de mesa"
              >
                <UserX size={13} />
                Deshabilitar Todos
              </button>
            </div>

            {/* Coordinadores */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 shadow-2xs">
              <span className="text-xs font-bold text-purple-950 mr-1">Coordinadores:</span>
              <button
                type="button"
                onClick={() => handleOpenBulkModal('coordinador', true)}
                className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                title="Habilitar a todos los coordinadores de local"
              >
                <UserCheck size={13} />
                Habilitar Todos
              </button>
              <button
                type="button"
                onClick={() => handleOpenBulkModal('coordinador', false)}
                className="px-2.5 py-1 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 transition-colors flex items-center gap-1 cursor-pointer"
                title="Deshabilitar a todos los coordinadores de local"
              >
                <UserX size={13} />
                Deshabilitar Todos
              </button>
            </div>
          </div>
        </div>
        
        <Table headers={['DNI', 'Nombres y Apellidos', 'Rol', 'Teléfono', 'Estado', 'Acciones']}>
          {usuarios.map(u => (
            <tr key={u.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-gray-900">{u.dni}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.nombres} {u.apellidos}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                  u.rol === 'admin' 
                    ? 'bg-red-100 text-red-800' 
                    : u.rol === 'coordinador' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {u.rol}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                {u.telefono || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  u.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {u.activo ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                <button
                  onClick={() => handleOpenEdit(u)}
                  className="text-gray-600 hover:text-red-700 inline-flex items-center transition-colors cursor-pointer"
                >
                  <Edit2 size={15} className="mr-1" />
                  Editar
                </button>
                <button
                  onClick={() => handleToggleActive(u.id, u.activo, u.nombres)}
                  className={`inline-flex items-center transition-colors cursor-pointer ${
                    u.activo ? 'text-amber-600 hover:text-amber-800' : 'text-green-600 hover:text-green-800'
                  }`}
                >
                  {u.activo ? <UserX size={15} className="mr-1" /> : <UserCheck size={15} className="mr-1" />}
                  {u.activo ? 'Desactivar' : 'Activar'}
                </button>
                {u.dni !== '00000000' && (
                  <button
                    onClick={() => handleOpenDeleteModal(u)}
                    className="text-red-600 hover:text-red-800 inline-flex items-center transition-colors font-semibold cursor-pointer"
                    title="Eliminar este usuario del sistema"
                  >
                    <Trash2 size={15} className="mr-1" />
                    Eliminar
                  </button>
                )}
              </td>
            </tr>
          ))}
          {usuarios.length === 0 && !loading && (
            <tr>
              <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                No se encontraron usuarios registrados.
              </td>
            </tr>
          )}
        </Table>
      </Card>

      {/* Modal Crear / Editar */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="DNI (8 dígitos)"
            required
            maxLength={8}
            disabled={!!editingId}
            value={dni}
            onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
            placeholder="Ej: 45678901"
          />

          <Input
            label="Nombres"
            required
            value={nombres}
            onChange={(e) => setNombres(e.target.value)}
            placeholder="Nombres completos"
          />

          <Input
            label="Apellidos"
            required
            value={apellidos}
            onChange={(e) => setApellidos(e.target.value)}
            placeholder="Apellidos completos"
          />

          <Select
            label="Rol en el Sistema"
            options={modalRolOptions}
            value={rol}
            onChange={(e) => setRol(e.target.value)}
          />

          <Input
            label="Teléfono / WhatsApp (opcional)"
            type="tel"
            maxLength={9}
            value={telefono}
            onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
            placeholder="Ej: 966123456"
          />

          <Input
            label={editingId ? 'Nueva Contraseña (dejar en blanco para conservar actual)' : 'Contraseña de Acceso'}
            type="password"
            required={!editingId}
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
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
              {editingId ? 'Actualizar Usuario' : 'Crear Usuario'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmación de Acción Masiva */}
      <Modal
        isOpen={bulkModal.open}
        onClose={() => setBulkModal({ open: false, rol: '', activo: true, title: '', message: '' })}
        title={bulkModal.title}
      >
        <div className="space-y-4">
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${
            bulkModal.activo 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : 'bg-red-50 border-red-200 text-red-900'
          }`}>
            <AlertTriangle className="flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-bold text-sm">Confirmación Requerida</h4>
              <p className="text-xs mt-1 leading-relaxed">{bulkModal.message}</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button
              variant="secondary"
              onClick={() => setBulkModal({ open: false, rol: '', activo: true, title: '', message: '' })}
              disabled={loadingBulk}
            >
              Cancelar
            </Button>
            <Button
              variant={bulkModal.activo ? 'primary' : 'danger'}
              onClick={handleConfirmBulk}
              isLoading={loadingBulk}
              className={bulkModal.activo ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
            >
              {bulkModal.activo ? 'Sí, Habilitar a Todos' : 'Sí, Deshabilitar a Todos'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Confirmación de Eliminación Individual */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, usuario: null })}
        title="Eliminar Usuario"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl border bg-red-50 border-red-200 text-red-900 flex items-start gap-3">
            <AlertTriangle className="flex-shrink-0 mt-0.5 text-red-600" size={22} />
            <div>
              <h4 className="font-bold text-sm">¿Eliminar permanentemente este usuario?</h4>
              <p className="text-xs mt-1 text-red-800 leading-relaxed">
                Estás a punto de eliminar al usuario <strong>{deleteModal.usuario?.nombres} {deleteModal.usuario?.apellidos}</strong> (DNI: <span className="font-mono font-bold">{deleteModal.usuario?.dni}</span>, Rol: {deleteModal.usuario?.rol}).
              </p>
              <p className="text-[11px] text-red-700 mt-1.5 font-medium">
                Esta acción removerá sus asignaciones de mesas o locales. Si el usuario ya tiene actas de votación registradas, el sistema impedirá el borrado para salvaguardar la auditoría electoral.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button
              variant="secondary"
              onClick={() => setDeleteModal({ open: false, usuario: null })}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              isLoading={deleting}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              Eliminar Usuario
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UsuariosPage;
