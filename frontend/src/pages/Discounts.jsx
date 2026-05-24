import { useState, useEffect } from 'react';
import { Tag, Plus, Edit, Trash2 } from 'lucide-react';
import axios from 'axios';

export default function Discounts() {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', type: 'nominal', value: 0 });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      const res = await axios.get(`${window.location.protocol}//${window.location.hostname}/api/discounts`);
      setDiscounts(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, value: parseFloat(formData.value) };
      if (editingId) {
        await axios.put(`${window.location.protocol}//${window.location.hostname}/api/discounts/${editingId}`, payload);
      } else {
        await axios.post(`${window.location.protocol}//${window.location.hostname}/api/discounts`, payload);
      }
      setShowModal(false);
      setFormData({ name: '', description: '', type: 'nominal', value: 0 });
      setEditingId(null);
      fetchDiscounts();
    } catch (error) {
      alert('Failed to save discount');
    }
  };

  const handleEdit = (d) => {
    setFormData({ name: d.name, description: d.description, type: d.type, value: d.value });
    setEditingId(d.ID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this discount?')) {
      try {
        await axios.delete(`${window.location.protocol}//${window.location.hostname}/api/discounts/${id}`);
        fetchDiscounts();
      } catch (error) {
        alert('Failed to delete discount');
      }
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Discount Management</h1>
        <button 
          onClick={() => { setFormData({ name: '', description: '', type: 'nominal', value: 0 }); setEditingId(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/30"
        >
          <Plus size={18} /> Add Discount
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {discounts.map(d => (
            <div key={d.ID} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Tag size={20} />
                  </div>
                  <h3 className="font-bold text-slate-800">{d.name}</h3>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(d)} className="text-slate-400 hover:text-blue-500 transition-colors"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(d.ID)} className="text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
              <p className="text-slate-600 text-sm mb-4">{d.description}</p>
              <div className="mt-auto pt-4 border-t border-slate-50">
                <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-bold">
                  {d.type === 'percentage' ? `${d.value}% OFF` : `Rp ${d.value.toLocaleString()}`}
                </span>
              </div>
            </div>
          ))}
          {discounts.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-100">
              No discounts available. Create one to attract members!
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 text-slate-800">{editingId ? 'Edit Discount' : 'New Discount'}</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Discount Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="e.g. Promo Merdeka" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 min-h-[80px]" placeholder="Brief description of the discount" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Discount Type</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="nominal">Nominal (Rp)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Value</label>
                  <input required type="number" min="0" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" placeholder={formData.type === 'nominal' ? '50000' : '10'} />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-500/30">Save Discount</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
