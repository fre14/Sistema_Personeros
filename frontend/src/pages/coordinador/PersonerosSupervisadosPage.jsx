import React, { useState, useEffect } from 'react';
import { get } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import SearchInput from '../../components/ui/SearchInput';
import Spinner from '../../components/ui/Spinner';
import { Users, Phone, Mail, MapPin, Inbox, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

const PersonerosSupervisadosPage = () => {
  const [personeros, setPersoneros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPersoneros = async () => {
    setLoading(true);
    try {
      let url = '/coordinador/personeros';
      if (searchTerm) url += `?q=${encodeURIComponent(searchTerm)}`;
      const res = await get(url);
      const data = res.data?.data || res.data || [];
      setPersoneros(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error cargando personeros supervisados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersoneros();
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Users className="mr-2 text-red-600" size={28} />
            Personeros Supervisados
          </h1>
          <p className="text-sm text-gray-500">
            Personeros de mesa asignados a tus locales de votación • Supervisión y contacto directo
          </p>
        </div>
      </div>

      <Card>
        <div className="mb-6 max-w-md">
          <SearchInput
            onSearch={setSearchTerm}
            placeholder="Buscar por DNI, Nombres o N° de Mesa..."
          />
        </div>

        {loading ? (
          <div className="flex justify-center p-8"><Spinner /></div>
        ) : (
          <Table headers={['Personero', 'DNI', 'Contacto', 'Local de Votación', 'N° Mesa', 'Estado Mesa', 'Acta Digital']}>
            {personeros.map((p) => (
              <tr key={p.personero_id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs mr-3">
                      {p.nombres?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{p.nombre_completo || `${p.nombres} ${p.apellidos}`}</p>
                      <p className="text-xs text-gray-400">Personero Oficial</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-gray-700">
                  {p.dni}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {p.telefono ? (
                    <a 
                      href={`tel:${p.telefono}`} 
                      className="inline-flex items-center text-red-700 hover:text-red-900 font-medium"
                    >
                      <Phone size={13} className="mr-1" />
                      {p.telefono}
                    </a>
                  ) : (
                    <span className="text-gray-400 text-xs">Sin teléfono</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  <div className="flex items-center">
                    <MapPin size={14} className="mr-1 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-800">{p.local_nombre}</p>
                      <p className="text-xs text-gray-400">{p.distrito_nombre}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-red-700">
                  Mesa {p.numero_mesa}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant={p.estado_mesa}>{p.estado_mesa}</Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {p.resultado_id ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700">
                      <CheckCircle2 size={12} className="mr-1" />
                      {p.estado_resultado}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 font-medium">Pendiente</span>
                  )}
                </td>
              </tr>
            ))}
            {personeros.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">
                  No hay personeros asignados a las mesas de tus locales todavía o no coinciden con la búsqueda.
                </td>
              </tr>
            )}
          </Table>
        )}
      </Card>
    </div>
  );
};

export default PersonerosSupervisadosPage;
