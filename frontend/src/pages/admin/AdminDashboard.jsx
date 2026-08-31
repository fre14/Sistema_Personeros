import React, { useState, useEffect } from 'react';
import { get } from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { Inbox, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalMesas: 0,
    pendientes: 0,
    reportadas: 0,
    verificadas: 0,
    observadas: 0,
    avance: 0,
  });
  const [votosPorCandidato, setVotosPorCandidato] = useState([]);
  const [ultimasMesas, setUltimasMesas] = useState([]);
  const { socket } = useSocket();

  const fetchDashboardData = async () => {
    try {
      const [statsRes, chartRes, ultimasRes] = await Promise.all([
        get('/dashboard/stats'),
        get('/dashboard/charts'),
        get('/dashboard/ultimas-mesas')
      ]);
      setStats(statsRes.data);
      setVotosPorCandidato(chartRes.data.votos);
      setUltimasMesas(ultimasRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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
  }, [socket]);

  const pieData = [
    { name: 'Verificadas', value: stats.verificadas, color: '#10b981' },
    { name: 'Pendientes', value: stats.pendientes, color: '#9ca3af' },
    { name: 'Reportadas', value: stats.reportadas, color: '#f59e0b' },
    { name: 'Observadas', value: stats.observadas, color: '#f97316' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      </div>

      {/* Progress Bar */}
      <Card>
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Avance General (Mesas Verificadas)</span>
          <span className="text-sm font-medium text-blue-600">{stats.avance.toFixed(2)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${stats.avance}%` }}></div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Mesas" value={stats.totalMesas} icon={Inbox} color="blue" />
        <StatCard title="Verificadas" value={stats.verificadas} icon={CheckCircle} color="green" />
        <StatCard title="Pendientes" value={stats.pendientes} icon={Clock} color="gray" />
        <StatCard title="Observadas" value={stats.observadas} icon={AlertTriangle} color="red" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Votos por Candidato (Proyección)">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={votosPorCandidato} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="candidato" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="votos" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Estado de Mesas">
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

      {/* Table Últimas Mesas */}
      <Card title="Últimas Mesas Reportadas">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mesa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Local</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ultimasMesas.map((mesa) => (
                <tr key={mesa.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{mesa.numero_mesa}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{mesa.local_nombre}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(mesa.fecha_registro).toLocaleTimeString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={mesa.estado}>{mesa.estado}</Badge>
                  </td>
                </tr>
              ))}
              {ultimasMesas.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500">No hay datos recientes</td>
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
