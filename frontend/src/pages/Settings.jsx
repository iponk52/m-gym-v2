import { useState, useEffect, useRef } from 'react';
import { Save, Upload, Info, Image as ImageIcon, CreditCard, Plus, Edit, Trash2, Wallet, Smartphone, Landmark, QrCode, Users } from 'lucide-react';
import axios from 'axios';

export default function Settings() {
  const [settings, setSettings] = useState({
    name: '',
    address: '',
    about: '',
    email: '',
    phone: '',
    logo_url: '',
    hero_title: '',
    hero_subtitle: '',
    site_address: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_email: '',
    smtp_password: ''
  });
  
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [methodForm, setMethodForm] = useState({ name: '', account_name: '', account_number: '', icon: 'Wallet' });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('general'); // 'general', 'payment', 'admins'
  const [admins, setAdmins] = useState([]);
  const [adminModal, setAdminModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [adminForm, setAdminForm] = useState({ username: '', password: '' });

  useEffect(() => {
    fetchSettings();
    fetchPaymentMethods();
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const res = await axios.get(`${window.location.protocol}//${window.location.hostname}/api/admins`);
      setAdmins(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${window.location.protocol}//${window.location.hostname}/api/settings`);
      setSettings(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const res = await axios.get(`${window.location.protocol}//${window.location.hostname}/api/payment-methods`);
      setPaymentMethods(res.data);
    } catch (error) {
      console.error("Failed to fetch payment methods");
    }
  };

  const handleUpdateText = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });
    try {
      const res = await axios.put(`${window.location.protocol}//${window.location.hostname}/api/settings`, settings);
      setSettings(res.data.setting);
      setMessage({ text: 'Settings updated successfully!', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      setMessage({ text: 'Failed to update settings', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('logo', file);

    try {
      const res = await axios.post(`${window.location.protocol}//${window.location.hostname}/api/settings/logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSettings(prev => ({ ...prev, logo_url: res.data.logo_url }));
      setMessage({ text: 'Logo updated successfully!', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      setMessage({ text: 'Failed to upload logo', type: 'error' });
    }
  };

  const handleSaveMethod = async (e) => {
    e.preventDefault();
    try {
      if (editingMethod) {
        await axios.put(`${window.location.protocol}//${window.location.hostname}/api/payment-methods/${editingMethod.ID}`, methodForm);
      } else {
        await axios.post(`${window.location.protocol}//${window.location.hostname}/api/payment-methods`, methodForm);
      }
      fetchPaymentMethods();
      setIsModalOpen(false);
    } catch (error) {
      alert('Failed to save payment method');
    }
  };

  const handleDeleteMethod = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payment method?')) return;
    try {
      await axios.delete(`${window.location.protocol}//${window.location.hostname}/api/payment-methods/${id}`);
      fetchPaymentMethods();
    } catch (error) {
      alert('Failed to delete payment method');
    }
  };

  const handleSaveAdmin = async (e) => {
    e.preventDefault();
    try {
      if (editingAdmin) {
        await axios.put(`${window.location.protocol}//${window.location.hostname}/api/admins/${editingAdmin.ID}`, adminForm);
      } else {
        await axios.post(`${window.location.protocol}//${window.location.hostname}/api/admins`, adminForm);
      }
      fetchAdmins();
      setAdminModal(false);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save admin');
    }
  };

  const handleDeleteAdmin = async (id) => {
    if (!window.confirm('Are you sure you want to delete this admin account?')) return;
    try {
      await axios.delete(`${window.location.protocol}//${window.location.hostname}/api/admins/${id}`);
      fetchAdmins();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete admin');
    }
  };

  const openAdminModal = (admin = null) => {
    if (admin) {
      setEditingAdmin(admin);
      setAdminForm({ username: admin.username, password: '' });
    } else {
      setEditingAdmin(null);
      setAdminForm({ username: '', password: '' });
    }
    setAdminModal(true);
  };

  const openMethodModal = (method = null) => {
    if (method) {
      setEditingMethod(method);
      setMethodForm({ name: method.name, account_name: method.account_name, account_number: method.account_number, icon: method.icon || 'Wallet' });
    } else {
      setEditingMethod(null);
      setMethodForm({ name: '', account_name: '', account_number: '', icon: 'Wallet' });
    }
    setIsModalOpen(true);
  };

  const getIconComponent = (iconName) => {
    switch (iconName) {
      case 'Smartphone': return <Smartphone size={24} className="text-blue-500" />;
      case 'Landmark': return <Landmark size={24} className="text-emerald-500" />;
      case 'QrCode': return <QrCode size={24} className="text-purple-500" />;
      default: return <Wallet size={24} className="text-amber-500" />;
    }
  };

  if (loading) return <div className="p-8 text-slate-500">Loading settings...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Gym Settings</h1>
        <p className="text-slate-500 mt-2">Manage your gym's public profile, contact information, and payment methods.</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl mb-6 font-medium ${message.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-8 overflow-x-auto hide-scrollbar">
        <button 
          onClick={() => setActiveTab('general')} 
          className={`py-3 px-6 font-bold text-sm whitespace-nowrap border-b-2 transition-colors ${activeTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          General Info
        </button>
        <button 
          onClick={() => setActiveTab('payment')} 
          className={`py-3 px-6 font-bold text-sm whitespace-nowrap border-b-2 transition-colors ${activeTab === 'payment' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Payment Methods
        </button>
        <button 
          onClick={() => setActiveTab('admins')} 
          className={`py-3 px-6 font-bold text-sm whitespace-nowrap border-b-2 transition-colors ${activeTab === 'admins' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Admin Accounts
        </button>
      </div>

      {activeTab === 'general' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Left Col: Logo Upload */}
          <div className="md:col-span-1">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center">
            <h2 className="text-lg font-bold text-slate-800 mb-6">Gym Logo</h2>
            
            <div className="w-40 h-40 rounded-2xl border-4 border-slate-50 bg-slate-100 overflow-hidden mb-6 relative group flex items-center justify-center">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="Gym Logo" className="w-full h-full object-contain p-2" crossOrigin="anonymous" />
              ) : (
                <ImageIcon size={48} className="text-slate-300" />
              )}
            </div>

            <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl font-bold transition-colors"
            >
              <Upload size={18} /> Upload New Logo
            </button>
            <p className="text-xs text-slate-400 mt-4">Recommended size: 500x500px (PNG/JPG)</p>
          </div>
        </div>

        {/* Right Col: Text Profile */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Info size={20} className="text-blue-500" /> General Information
            </h2>

            <form onSubmit={handleUpdateText} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Gym Name</label>
                  <input 
                    type="text" 
                    value={settings.name} 
                    onChange={e => setSettings({...settings, name: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" 
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                  <input 
                    type="text" 
                    value={settings.phone} 
                    onChange={e => {
                      let val = e.target.value;
                      if (val.startsWith('0')) val = '62' + val.substring(1);
                      else if (val.startsWith('+62')) val = '62' + val.substring(3);
                      setSettings({...settings, phone: val});
                    }}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                  <input 
                    type="email" 
                    value={settings.email} 
                    onChange={e => setSettings({...settings, email: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" 
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Full Address</label>
                  <textarea 
                    value={settings.address} 
                    onChange={e => setSettings({...settings, address: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 min-h-[80px]" 
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Site URL (Address Site)</label>
                  <input 
                    type="url" 
                    value={settings.site_address} 
                    onChange={e => setSettings({...settings, site_address: e.target.value})}
                    placeholder="https://gym.menet.my.id"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" 
                  />
                  <p className="text-xs text-slate-500 mt-2">Digunakan sebagai awalan link (seperti link login/reset) yang dikirim ke WhatsApp member.</p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">About / Description</label>
                  <textarea 
                    value={settings.about} 
                    onChange={e => setSettings({...settings, about: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 min-h-[100px]" 
                    placeholder="Short description about the gym facilities and vision."
                  />
                </div>

                <div className="md:col-span-2 pt-4 border-t border-slate-100">
                  <h3 className="text-md font-bold text-slate-800 mb-4">SMTP Email Configuration</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">SMTP Host</label>
                  <input 
                    type="text" 
                    value={settings.smtp_host || ''} 
                    onChange={e => setSettings({...settings, smtp_host: e.target.value})}
                    placeholder="e.g. smtp.gmail.com"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">SMTP Port</label>
                  <input 
                    type="number" 
                    value={settings.smtp_port || ''} 
                    onChange={e => setSettings({...settings, smtp_port: parseInt(e.target.value) || 0})}
                    placeholder="e.g. 587 or 465"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">SMTP Email User</label>
                  <input 
                    type="email" 
                    value={settings.smtp_email || ''} 
                    onChange={e => setSettings({...settings, smtp_email: e.target.value})}
                    placeholder="your-email@gmail.com"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">SMTP Password / App Password</label>
                  <input 
                    type="password" 
                    value={settings.smtp_password || ''} 
                    onChange={e => setSettings({...settings, smtp_password: e.target.value})}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" 
                  />
                </div>

                <div className="md:col-span-2 pt-4 border-t border-slate-100">
                  <h3 className="text-md font-bold text-slate-800 mb-4">Homepage Settings (Public)</h3>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Hero Title</label>
                  <input 
                    type="text" 
                    value={settings.hero_title || ''} 
                    onChange={e => setSettings({...settings, hero_title: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" 
                    placeholder="e.g. Raih Tubuh Idealmu Sekarang!"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Hero Subtitle</label>
                  <textarea 
                    value={settings.hero_subtitle || ''} 
                    onChange={e => setSettings({...settings, hero_subtitle: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 min-h-[80px]" 
                    placeholder="e.g. Fasilitas premium, pelatih profesional, dan lingkungan yang mendukung..."
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/30 flex items-center gap-2 disabled:opacity-50"
                >
                  <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      )}
      {/* Payment Methods Section */}
      {activeTab === 'payment' && (
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <CreditCard size={20} className="text-blue-500" /> Payment Accounts (Rekening Pembayaran)
          </h2>
          <button 
            onClick={() => openMethodModal()}
            className="flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-xl font-bold transition-colors"
          >
            <Plus size={18} /> Add Account
          </button>
        </div>

        {paymentMethods.length === 0 ? (
          <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            No payment methods added yet. Members won't be able to pay via transfer.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paymentMethods.map(method => (
              <div key={method.ID} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl shadow-sm">
                    {getIconComponent(method.icon)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{method.name}</h4>
                    <p className="text-sm text-slate-500">{method.account_number} • {method.account_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openMethodModal(method)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors">
                    <Edit size={18} />
                  </button>
                  <button onClick={() => handleDeleteMethod(method.ID)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Admin Accounts Section */}
      {activeTab === 'admins' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Users size={20} className="text-blue-500" /> Admin Accounts
            </h2>
            <button 
              onClick={() => openAdminModal()}
              className="flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-xl font-bold transition-colors"
            >
              <Plus size={18} /> Add Admin
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {admins.map(admin => (
              <div key={admin.ID} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl shadow-sm">
                    <Users size={24} className="text-slate-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{admin.username}</h4>
                    <p className="text-sm text-slate-500">Role: {admin.role || 'admin'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openAdminModal(admin)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors">
                    <Edit size={18} />
                  </button>
                  <button onClick={() => handleDeleteAdmin(admin.ID)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Payment Method */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">{editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}</h2>
            </div>
            
            <form onSubmit={handleSaveMethod} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Method Name (e.g. Gopay, BCA)</label>
                <input 
                  type="text" 
                  value={methodForm.name} 
                  onChange={e => setMethodForm({...methodForm, name: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" 
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Account Name (Atas Nama)</label>
                <input 
                  type="text" 
                  value={methodForm.account_name} 
                  onChange={e => setMethodForm({...methodForm, account_name: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" 
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Account Number (No Rek/HP)</label>
                <input 
                  type="text" 
                  value={methodForm.account_number} 
                  onChange={e => setMethodForm({...methodForm, account_number: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" 
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Icon Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {['Wallet', 'Smartphone', 'Landmark', 'QrCode'].map(iconName => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setMethodForm({...methodForm, icon: iconName})}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border ${methodForm.icon === iconName ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                    >
                      {getIconComponent(iconName)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 px-4 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/30"
                >
                  {editingMethod ? 'Update Method' : 'Add Method'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Admin */}
      {adminModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">{editingAdmin ? 'Edit Admin' : 'Add Admin'}</h2>
            </div>
            
            <form onSubmit={handleSaveAdmin} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
                <input 
                  type="text" 
                  value={adminForm.username} 
                  onChange={e => setAdminForm({...adminForm, username: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" 
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Password {editingAdmin && '(Kosongkan jika tidak ingin ganti)'}</label>
                <input 
                  type="password" 
                  value={adminForm.password} 
                  onChange={e => setAdminForm({...adminForm, password: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" 
                  required={!editingAdmin}
                />
              </div>

              <div className="pt-6 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setAdminModal(false)}
                  className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 px-4 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/30"
                >
                  {editingAdmin ? 'Update Admin' : 'Add Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
