import { useState, useEffect } from 'react';
import { Package, Plus, Edit, Trash2 } from 'lucide-react';
import axios from 'axios';

export default function Packages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', price: '' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await axios.get(`${window.location.protocol}//${window.location.hostname}/api/packages`);
      setPackages(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price)
      };

      if (editingId) {
        await axios.put(`${window.location.protocol}//${window.location.hostname}/api/packages/${editingId}`, payload);
      } else {
        await axios.post(`${window.location.protocol}//${window.location.hostname}/api/packages`, payload);
      }
      setShowModal(false);
      setFormData({ name: '', description: '', price: '' });
      setEditingId(null);
      fetchPackages();
    } catch (error) {
      alert('Failed to save package');
    }
  };

  const handleEdit = (pkg) => {
    setFormData({ name: pkg.name, description: pkg.description, price: pkg.price.toString() });
    setEditingId(pkg.ID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this package?')) {
      try {
        await axios.delete(`${window.location.protocol}//${window.location.hostname}/api/packages/${id}`);
        fetchPackages();
      } catch (error) {
        alert('Failed to delete package');
      }
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Gym Packages</h1>
        <button 
          onClick={() => { setFormData({ name: '', description: '', price: '' }); setEditingId(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/30"
        >
          <Plus size={18} /> New Package
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {packages.map(pkg => (
            <div key={pkg.ID} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Package size={20} />
                  </div>
                  <h3 className="font-bold text-slate-800">{pkg.name}</h3>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(pkg)} className="text-slate-400 hover:text-blue-500 transition-colors"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(pkg.ID)} className="text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
              <p className="text-slate-600 text-sm flex-1 mb-4">{pkg.description || 'No description provided.'}</p>
              <div className="text-xl font-bold text-blue-600">
                Rp {pkg.price.toLocaleString('id-ID')}
              </div>
            </div>
          ))}
          {packages.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-100">
              No packages found. Create your first package!
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 text-slate-800">{editingId ? 'Edit Package' : 'New Package'}</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Package Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="e.g. Paket 1 Bulan" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="Keterangan paket" rows="3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Price (Rp)</label>
                <input required type="number" min="0" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="150000" />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-500/30">Save Package</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
