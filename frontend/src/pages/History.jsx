import { useState, useEffect } from 'react';
import { Clock, History as HistoryIcon, User } from 'lucide-react';
import axios from 'axios';

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${window.location.protocol}//${window.location.hostname}/api/attendance/history`);
      setHistory(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (start, end) => {
    if (!end) return '-';
    const diff = new Date(end) - new Date(start);
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-blue-100 p-3 rounded-2xl text-blue-600">
          <HistoryIcon size={28} />
        </div>
        <h1 className="text-3xl font-bold text-slate-800">Visitor History</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm">
                <th className="p-4 font-medium">Member Name</th>
                <th className="p-4 font-medium">Phone</th>
                <th className="p-4 font-medium">Check-In Time</th>
                <th className="p-4 font-medium">Check-Out Time</th>
                <th className="p-4 font-medium">Duration</th>
                <th className="p-4 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="p-8 text-center text-slate-500 animate-pulse">Loading history data...</td></tr>
              ) : history.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-slate-500">No attendance records found.</td></tr>
              ) : (
                history.map(record => (
                  <tr key={record.ID} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium text-slate-800">
                      <div className="flex items-center gap-3">
                        {record.member.photo_url ? (
                          <img src={record.member.photo_url} alt="Profile" className="w-8 h-8 rounded-full object-cover" crossOrigin="anonymous" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">
                            {(record.member.full_name || '?').charAt(0)}
                          </div>
                        )}
                        {record.member.full_name}
                      </div>
                    </td>
                    <td className="p-4 text-slate-600">{record.member.phone}</td>
                    <td className="p-4 text-slate-600 flex items-center gap-2">
                      <Clock size={14} className="text-emerald-500"/> {formatDateTime(record.check_in_time)}
                    </td>
                    <td className="p-4 text-slate-600">
                      {record.check_out_time ? (
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-slate-400"/> {formatDateTime(record.check_out_time)}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Still inside</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-600 font-medium">
                      {formatDuration(record.check_in_time, record.check_out_time)}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        record.check_out_time ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {record.check_out_time ? 'Completed' : 'Active'}
                      </span>
                    </td>
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
