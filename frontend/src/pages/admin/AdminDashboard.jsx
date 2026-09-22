import React, { useState, useEffect } from 'react';
import { get } from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { Inbox, CheckCircle, Clock, AlertTriangle, RefreshCw, MapPin } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const AdminDashboard = () => {
  const [tipoEleccion, setTipoEleccion] = useState('provincial'); // 'provincial' | 'distrital'
  const [distritos, setDistritos] = useState([]);
  const [distritoSeleccionado, setDistritoSeleccionado] = useState('');

  const [stats, setStats] = useState({
    total_mesas: 0,
    mesas_pendientes: 0,
    mesas_reportadas: 0,
    mesas_verificadas: 0,
    mesas_observadas: 0,
    porcentaje_avance: 0,
    total_personeros: 0,
    personeros_asignados: 0,
    total_locales: 0,
    total_votos_verificados: 0,
  });
  const [votosPorCandidato, setVotosPorCandidato] = useState([]);
  const [mesasPendientes, setMesasPendientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    const fetchDistritos = async () => {
      try {
        const res = await get('/distritos');
        const lista = res.data?.data || res.data || [];
        const distritales = lista.filter(d => d.tiene_eleccion_distrital);
        setDistritos(distritales);
        if (distritales.length > 0 && !distritoSeleccionado) {
          setDistritoSeleccionado(String(distritales[0].id));
        }
      } catch (error) {
        console.error('Error cargando distritos:', error);
      }
    };
    fetchDistritos();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      let params = `?tipo_eleccion=${tipoEleccion}`;
      if (tipoEleccion === 'distrital' && distritoSeleccionado) {
        params += `&distrito_id=${distritoSeleccionado}`;
      }

      const [resumenRes, candidatosRes, pendientesRes] = await Promise.all([
        get(`/dashboard/resumen${params}`),
        get(`/dashboard/por-candidato${params}`),
        get(`/dashboard/mesas-pendientes${params}`)
      ]);

      const dataResumen = resumenRes.data?.data || resumenRes.data || {};
      setStats(dataResumen);

      const candidatosData = candidatosRes.data?.data || candidatosRes.data || [];
      setVotosPorCandidato(candidatosData.map(c => ({
        candidato: c.nombre_completo || `Lista ${c.numero_lista}`,
        votos: Number(c.total_votos || 0),
        porcentaje: Number(c.porcentaje || 0),
        organizacion: c.organizacion_politica || ''
      })));

      const pendientesData = pendientesRes.data?.data || pendientesRes.data || [];
      setMesasPendientes(pendientesData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    if (socket) {
      socket.on('resultado:nuevo', fetchDashboardData);
      socket.on('resultado:verificado', fetchDashboardData);
      socket.on('resultado:observado', fetchDashboardData);
      return () => {
        socket.off('resultado:nuevo');
        socket.off('resultado:verificado');
        socket.off('resultado:observado');
      };
    }
  }, [socket, tipoEleccion, distritoSeleccionado]);

  const pieData = [
    { name: 'Verificadas', value: Number(stats.mesas_verificadas || 0), color: '#16a34a' },
    { name: 'Reportadas', value: Number(stats.mesas_reportadas || 0), color: '#d97706' },
    { name: 'Observadas', value: Number(stats.mesas_observadas || 0), color: '#dc2626' },
    { name: 'Pendientes', value: Number(stats.mesas_pendientes || 0), color: '#9ca3af' },
  ];

  const avance = Number(stats.porcentaje_avance || 0);

  const nombreDistritoActual = tipoEleccion === 'distrital'
    ? distritos.find(d => String(d.id) === String(distritoSeleccionado))?.nombre || 'Distrital'
    : 'Provincia de Huamanga';

  return (
    <div className="space-y-6">
      {/* Header with Title and Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel de Control Electoral</h1>
          <p className="text-sm text-gray-500">{nombreDistritoActual} • Monitoreo en Tiempo Real</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Tabs Provincial / Distrital */}
          <div className="bg-gray-100 p-1 rounded-xl flex text-xs font-bold border border-gray-200">
            <button
              onClick={() => setTipoEleccion('provincial')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                tipoEleccion === 'provincial' ? 'bg-red-700 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🏛️ Elección Provincial
            </button>
            <button
              onClick={() => setTipoEleccion('distrital')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                tipoEleccion === 'distrital' ? 'bg-red-700 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🏘️ Elecciones Distritales
            </button>
          </div>

          {/* District selector if distrital */}
          {tipoEleccion === 'distrital' && (
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-xl px-2 py-1">
              <MapPin size={14} className="text-red-600" />
              <select
                value={distritoSeleccionado}
                onChange={(e) => setDistritoSeleccionado(e.target.value)}
                className="text-xs font-bold bg-transparent text-gray-800 focus:outline-none"
              >
                {distritos.map(d => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin text-red-600' : 'text-gray-500'}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <div className="flex justify-between mb-2 items-center">
          <span className="text-sm font-semibold text-gray-700">
            Avance de Cómputo ({tipoEleccion === 'provincial' ? 'Actas Provinciales' : `Actas Distritales - ${nombreDistritoActual}`})
          </span>
          <span className="text-base font-extrabold text-red-700">{avance.toFixed(2)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-red-600 h-3 rounded-full transition-all duration-500 ease-out shadow" 
            style={{ width: `${Math.min(100, Math.max(0, avance))}%` }}
          ></div>
        </div>
        <div className="mt-2 flex justify-between text-xs text-gray-500">
          <span>{stats.mesas_verificadas || 0} de {stats.total_mesas || 0} mesas computadas</span>
          <span>{stats.total_votos_contados || stats.total_votos_verificados || 0} votos procesados</span>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Mesas" value={stats.total_mesas || 0} icon={Inbox} color="red" />
        <StatCard title="Mesas Verificadas" value={stats.mesas_verificadas || 0} icon={CheckCircle} color="green" />
        <StatCard title="Mesas Reportadas" value={stats.mesas_reportadas || 0} icon={Clock} color="yellow" />
        <StatCard title="Mesas Observadas" value={stats.mesas_observadas || 0} icon={AlertTriangle} color="red" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title={`Votos por Candidato (${tipoEleccion === 'provincial' ? 'Alcaldía Provincial' : `Alcaldía Distrital - ${nombreDistritoActual}`})`}>
          <div className="h-80">
            {votosPorCandidato.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={votosPorCandidato} margin={{ top: 20, right: 30, left: 20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="candidato" angle={-15} textAnchor="end" height={50} tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name, props) => [`${value} votos (${props.payload.porcentaje}%)`, 'Total']} 
                  />
                  <Bar dataKey="votos" fill="#dc2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                Aún no hay resultados verificados para mostrar en la gráfica
              </div>
            )}
          </div>
        </Card>

        <Card title="Distribución por Estado de Mesas">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Table Mesas Pendientes de Reporte */}
      <Card title={`Mesas Pendientes de Transmisión (${tipoEleccion === 'provincial' ? 'Provincial' : `Distrital - ${nombreDistritoActual}`})`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">N° Mesa</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Local de Votación</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Electores</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mesasPendientes.slice(0, 10).map((mesa) => (
                <tr key={mesa.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">Mesa {mesa.numero_mesa}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{mesa.local_nombre || 'Local'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{mesa.total_electores_habiles} electores</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={mesa.estado}>{mesa.estado}</Badge>
                  </td>
                </tr>
              ))}
              {mesasPendientes.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-sm text-gray-500">
                    🎉 ¡Todas las mesas han sido procesadas o no hay mesas registradas!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;
