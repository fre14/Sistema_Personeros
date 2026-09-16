import React, { useState, useEffect } from 'react';
import { get } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import SearchInput from '../../components/ui/SearchInput';
import { ShieldCheck, RefreshCw, Eye, User, Calendar, Database, Activity, Laptop } from 'lucide-react';
import toast from 'react-hot-toast';

const AuditoriaPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTabla, setSelectedTabla] = useState('');
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedLog, setSelectedLog] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchAuditoria();
  }, [page, selectedTabla]);

  const fetchAuditoria = async () => {
    setLoading(true);
    try {
      let url = `/dashboard/auditoria?page=${page}&limit=25`;
      if (selectedTabla) url += `&tabla=${selectedTabla}`;
      if (searchTerm) url += `&q=${encodeURIComponent(searchTerm)}`;

      const res = await get(url);
      const data = res.data?.data || res.data || [];
      const meta = res.data?.meta || {};
      
      setLogs(Array.isArray(data) ? data : []);
      if (meta.total !== undefined) {
        setTotalRecords(meta.total);
      }
    } catch (error) {
      console.error('Error cargando auditoría:', error);
      toast.error('Error al obtener registros de auditoría');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchAuditoria();
  };

  const formatAccion = (accion) => {
    const act = (accion || '').toUpperCase();
    if (act.includes('CREATE') || act.includes('INSERT')) {
      return <Badge variant="verificada">CREACIÓN</Badge>;
    }
    if (act.includes('UPDATE') || act.includes('MODIF')) {
      return <Badge variant="reportada">MODIFICACIÓN</Badge>;
    }
    if (act.includes('DELETE') || act.includes('ELIMIN')) {
      return <Badge variant="observada">ELIMINACIÓN</Badge>;
    }
    return <Badge variant="pendiente">{act || 'OPERACIÓN'}</Badge>;
  };

  const stringifyData = (data) => {
    if (!data) return '';
    if (typeof data === 'string') return data;
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const getPreviewText = (log) => {
    const obj = log.datos_nuevos || log.datos_anteriores;
    if (!obj) return 'Sin cambios de campos';
    if (typeof obj === 'string') return obj;
    try {
      const keys = Object.keys(obj).slice(0, 4);
      return keys.map(k => `${k}: ${typeof obj[k] === 'object' ? '...' : obj[k]}`).join(' | ');
    } catch {
      return 'Datos registrados';
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalRecords / 25));

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center">
            <ShieldCheck className="mr-2 text-red-600" size={28} />
            Pistas de Auditoría y Seguridad
          </h1>
          <p className="text-sm text-gray-500">Registro inmutable de todas las operaciones, validaciones y cambios en el sistema</p>
        </div>
        <Button onClick={fetchAuditoria} isLoading={loading} variant="secondary" className="flex items-center shadow-sm">
          <RefreshCw size={16} className="mr-1.5" />
          Actualizar Pistas
        </Button>
      </div>

      {/* Barra de Filtros */}
      <Card>
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full md:w-auto">
            <SearchInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por usuario, DNI, tabla, IP o acción..."
            />
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <select
              value={selectedTabla}
              onChange={(e) => { setSelectedTabla(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
            >
              <option value="">Todas las Entidades</option>
              <option value="resultados_mesa">Resultados de Mesa</option>
              <option value="mesas_sufragio">Mesas de Sufragio</option>
              <option value="usuarios">Usuarios</option>
              <option value="asignacion_personeros">Asignación Personeros</option>
              <option value="asignacion_coordinadores">Asignación Coordinadores</option>
              <option value="candidatos">Candidatos</option>
            </select>

            <Button type="submit" variant="primary">
              Buscar
            </Button>
          </div>
        </form>
      </Card>

      {/* Tabla de Registros */}
      <Card>
        <div className="overflow-x-auto">
          <Table headers={['Fecha / Hora', 'Acción', 'Entidad Afectada', 'Usuario Responsable', 'IP / Origen', 'Detalle Operación', 'Acciones']}>
            {logs.map((log) => {
              const fechaStr = log.fecha || log.created_at;
              return (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors text-xs">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600 font-mono">
                    {fechaStr ? new Date(fechaStr).toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium">
                    {formatAccion(log.accion)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-bold text-gray-800">
                    <span className="px-2 py-0.5 rounded bg-gray-100 border border-gray-200">
                      {log.tabla_afectada}
                    </span>
                    {log.registro_id ? <span className="ml-1 text-gray-500 font-normal">#{log.registro_id}</span> : null}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-800">
                    <div className="font-bold">{log.usuario_nombre || `Usuario #${log.usuario_id || 'Sistema'}`}</div>
                    <div className="text-[11px] text-gray-500 font-mono">
                      {log.usuario_dni ? `DNI: ${log.usuario_dni}` : ''} {log.usuario_rol ? `• ${log.usuario_rol}` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500 font-mono">
                    {log.ip_address || '127.0.0.1'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate font-mono" title={getPreviewText(log)}>
                    {getPreviewText(log)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex items-center text-xs py-1 px-2.5 font-bold"
                      onClick={() => { setSelectedLog(log); setModalOpen(true); }}
                    >
                      <Eye size={13} className="mr-1 text-red-600" />
                      Ver Cambio
                    </Button>
                  </td>
                </tr>
              );
            })}
            {logs.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">
                  No hay registros de auditoría que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </Table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-xs text-gray-600">
            <span>Página {page} de {totalPages} ({totalRecords} operaciones registradas)</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal de Detalle de Operación Auditada */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`Pista de Auditoría #${selectedLog?.id || ''}`} size="lg">
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div>
                <span className="text-gray-500 block">Acción</span>
                <span className="font-extrabold">{selectedLog.accion}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Entidad / ID</span>
                <span className="font-extrabold">{selectedLog.tabla_afectada} #{selectedLog.registro_id}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Usuario</span>
                <span className="font-extrabold truncate block">{selectedLog.usuario_nombre || `ID: ${selectedLog.usuario_id}`}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Fecha y Hora</span>
                <span className="font-extrabold font-mono">{new Date(selectedLog.fecha || selectedLog.created_at).toLocaleString()}</span>
              </div>
            </div>

            {selectedLog.user_agent && (
              <div className="p-2 bg-gray-50 rounded border border-gray-200 text-[11px] text-gray-500 font-mono">
                <span className="font-bold text-gray-700">User Agent:</span> {selectedLog.user_agent}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Valores Anteriores */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span> Datos Anteriores
                </h4>
                <div className="bg-gray-900 text-gray-200 p-3 rounded-lg font-mono text-xs max-h-72 overflow-y-auto">
                  {selectedLog.datos_anteriores ? (
                    <pre className="whitespace-pre-wrap">{stringifyData(selectedLog.datos_anteriores)}</pre>
                  ) : (
                    <span className="text-gray-500 italic">No aplica (Registro nuevo)</span>
                  )}
                </div>
              </div>

              {/* Valores Nuevos */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Datos Nuevos
                </h4>
                <div className="bg-gray-900 text-emerald-300 p-3 rounded-lg font-mono text-xs max-h-72 overflow-y-auto">
                  {selectedLog.datos_nuevos ? (
                    <pre className="whitespace-pre-wrap">{stringifyData(selectedLog.datos_nuevos)}</pre>
                  ) : (
                    <span className="text-gray-500 italic">No aplica (Registro eliminado)</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-200">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AuditoriaPage;
