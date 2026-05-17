import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Edit, QrCode, X, MessageCircle, User, Download, Trash2, Ban, RefreshCw, Key } from 'lucide-react';
import axios from 'axios';
import * as htmlToImage from 'html-to-image';
import { QRCodeSVG } from 'qrcode.react';
import { useSettings } from '../context/SettingsContext';

export default function Members() {
  const [members, setMembers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { gymSettings } = useSettings();
  
  const [showFormModal, setShowFormModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [editing, setEditing] = useState(false);
  const cardRef = useRef(null);
  
  const [formData, setFormData] = useState({
    full_name: '', phone: '', email: '', address: '', dob: '', gender: 'Male', start_date: '', end_date: '', package_id: '', discount_id: ''
  });
  const [fieldErrors, setFieldErrors] = useState({ phone: '', email: '' });

  useEffect(() => {
    fetchMembers();
    fetchPackages();
    fetchDiscounts();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await axios.get(`${window.location.protocol}//${window.location.hostname}/api/packages`);
      setPackages(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchDiscounts = async () => {
    try {
      const res = await axios.get(`${window.location.protocol}//${window.location.hostname}/api/discounts`);
      setDiscounts(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await axios.get(`${window.location.protocol}//${window.location.hostname}/api/members`);
      setMembers(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (member = null) => {
    if (member) {
      setEditing(true);
      setSelectedMember(member);
      
      const activeSub = member.subscriptions?.find(s => s.status === 'Active') || member.subscriptions?.[0];

      setFormData({
        full_name: member.full_name,
        phone: member.phone,
        email: member.email,
        address: member.address,
        dob: member.dob ? member.dob.split('T')[0] : '',
        gender: member.gender,
        start_date: activeSub && activeSub.start_date ? activeSub.start_date.split('T')[0] : '',
        end_date: activeSub && activeSub.end_date ? activeSub.end_date.split('T')[0] : '',
        package_id: activeSub && activeSub.package_id ? activeSub.package_id : '',
        discount_id: activeSub && activeSub.discount_id ? activeSub.discount_id : ''
      });
    } else {
      setEditing(false);
      setSelectedMember(null);
      setFormData({
        full_name: '', phone: '', email: '', address: '', dob: '', gender: 'Male', start_date: '', end_date: '', package_id: '', discount_id: ''
      });
    }
    setShowFormModal(true);
  };

  const validateDuplicate = async (field, value) => {
    if (!value) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
      return;
    }
    
    // Jangan validasi jika sedang edit, karena datanya milik dia sendiri
    if (editing) return;

    try {
      const res = await axios.get(`${window.location.protocol}//${window.location.hostname}/api/public/check-duplicate?field=${field}&value=${encodeURIComponent(value)}`);
      if (res.data.exists) {
        const errorMsgs = {
          phone: 'Nomor telepon sudah terdaftar',
          email: 'Alamat email sudah terdaftar'
        };
        setFieldErrors(prev => ({ ...prev, [field]: errorMsgs[field] }));
      } else {
        setFieldErrors(prev => ({ ...prev, [field]: '' }));
      }
    } catch (err) {
      console.error('Error checking duplicate', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (payload.package_id) {
        payload.package_id = parseInt(payload.package_id);
      } else {
        delete payload.package_id;
      }
      if (payload.discount_id) {
        payload.discount_id = parseInt(payload.discount_id);
      } else {
        delete payload.discount_id;
      }

      if (editing && selectedMember) {
        await axios.put(`${window.location.protocol}//${window.location.hostname}/api/members/admin/${selectedMember.ID}`, payload);
      } else {
        await axios.post(`${window.location.protocol}//${window.location.hostname}/api/members/register`, payload);
      }
      setShowFormModal(false);
      fetchMembers();
    } catch (error) {
      alert(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleDownloadCard = async () => {
    if (cardRef.current && selectedMember) {
      try {
        const dataUrl = await htmlToImage.toPng(cardRef.current, { pixelRatio: 2 });
        const link = document.createElement('a');
        link.download = `${gymSettings?.name || 'M-GYM'}-Card-${selectedMember.full_name.replace(/\s+/g, '-')}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Failed to generate card image', err);
        alert('Gagal menyimpan kartu. Silakan coba lagi.');
      }
    }
  };

  const handleManualScan = async (qr_code) => {
    try {
      const res = await axios.post(`${window.location.protocol}//${window.location.hostname}/api/attendance/scan`, { qr_code });
      fetchMembers();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to scan');
    }
  };

  const handleApprove = async (member) => {
    if (window.confirm(`Apakah member baru ${member.full_name} sudah bayar?`)) {
      try {
        const res = await axios.put(`${window.location.protocol}//${window.location.hostname}/api/members/approve/${member.ID}`);
        alert('Member berhasil di-ACC dan diaktifkan!');
        fetchMembers();
        
        if (res.data.text && res.data.phone) {
          let formattedPhone = res.data.phone.replace(/\D/g, '');
          if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1);
          const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(res.data.text)}`;
          window.open(url, '_blank');
        }
      } catch (error) {
        alert(error.response?.data?.error || 'Gagal melakukan ACC');
      }
    }
  };

  const handleSendPassword = async (member) => {
    if (window.confirm(`Kirim password via WhatsApp ke ${member.full_name}?`)) {
      try {
        const res = await axios.post(`${window.location.protocol}//${window.location.hostname}/api/members/send-password/${member.ID}`);
        if (res.data.text && res.data.phone) {
          let formattedPhone = res.data.phone.replace(/\D/g, '');
          if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1);
          const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(res.data.text)}`;
          window.open(url, '_blank');
        }
      } catch (err) {
        alert('Gagal membuat pesan password');
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus permanen member ini?')) {
      try {
        await axios.delete(`${window.location.protocol}//${window.location.hostname}/api/members/${id}`);
        fetchMembers();
      } catch (error) {
        alert('Gagal menghapus member');
      }
    }
  };

  const handleDisable = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menonaktifkan (Disable) member ini? History pembayaran akan tetap tersimpan.')) {
      try {
        await axios.put(`${window.location.protocol}//${window.location.hostname}/api/members/disable/${id}`);
        alert('Member berhasil di-disable');
        fetchMembers();
      } catch (error) {
        alert('Gagal men-disable member');
      }
    }
  };

  const handleRenew = async (member) => {
    if (window.confirm(`Apakah ${member.full_name} ingin melakukan perpanjangan (Renew) hari ini juga?`)) {
      try {
        const res = await axios.put(`${window.location.protocol}//${window.location.hostname}/api/members/renew/${member.ID}`);
        alert('Perpanjangan berhasil! Status member kembali Aktif.');
        fetchMembers();
      } catch (error) {
        alert('Gagal melakukan perpanjangan');
      }
    }
  };

  const handleResetPassword = async (member) => {
    if (window.confirm(`Kirim link Reset Password via WhatsApp ke ${member.full_name}?`)) {
      try {
        const res = await axios.post(`${window.location.protocol}//${window.location.hostname}/api/members/reset-password-link/${member.ID}`);
        if (res.data.text && res.data.phone) {
          let formattedPhone = res.data.phone.replace(/\D/g, '');
          if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1);
          const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(res.data.text)}`;
          window.open(url, '_blank');
        }
      } catch (error) {
        alert('Gagal membuat link reset password');
      }
    }
  };

  const filteredMembers = members.filter(m => {
    const fullName = m.full_name || '';
    const phone = m.phone || '';
    return fullName.toLowerCase().includes(search.toLowerCase()) || phone.includes(search);
  });

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-slate-800">Member Management</h1>
        <button 
          onClick={() => handleOpenForm()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/30 flex items-center gap-2"
        >
          <Plus size={18} /> Add New Member
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search members by name or phone..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm">
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Phone</th>
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500">Loading...</td></tr>
              ) : filteredMembers.map(m => {
                const activeSub = m.subscriptions?.find(s => s.status === 'Active') || m.subscriptions?.[0];
                const isActive = activeSub && new Date(activeSub.end_date) > new Date();
                const isCheckedIn = m.attendances && m.attendances.length > 0;

                return (
                  <tr key={m.ID} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium text-slate-800">
                      <div className="flex items-center gap-3">
                        {m.photo_url ? (
                           <img src={m.photo_url} alt="Profile" className="w-8 h-8 rounded-full object-cover" crossOrigin="anonymous" />
                        ) : (
                           <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">{(m.full_name || '?').charAt(0)}</div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-800">{m.full_name}</div>
                          <div className="text-xs text-blue-500 font-mono mt-0.5">{m.member_code || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600">{m.phone}</td>
                    <td className="p-4 text-slate-600">{m.email || '-'}</td>
                    <td className="p-4">
                      {m.status === 'Pending' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                          Pending
                        </span>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td className="p-4 flex gap-2 justify-center items-center">
                      {m.status === 'Pending' ? (
                        <button 
                          onClick={() => handleApprove(m)} 
                          className="px-4 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm bg-blue-600 text-white hover:bg-blue-700 flex-1"
                        >
                          ACC (Approve)
                        </button>
                      ) : m.status === 'Disabled' ? (
                        <button 
                          onClick={() => handleRenew(m)} 
                          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm bg-indigo-100 text-indigo-700 hover:bg-indigo-200 flex-1 flex items-center justify-center gap-1"
                          title="Renew Member"
                        >
                          <RefreshCw size={14} /> Renew
                        </button>
                      ) : (
                        m.must_change_password ? (
                          <button 
                            onClick={() => handleSendPassword(m)} 
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm bg-purple-100 text-purple-700 hover:bg-purple-200 flex-1 whitespace-nowrap"
                            title="Kirim Password User"
                          >
                            Kirim Password
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleManualScan(m.qr_code)} 
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm ${isCheckedIn ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'} flex-1`}
                          >
                            {isCheckedIn ? "Check Out" : "Check In"}
                          </button>
                        )
                      )}
                      <button onClick={() => { setSelectedMember(m); setShowCardModal(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="View Card"><QrCode size={18} /></button>
                      <button onClick={async () => {
                        try {
                          const res = await axios.post(`${window.location.protocol}//${window.location.hostname}/api/members/send-message/${m.ID}`);
                          let formattedPhone = res.data.phone.replace(/\D/g, '');
                          if (formattedPhone.startsWith('0')) {
                            formattedPhone = '62' + formattedPhone.substring(1);
                          }
                          const text = encodeURIComponent(res.data.text);
                          window.open(`https://wa.me/${formattedPhone}?text=${text}`, '_blank');
                        } catch (error) {
                          alert('Failed to generate message template');
                        }
                      }} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Chat via WhatsApp"><MessageCircle size={18} /></button>
                      <button onClick={() => handleResetPassword(m)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Reset Password via WA"><Key size={18} /></button>
                      <button onClick={() => handleOpenForm(m)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg" title="Edit Member"><Edit size={18} /></button>
                      {m.has_history ? (
                        <button onClick={() => handleDisable(m.ID)} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg" title="Disable Member (Safe)"><Ban size={18} /></button>
                      ) : (
                        <button onClick={() => handleDelete(m.ID)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg" title="Permanently Delete Member"><Trash2 size={18} /></button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filteredMembers.length === 0 && !loading && (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500">No members found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">{editing ? 'Edit Member' : 'Add New Member'}</h2>
              <button onClick={() => setShowFormModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input 
                    required type="text" 
                    value={formData.full_name} 
                    onChange={e => setFormData({...formData, full_name: e.target.value})} 
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number (e.g. 628...)</label>
                  <input 
                    required type="text" 
                    value={formData.phone} 
                    onChange={e => {
                      let val = e.target.value;
                      if (val.startsWith('0')) val = '62' + val.substring(1);
                      else if (val.startsWith('+62')) val = '62' + val.substring(3);
                      setFormData({...formData, phone: val});
                      setFieldErrors(prev => ({ ...prev, phone: '' }));
                    }} 
                    onBlur={(e) => validateDuplicate('phone', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 ${fieldErrors.phone ? 'border-rose-500 bg-rose-50' : 'border-slate-200'}`} 
                  />
                  {fieldErrors.phone && <p className="text-xs text-rose-500 mt-1 font-semibold">{fieldErrors.phone}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input 
                    type="email" 
                    value={formData.email} 
                    onChange={e => {
                      setFormData({...formData, email: e.target.value});
                      setFieldErrors(prev => ({ ...prev, email: '' }));
                    }} 
                    onBlur={(e) => validateDuplicate('email', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 ${fieldErrors.email ? 'border-rose-500 bg-rose-50' : 'border-slate-200'}`} 
                  />
                  {fieldErrors.email && <p className="text-xs text-rose-500 mt-1 font-semibold">{fieldErrors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                  <input required type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                  <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                  <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl min-h-[80px] focus:ring-2 focus:ring-blue-500" />
                </div>
                
                <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2">
                  <h3 className="text-sm font-bold text-slate-800 mb-3">Subscription Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Package</label>
                      <select value={formData.package_id} onChange={e => setFormData({...formData, package_id: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500">
                        <option value="">-- No Package --</option>
                        {packages.map(p => (
                          <option key={p.ID} value={p.ID}>{p.name} - Rp {p.price.toLocaleString('id-ID')}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Discount</label>
                      <select value={formData.discount_id} onChange={e => setFormData({...formData, discount_id: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500">
                        <option value="">-- No Discount --</option>
                        {discounts.map(d => (
                          <option key={d.ID} value={d.ID}>{d.name} ({d.type === 'percentage' ? d.value + '%' : 'Rp ' + d.value.toLocaleString('id-ID')})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                      <input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">End Date (Active Until)</label>
                      <input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowFormModal(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors">Cancel</button>
                <button 
                  type="submit" 
                  disabled={!!(fieldErrors.phone || fieldErrors.email)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/30 font-medium transition-colors disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  Save Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Digital Card Modal */}
      {showCardModal && selectedMember && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-3xl max-w-sm w-full relative">
            <button onClick={() => setShowCardModal(false)} className="absolute top-4 right-4 text-white hover:text-slate-200 z-50 bg-white/10 hover:bg-white/20 rounded-full p-1 transition-colors cursor-pointer"><X size={24} /></button>
            <div ref={cardRef} className="bg-slate-900 overflow-hidden rounded-3xl relative w-full shadow-2xl" style={{ background: 'linear-gradient(to bottom right, #0f172a, #1e293b)' }}>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                
                <div className="p-6 relative z-10 flex flex-col items-center">
                   {gymSettings?.logo_url && (
                     <img src={gymSettings.logo_url} alt="Logo" className="w-12 h-12 object-contain mx-auto mb-3" crossOrigin="anonymous" />
                   )}
                   <h3 className="text-xl font-bold tracking-widest mb-1 text-center" style={{ color: '#ffffff' }}>{gymSettings?.name || 'M-GYM'}</h3>
                   <p className="text-xs font-semibold tracking-widest uppercase mb-6" style={{ color: '#60a5fa' }}>{selectedMember.member_code || 'Member ID'}</p>

                   <div className="w-24 h-24 rounded-full border-4 overflow-hidden mb-4 relative flex items-center justify-center" style={{ borderColor: 'rgba(255,255,255,0.2)', backgroundColor: '#1e293b' }}>
                     {selectedMember.photo_url ? (
                       <img src={selectedMember.photo_url} alt="Profile" className="w-full h-full object-cover" crossOrigin="anonymous" />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center" style={{ color: '#94a3b8' }}><User size={40} /></div>
                     )}
                   </div>

                   <h2 className="text-2xl font-bold mb-1" style={{ color: '#ffffff' }}>{selectedMember.full_name}</h2>
                   <p className="text-sm font-medium" style={{ color: '#94a3b8' }}>{selectedMember.phone}</p>

                   <div className="mt-6 p-3 rounded-2xl w-32 h-32 flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}>
                     <QRCodeSVG value={selectedMember.qr_code} size={110} level="M" includeMargin={false} />
                   </div>
                </div>
            </div>
            <button 
              onClick={handleDownloadCard}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/30"
            >
              <Download size={20} /> Download Member Card
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
