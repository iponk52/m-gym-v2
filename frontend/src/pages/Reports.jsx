import { useState } from 'react';
import axios from 'axios';
import { FileText, Download, Filter, Search, Table as TableIcon } from 'lucide-react';

export default function Reports() {
  const [reportType, setReportType] = useState('members');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchReport = async (e) => {
    e?.preventDefault();
    if (!startDate || !endDate) {
      alert("Harap pilih tanggal mulai dan selesai!");
      return;
    }
    
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await axios.get(`${window.location.protocol}//${window.location.hostname}/api/reports?type=${reportType}&start=${startDate}&end=${endDate}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
      alert("Gagal mengambil laporan.");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (data.length === 0) {
      alert("Tidak ada data untuk diekspor!");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (reportType === 'members') {
      csvContent += "ID Member,Nama Lengkap,No Telepon,Status,Tanggal Daftar\n";
      data.forEach(row => {
        csvContent += `"${row.member_code}","${row.full_name}","${row.phone}","${row.status}","${new Date(row.CreatedAt).toLocaleDateString('id-ID')}"\n`;
      });
    } else if (reportType === 'visitors') {
      csvContent += "Tanggal,Jam Masuk,Jam Keluar,Nama Member,ID Member\n";
      data.forEach(row => {
        const dateStr = new Date(row.check_in_time).toLocaleDateString('id-ID');
        const timeIn = new Date(row.check_in_time).toLocaleTimeString('id-ID');
        const timeOut = row.check_out_time ? new Date(row.check_out_time).toLocaleTimeString('id-ID') : '-';
        const memberName = row.member ? row.member.full_name : 'Unknown';
        const memberCode = row.member ? row.member.member_code : '-';
        csvContent += `"${dateStr}","${timeIn}","${timeOut}","${memberName}","${memberCode}"\n`;
      });
    } else if (reportType === 'billing') {
      csvContent += "Tanggal Bayar,Member,Paket,Nominal\n";
      data.forEach(row => {
        const dateStr = new Date(row.payment_date).toLocaleDateString('id-ID');
        const memberName = row.subscription && row.subscription.member ? row.subscription.member.full_name : 'Unknown';
        const packageName = row.subscription && row.subscription.package ? row.subscription.package.name : 'Unknown';
        const amount = row.amount;
        csvContent += `"${dateStr}","${memberName}","${packageName}","Rp ${amount}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Report_${reportType}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <FileText className="text-blue-600" /> Export Laporan (Reports)
        </h1>
        <p className="text-slate-500 mt-2">Buat rekapitulasi data gym berdasarkan rentang waktu tertentu dan unduh sebagai file CSV (Excel).</p>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8">
        <form onSubmit={fetchReport} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          
          <div className="md:col-span-1">
            <label className="block text-sm font-bold text-slate-700 mb-2">Jenis Laporan</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select 
                value={reportType} 
                onChange={(e) => { setReportType(e.target.value); setHasSearched(false); setData([]); }}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 appearance-none font-medium"
              >
                <option value="members">Registrasi Member Baru</option>
                <option value="visitors">Kunjungan (Absensi)</option>
                <option value="billing">Keuangan (Billing)</option>
              </select>
            </div>
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-bold text-slate-700 mb-2">Dari Tanggal</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-bold text-slate-700 mb-2">Sampai Tanggal</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="md:col-span-1 flex gap-2">
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
            >
              <Search size={18} /> {loading ? 'Mencari...' : 'Lihat'}
            </button>
            <button 
              type="button" 
              onClick={exportToCSV}
              disabled={data.length === 0}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
            >
              <Download size={18} /> CSV
            </button>
          </div>

        </form>
      </div>

      {hasSearched && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
            <h2 className="font-bold text-slate-700 flex items-center gap-2">
              <TableIcon size={18} className="text-blue-500" /> Hasil Pencarian ({data.length} data)
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            {data.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-medium">Tidak ada data ditemukan pada rentang tanggal tersebut.</div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm">
                  <tr>
                    {reportType === 'members' && (
                      <>
                        <th className="p-4 font-bold">ID Member</th>
                        <th className="p-4 font-bold">Nama Lengkap</th>
                        <th className="p-4 font-bold">No Telepon</th>
                        <th className="p-4 font-bold">Status</th>
                        <th className="p-4 font-bold">Tgl Daftar</th>
                      </>
                    )}
                    {reportType === 'visitors' && (
                      <>
                        <th className="p-4 font-bold">Tanggal</th>
                        <th className="p-4 font-bold">Jam Masuk</th>
                        <th className="p-4 font-bold">Jam Keluar</th>
                        <th className="p-4 font-bold">Nama Member</th>
                        <th className="p-4 font-bold">ID Member</th>
                      </>
                    )}
                    {reportType === 'billing' && (
                      <>
                        <th className="p-4 font-bold">Tanggal Bayar</th>
                        <th className="p-4 font-bold">Member</th>
                        <th className="p-4 font-bold">Paket</th>
                        <th className="p-4 font-bold text-right">Nominal</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {data.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      {reportType === 'members' && (
                        <>
                          <td className="p-4 font-mono text-xs text-blue-600 font-bold">{row.member_code}</td>
                          <td className="p-4 font-bold text-slate-700">{row.full_name}</td>
                          <td className="p-4 text-slate-500">{row.phone}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${row.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{row.status}</span>
                          </td>
                          <td className="p-4 text-slate-500">{new Date(row.CreatedAt).toLocaleDateString('id-ID')}</td>
                        </>
                      )}
                      {reportType === 'visitors' && (
                        <>
                          <td className="p-4 font-medium text-slate-700">{new Date(row.check_in_time).toLocaleDateString('id-ID')}</td>
                          <td className="p-4 text-emerald-600 font-bold">{new Date(row.check_in_time).toLocaleTimeString('id-ID')}</td>
                          <td className="p-4 text-rose-600 font-bold">{row.check_out_time ? new Date(row.check_out_time).toLocaleTimeString('id-ID') : '-'}</td>
                          <td className="p-4 font-bold text-slate-700">{row.member ? row.member.full_name : 'Unknown'}</td>
                          <td className="p-4 font-mono text-xs text-slate-500">{row.member ? row.member.member_code : '-'}</td>
                        </>
                      )}
                      {reportType === 'billing' && (
                        <>
                          <td className="p-4 font-medium text-slate-700">{new Date(row.payment_date).toLocaleDateString('id-ID')}</td>
                          <td className="p-4 font-bold text-slate-700">{row.subscription?.member ? row.subscription.member.full_name : 'Unknown'}</td>
                          <td className="p-4 text-slate-500">{row.subscription?.package ? row.subscription.package.name : 'Unknown'}</td>
                          <td className="p-4 font-bold text-emerald-600 text-right">Rp {row.amount.toLocaleString('id-ID')}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
