import React, { useState, useEffect } from 'react';
import { get } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { ShieldCheck, RefreshCw, Terminal } from 'lucide-react';
import toast from 'react-hot-toast';

const AuditoriaPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAuditoria();
  }, []);

  const fetchAuditoria = async () => {
    setLoading(true);
    try {
      const res = await get('/dashboard/auditoria');
      setLogs(res.data?.data || res.data || []);
    } catch (error) {
      console.error('Error cargando auditoría:', error);
      toast.error('Error al obtener registros de auditoría');
    } finally {
      setLoading(false);
    }
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
    return <Badge variant="pendiente">{act}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <ShieldCheck className="mr-2 text-red-600" size={28} />
            Pistas de Auditoría y Seguridad
          </h1>
          <p className="text-sm text-gray-500">Registro inmutable de todas las transacciones y operaciones en el sistema</p>
        </div>
        <Button onClick={fetchAuditoria} isLoading={loading} variant="secondary" className="flex items-center">
          <RefreshCw size={16} className="mr-1.5" />
          Actualizar Pistas
        </Button>
      </div>

      <Card>
        <Table headers={['Fecha / Hora', 'Acción', 'Entidad Afectada', 'Usuario ID', 'Dirección IP', 'Detalles']}>
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-gray-50 transition-colors text-xs">
              <td className="px-6 py-3 whitespace-nowrap text-gray-500 font-mono">
                {log.created_at ? new Date(log.created_at).toLocaleString() : '-'}
              </td>
              <td className="px-6 py-3 whitespace-nowrap font-medium">
                {formatAccion(log.accion)}
              </td>
              <td className="px-6 py-3 whitespace-nowrap font-bold text-gray-800">
                <span className="px-2 py-0.5 rounded bg-gray-100 border border-gray-200">
                  {log.tabla_afectada}
                </span>
              </td>
              <td className="px-6 py-3 whitespace-nowrap text-gray-600 font-mono">
                {log.usuario_id ? `User #${log.usuario_id}` : 'Sistema'}
              </td>
              <td className="px-6 py-3 whitespace-nowrap text-gray-500 font-mono">
                {log.ip_address || '127.0.0.1'}
              </td>
              <td className="px-6 py-3 text-gray-600 max-w-xs truncate font-mono">
                {log.datos_nuevos || log.datos_anteriores ? (
                  <span title={log.datos_nuevos || log.datos_anteriores}>
                    {log.datos_nuevos || log.datos_anteriores}
                  </span>
                ) : (
                  <span className="text-gray-400">Sin datos adicionales</span>
                )}
              </td>
            </tr>
          ))}
          {logs.length === 0 && !loading && (
            <tr>
              <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                No hay registros de auditoría disponibles en este momento.
              </td>
            </tr>
          )}
        </Table>
      </Card>
    </div>
  );
};

export default AuditoriaPage;
