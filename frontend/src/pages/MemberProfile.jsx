import { useState, useEffect, useRef } from 'react';
import { User, Phone, Mail, MapPin, Upload, Download, LogOut, CheckCircle, Activity, CreditCard, Copy, Landmark, Smartphone, QrCode, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as htmlToImage from 'html-to-image';
import { QRCodeSVG } from 'qrcode.react';
import { useSettings } from '../context/SettingsContext';

export default function MemberProfile() {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ phone: '', email: '', address: '' });
  const [message, setMessage] = useState('');
  const [bayarTemplate, setBayarTemplate] = useState('');
  
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);

  const fileInputRef = useRef(null);
  const cardRef = useRef(null);
  const navigate = useNavigate();
  const { gymSettings } = useSettings();

  useEffect(() => {
    fetchMember();
    fetchBayarTemplate();
  }, []);

  const fetchBayarTemplate = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/templates');
      const t = res.data.find(x => x.type === 'bayar');
      if (t) {
        setBayarTemplate(t.content);
      }
    } catch (e) {}
  };

  const fetchMember = async () => {
    try {
      const id = localStorage.getItem('member_id');
      if (!id) {
        navigate('/login');
        return;
      }
      const res = await axios.get(`http://localhost:3000/api/members/${id}`);
      setMember(res.data);
      setFormData({
        phone: res.data.phone || '',
        email: res.data.email || '',
        address: res.data.address || ''
      });
    } catch (error) {
      console.error(error);
      if (error.response?.status === 401 || error.response?.status === 404) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/payment-methods');
      setPaymentMethods(res.data);
    } catch (err) {
      console.error("Failed to fetch payment methods", err);
    }
  };

  const openPaymentModal = () => {
    fetchPaymentMethods();
    setIsPaymentModalOpen(true);
    setSelectedMethod(null);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const id = localStorage.getItem('member_id');
      await axios.put(`http://localhost:3000/api/members/${id}`, formData);
      setMessage('Profile updated successfully!');
      fetchMember();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append('photo', file);

    try {
      const id = localStorage.getItem('member_id');
      await axios.post(`http://localhost:3000/api/members/${id}/photo`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchMember();
    } catch (error) {
      alert('Failed to upload photo');
    }
  };

  const handleDownloadCard = async () => {
    if (cardRef.current) {
      try {
        const dataUrl = await htmlToImage.toPng(cardRef.current, { pixelRatio: 2 });
        const link = document.createElement('a');
        link.download = `${gymSettings?.name || 'M-GYM'}-Card-${member.full_name.replace(/\s+/g, '-')}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Failed to generate card image', err);
        alert('Gagal menyimpan kartu. Silakan coba lagi.');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:3000/api/auth/logout');
    } catch(e) {}
    localStorage.clear();
    navigate('/login');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;
  if (!member) return null;

  // Find active subscription
  const activeSub = member.subscriptions?.sort((a,b) => new Date(b.end_date) - new Date(a.end_date))[0];
  const isActive = activeSub && new Date(activeSub.end_date) > new Date();

  const calculateTotal = (sub) => {
    if (!sub || !sub.package) return 0;
    let price = sub.package.price;
    if (sub.discount) {
      if (sub.discount.type === 'percentage') {
        price = price - (price * (sub.discount.value / 100));
      } else {
        price = price - sub.discount.value;
      }
    }
    return price > 0 ? price : 0;
  };

  const totalBill = activeSub ? calculateTotal(activeSub) : 0;

  const handleConfirmPayment = () => {
    if (!selectedMethod) return;
    const adminPhone = gymSettings?.phone || '';
    // Format phone to 62...
    let formattedPhone = adminPhone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.slice(1);
    }

    let text = `Halo saya telah membayar Rp ${totalBill.toLocaleString('id-ID')}, atas nama ${member.full_name} (${member.member_code}). via ${selectedMethod.name}`;
    if (bayarTemplate) {
      text = bayarTemplate;
      text = text.replace(/{{nama}}/g, member.full_name);
      text = text.replace(/{{id_member}}/g, member.member_code);
      text = text.replace(/{{total}}/g, totalBill.toLocaleString('id-ID'));
      text = text.replace(/{{metode_pembayaran}}/g, selectedMethod.name);
    }

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const getIconComponent = (iconName) => {
    switch (iconName) {
      case 'Smartphone': return <Smartphone size={24} className="text-blue-500" />;
      case 'Landmark': return <Landmark size={24} className="text-emerald-500" />;
      case 'QrCode': return <QrCode size={24} className="text-purple-500" />;
      default: return <Wallet size={24} className="text-amber-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 sticky top-0 z-40 shadow-md">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            {gymSettings?.logo_url ? (
               <img src={gymSettings.logo_url} alt="Logo" className="w-8 h-8 object-contain" crossOrigin="anonymous" />
            ) : (
               <Activity className="text-blue-500" />
            )}
            <h1 className="text-xl font-bold tracking-wider">{gymSettings?.name || 'M-GYM'} Portal</h1>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
            <LogOut size={18} /> <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto mt-8 px-4 grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Col: Digital Card */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center relative overflow-hidden">
             <div className="w-full flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800">Your Digital Card</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
             </div>

             {/* The Card Element to capture */}
             <div ref={cardRef} className="w-full max-w-sm rounded-3xl overflow-hidden relative shadow-2xl" style={{ background: 'linear-gradient(to bottom right, #0f172a, #1e293b)' }}>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                
                <div className="p-6 relative z-10 flex flex-col items-center">
                   {gymSettings?.logo_url && (
                     <img src={gymSettings.logo_url} alt="Logo" className="w-12 h-12 object-contain mx-auto mb-3" crossOrigin="anonymous" />
                   )}
                   <h3 className="text-xl font-bold tracking-widest mb-1 text-center" style={{ color: '#ffffff' }}>{gymSettings?.name || 'M-GYM'}</h3>
                   <p className="text-xs font-semibold tracking-widest uppercase mb-6" style={{ color: '#60a5fa' }}>{member.member_code || 'Member ID'}</p>

                   <div className="w-24 h-24 rounded-full border-4 overflow-hidden mb-4 relative flex items-center justify-center" style={{ borderColor: 'rgba(255,255,255,0.2)', backgroundColor: '#1e293b' }}>
                     {member.photo_url ? (
                       <img src={member.photo_url} alt="Profile" className="w-full h-full object-cover" crossOrigin="anonymous" />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center" style={{ color: '#94a3b8' }}><User size={40} /></div>
                     )}
                   </div>

                   <h2 className="text-2xl font-bold mb-1" style={{ color: '#ffffff' }}>{member.full_name}</h2>
                   <p className="text-sm font-medium" style={{ color: '#94a3b8' }}>{member.phone}</p>

                   <div className="mt-6 p-3 rounded-2xl w-32 h-32 flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}>
                     <QRCodeSVG value={member.qr_code} size={110} level="M" includeMargin={false} />
                   </div>
                </div>
             </div>

             <div className="w-full mt-6 flex gap-4">
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
               >
                 <Upload size={18} /> Update Photo
               </button>
               <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />

               <button 
                 onClick={handleDownloadCard}
                 className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/30"
               >
                 <Download size={18} /> Save Card
               </button>
             </div>
          </div>

          {/* Subscription Info */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Subscription Status</h2>
            {activeSub ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                  <span className="text-slate-500 font-medium">Valid Until</span>
                  <span className="font-bold text-slate-800">{new Date(activeSub.end_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                {activeSub.package && (
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                    <span className="text-slate-500 font-medium">Active Package</span>
                    <span className="font-bold text-blue-600">{activeSub.package.name}</span>
                  </div>
                )}
                {!isActive && (
                  <div className="p-4 bg-rose-50 rounded-2xl flex flex-col gap-4">
                    <div className="flex items-start gap-3 text-rose-600 text-sm font-medium">
                      <Activity size={20} className="shrink-0" />
                      Your subscription has expired. Please renew your membership.
                    </div>
                    
                    <div className="flex justify-between items-center p-4 bg-white rounded-xl border border-rose-100 shadow-sm">
                      <span className="text-slate-500 font-medium">Total Tagihan</span>
                      <span className="font-bold text-xl text-slate-800">Rp {totalBill.toLocaleString('id-ID')}</span>
                    </div>

                    <button 
                      onClick={openPaymentModal}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-blue-500/30 flex justify-center items-center gap-2"
                    >
                      <CreditCard size={18} /> Bayar Sekarang
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-500">No active subscription found.</p>
            )}
          </div>
        </div>

        {/* Right Col: Update Form */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-fit">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-800">Update Profile</h2>
            <p className="text-sm text-slate-500">You can only update your contact details.</p>
          </div>

          {message && (
            <div className="mb-6 p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-sm font-medium flex items-center gap-2">
              <CheckCircle size={18} /> {message}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
              <input type="text" value={member.full_name} disabled className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  value={formData.phone} 
                  onChange={(e) => {
                    let val = e.target.value;
                    if (val.startsWith('0')) val = '62' + val.substring(1);
                    else if (val.startsWith('+62')) val = '62' + val.substring(3);
                    setFormData({...formData, phone: val});
                  }}
                  className="block w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="block w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
                <textarea 
                  value={formData.address} 
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="block w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 min-h-[100px]" 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={saving}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-800">Metode Pembayaran</h2>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full">
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50/50">
              {paymentMethods.length === 0 ? (
                <div className="text-center text-slate-500 py-4">Belum ada metode pembayaran yang tersedia. Hubungi Admin.</div>
              ) : (
                <div className="space-y-3">
                  {paymentMethods.map(method => (
                    <div 
                      key={method.ID} 
                      onClick={() => setSelectedMethod(method)}
                      className={`cursor-pointer transition-all border-2 rounded-2xl overflow-hidden ${selectedMethod?.ID === method.ID ? 'border-blue-500 bg-blue-50/50' : 'border-transparent bg-white hover:border-slate-200 shadow-sm'}`}
                    >
                      <div className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                          {getIconComponent(method.icon)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-800">{method.name}</h4>
                          <p className="text-sm text-slate-500">Pilih metode ini</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedMethod?.ID === method.ID ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}>
                          {selectedMethod?.ID === method.ID && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {selectedMethod?.ID === method.ID && (
                        <div className="px-4 pb-4 pt-2 border-t border-blue-100 mt-2">
                          <div className="bg-white p-4 rounded-xl border border-blue-100 space-y-3">
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Nomor Rekening / Tujuan</p>
                              <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg">
                                <span className="font-mono font-bold text-slate-800 tracking-wider">{method.account_number}</span>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(method.account_number); alert('Tersalin!'); }}
                                  className="text-blue-600 hover:bg-blue-100 p-1.5 rounded-md flex items-center gap-1 text-xs font-bold transition-colors"
                                >
                                  <Copy size={14} /> Copy
                                </button>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Atas Nama</p>
                              <p className="font-semibold text-slate-800">{method.account_name}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 bg-white border-t border-slate-100 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
               <div className="flex justify-between items-center mb-4 px-2">
                 <span className="text-slate-500 font-medium">Total Pembayaran</span>
                 <span className="text-2xl font-bold text-slate-800">Rp {totalBill.toLocaleString('id-ID')}</span>
               </div>
               <button 
                 onClick={handleConfirmPayment}
                 disabled={!selectedMethod}
                 className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/30 transition-colors disabled:opacity-50 disabled:shadow-none"
               >
                 Konfirmasi Pembayaran
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
