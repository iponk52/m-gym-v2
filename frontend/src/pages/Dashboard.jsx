import { Users, UserCheck, CreditCard, Activity } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('monthly'); // daily, weekly, monthly, yearly
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [filter]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:3000/api/dashboard?filter=${filter}`);
      setStats(res.data);
    } catch (error) {
      console.error("Failed to fetch dashboard stats", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Members', value: stats?.total_members || 0, subtitle: `${stats?.active_members || 0} Active • ${stats?.inactive_members || 0} Inactive`, icon: <Users size={24} className="text-blue-500" />, bg: 'bg-blue-100' },
    { title: 'New Members', value: stats?.new_members || 0, subtitle: 'New registrations', icon: <UserCheck size={24} className="text-cyan-500" />, bg: 'bg-cyan-100' },
    { title: 'Check-ins', value: stats?.active_today || 0, subtitle: 'Total gym visits', icon: <Activity size={24} className="text-emerald-500" />, bg: 'bg-emerald-100' },
    { title: 'Overdue Bills', value: stats?.overdue_bills || 0, subtitle: 'Unpaid subscriptions', icon: <CreditCard size={24} className="text-rose-500" />, bg: 'bg-rose-100' },
    { title: 'Revenue', value: `Rp ${stats?.revenue?.toLocaleString('id-ID') || 0}`, subtitle: 'Total payments received', icon: <Activity size={24} className="text-purple-500" />, bg: 'bg-purple-100' },
  ];

  const getFilterLabel = () => {
    switch(filter) {
      case 'daily': return 'Hari Ini';
      case 'weekly': return 'Minggu Ini';
      case 'monthly': return 'Bulan Ini';
      case 'yearly': return 'Tahun Ini';
      default: return 'Bulan Ini';
    }
  };

  return (
    <div className="p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-slate-800">Dashboard Overview</h1>
        
        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex gap-1">
          {['daily', 'weekly', 'monthly', 'yearly'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-slate-800 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {f === 'daily' ? 'Hari Ini' : f === 'weekly' ? 'Minggu Ini' : f === 'monthly' ? 'Bulan Ini' : 'Tahun Ini'}
            </button>
          ))}
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-slate-800"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            {statCards.map((stat, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 transition-transform hover:-translate-y-1 hover:shadow-md">
                <div className={`p-4 rounded-xl ${stat.bg}`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                  <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
                  {stat.subtitle && <p className="text-xs text-slate-400 mt-1">{stat.subtitle}</p>}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Revenue Trend ({getFilterLabel()})</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.chart_data}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `Rp ${value/1000}k`} />
                    <Tooltip 
                      formatter={(value) => [`Rp ${value.toLocaleString('id-ID')}`, 'Revenue']}
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Check-in Activity ({getFilterLabel()})</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.chart_data}>
                    <defs>
                      <linearGradient id="colorAtt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} allowDecimals={false} />
                    <Tooltip 
                      formatter={(value) => [value, 'Check-ins']}
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    />
                    <Area name="Check-ins" type="monotone" dataKey="attendance" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorAtt)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 lg:col-span-2">
              <h3 className="text-lg font-bold text-slate-800 mb-6">New Member Registrations ({getFilterLabel()})</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.chart_data}>
                    <defs>
                      <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} allowDecimals={false} />
                    <Tooltip 
                      formatter={(value) => [value, 'New Registrations']}
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    />
                    <Area name="New Members" type="monotone" dataKey="new_members" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorNew)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
