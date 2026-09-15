import React, { useState, useEffect } from 'react';
import { get, post, put, patch } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import SearchInput from '../../components/ui/SearchInput';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import toast from 'react-hot-toast';
import { Users, Plus, UserCheck, UserX, Edit2 } from 'lucide-react';

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
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 text-sm bg-white"
            >
              {rolOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
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
                  className="text-gray-600 hover:text-red-700 inline-flex items-center transition-colors"
                >
                  <Edit2 size={15} className="mr-1" />
                  Editar
                </button>
                <button
                  onClick={() => handleToggleActive(u.id, u.activo, u.nombres)}
                  className={`inline-flex items-center transition-colors ${
                    u.activo ? 'text-amber-600 hover:text-amber-800' : 'text-green-600 hover:text-green-800'
                  }`}
                >
                  {u.activo ? <UserX size={15} className="mr-1" /> : <UserCheck size={15} className="mr-1" />}
                  {u.activo ? 'Desactivar' : 'Activar'}
                </button>
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
    </div>
  );
};

export default UsuariosPage;
