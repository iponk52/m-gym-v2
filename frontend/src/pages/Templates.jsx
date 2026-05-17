import { useState, useEffect } from 'react';
import { MessageSquare, Plus, Edit, Trash2 } from 'lucide-react';
import axios from 'axios';

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '', type: 'umum' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await axios.get(`${window.location.protocol}//${window.location.hostname}/api/templates`);
      setTemplates(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${window.location.protocol}//${window.location.hostname}/api/templates/${editingId}`, formData);
      } else {
        await axios.post(`${window.location.protocol}//${window.location.hostname}/api/templates`, formData);
      }
      setShowModal(false);
      setFormData({ title: '', content: '', type: 'umum' });
      setEditingId(null);
      fetchTemplates();
    } catch (error) {
      alert('Failed to save template');
    }
  };

  const handleEdit = (t) => {
    setFormData({ title: t.title, content: t.content, type: t.type || 'umum' });
    setEditingId(t.ID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this template?')) {
      try {
        await axios.delete(`${window.location.protocol}//${window.location.hostname}/api/templates/${id}`);
        fetchTemplates();
      } catch (error) {
        alert('Failed to delete template');
      }
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Message Templates</h1>
        <button 
          onClick={() => { setFormData({ title: '', content: '', type: 'umum' }); setEditingId(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/30"
        >
          <Plus size={18} /> New Template
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {templates.map(t => (
            <div key={t.ID} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      {t.title}
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full uppercase tracking-wider">{t.type}</span>
                    </h3>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(t)} className="text-slate-400 hover:text-blue-500 transition-colors"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(t.ID)} className="text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
              <p className="text-slate-600 text-sm flex-1 whitespace-pre-wrap leading-relaxed">{t.content}</p>
            </div>
          ))}
          {templates.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-100">
              No templates found. Create your first template!
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 text-slate-800">{editingId ? 'Edit Template' : 'New Template'}</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="e.g. Tagihan Overdue" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tipe Pesan (Mapping)</label>
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="umum">Umum (Lainnya)</option>
                  <option value="member">Member (Pesan umum dasbor member)</option>
                  <option value="tagihan">Tagihan (Untuk penagihan expired)</option>
                  <option value="lunas">Lunas (Kwitansi pembayaran)</option>
                  <option value="registrasi">Registrasi (Pendaftaran Member Baru via Home)</option>
                  <option value="acc">ACC (Persetujuan Pendaftaran Member)</option>
                  <option value="reset">Reset Password (Kirim link reset via WA)</option>
                  <option value="bayar">Konfirmasi Bayar (Dari Member ke Admin)</option>
                </select>
                <p className="text-xs text-slate-500 mt-2">Pilih tipe spesifik agar sistem bisa menggunakannya secara otomatis pada tombol terkait.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Message Content</label>
                <textarea required value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 min-h-[150px]" placeholder="Halo {{nama}}, langganan Anda akan habis pada {{jatuh_tempo}}." />
                <p className="text-xs text-slate-500 mt-2">Variables: <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600">{"{{nama}}"}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600">{"{{id_member}}"}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600">{"{{jatuh_tempo}}"}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600">{"{{harga_paket}}"}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600">{"{{tagihan}}"}</code>. <br/>Untuk tipe Registrasi: <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-600">{"{{nama_gym}}"}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-600">{"{{phone}}"}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-600">{"{{dob}}"}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-600">{"{{address}}"}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-600">{"{{paket}}"}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-600">{"{{harga}}"}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-600">{"{{metode_pembayaran}}"}</code>. <br/>Untuk tipe ACC: <code className="bg-slate-100 px-1 py-0.5 rounded text-purple-600">{"{{nama}}"}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-purple-600">{"{{password}}"}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-purple-600">{"{{link_login}}"}</code>. <br/>Untuk tipe Reset Password: <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">{"{{nama}}"}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">{"{{link_reset}}"}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">{"{{nama_gym}}"}</code>. <br/>Untuk tipe Konfirmasi Bayar: <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600">{"{{nama}}"}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600">{"{{id_member}}"}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600">{"{{total}}"}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600">{"{{metode_pembayaran}}"}</code>.</p>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-500/30">Save Template</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
