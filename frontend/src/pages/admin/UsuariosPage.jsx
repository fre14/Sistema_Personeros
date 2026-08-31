import React, { useState, useEffect } from 'react';
import { get, post, put } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import SearchInput from '../../components/ui/SearchInput';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import toast from 'react-hot-toast';

const UsuariosPage = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Mocks for basic functionality since endpoints aren't strictly defined
  useEffect(() => {
    fetchUsuarios();
  }, [searchTerm]);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const res = await get(`/usuarios?search=${searchTerm}`);
      setUsuarios(res.data.data || res.data); // Adjust based on pagination wrapper
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
        <Button onClick={() => setModalOpen(true)}>Nuevo Usuario</Button>
      </div>

      <Card>
        <div className="mb-4 w-full md:w-1/3">
          <SearchInput onSearch={setSearchTerm} placeholder="Buscar por DNI o Nombre..." />
        </div>
        
        <Table headers={['DNI', 'Nombre', 'Apellidos', 'Rol', 'Estado', 'Acciones']}>
          {usuarios.map(u => (
            <tr key={u.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.dni}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.nombres}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.apellidos}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{u.rol}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {u.activo ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button className="text-indigo-600 hover:text-indigo-900 mr-3">Editar</button>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo Usuario">
        <div className="space-y-4">
          <Input label="DNI" required />
          <Input label="Nombres" required />
          <Input label="Apellidos" required />
          <Select label="Rol" options={[{label: 'Admin', value: 'admin'}, {label: 'Coordinador', value: 'coordinador'}, {label: 'Personero', value: 'personero'}]} />
          <Input label="Contraseña" type="password" required />
        </div>
        <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
          <Button className="w-full sm:col-start-2">Guardar</Button>
          <Button variant="secondary" className="w-full mt-3 sm:mt-0 sm:col-start-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
        </div>
      </Modal>
    </div>
  );
};

export default UsuariosPage;
