import { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Search } from 'lucide-react';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await axios.get(`${window.location.protocol}//${window.location.hostname}:3000/api/logs`);
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const actor = log.actor || log.admin_username || '';
    const role = log.role || '';
    const ip = log.ip_address || '';
    
    return actor.toLowerCase().includes(search.toLowerCase()) ||
           log.action.toLowerCase().includes(search.toLowerCase()) ||
           log.details.toLowerCase().includes(search.toLowerCase()) ||
           role.toLowerCase().includes(search.toLowerCase()) ||
           ip.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Activity className="text-blue-600" /> Audit Logs
          </h1>
          <p className="text-slate-500 mt-2">Pantau semua aktivitas yang terjadi pada sistem ini.</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Cari aktivitas..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
              <tr>
                <th className="p-4 font-medium w-48">Tanggal & Waktu</th>
                <th className="p-4 font-medium w-48">Aktor (Role)</th>
                <th className="p-4 font-medium w-40">Aksi</th>
                <th className="p-4 font-medium w-40">IP Address</th>
                <th className="p-4 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-slate-500">Memuat data log...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-slate-500">Tidak ada log aktivitas ditemukan.</td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.ID} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-sm text-slate-500">
                      {new Date(log.CreatedAt).toLocaleString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700">@{log.actor || log.admin_username || 'Unknown'}</span>
                        <span className={`text-[10px] uppercase font-bold tracking-wider mt-1 w-max px-2 py-0.5 rounded-md ${log.role === 'admin' ? 'bg-blue-100 text-blue-700' : log.role === 'member' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                          {log.role || 'Admin'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-slate-700">{log.action}</td>
                    <td className="p-4 font-mono text-xs text-slate-500">{log.ip_address || '-'}</td>
                    <td className="p-4 text-slate-600">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
