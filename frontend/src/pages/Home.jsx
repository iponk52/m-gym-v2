import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, UserPlus, LogIn, Dumbbell, User, MapPin, Calendar, Phone, Sun, Moon, Smartphone, Landmark, QrCode, Wallet, Copy, FileText } from 'lucide-react';
import axios from 'axios';

export default function Home() {
  const [data, setData] = useState({ settings: null, articles: [], packages: [] });
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', dob: '', address: '', package_id: ''
  });
  const [fieldErrors, setFieldErrors] = useState({ phone: '', email: '' });
  const [regTemplate, setRegTemplate] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [showPaymentSummary, setShowPaymentSummary] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchPublicData();
    fetchRegistrationTemplate();
    fetchPaymentMethods();
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    }
  }, []);

  const toggleDarkMode = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setIsDark(true);
    }
  };

  const fetchPublicData = async () => {
    try {
      const res = await axios.get(`${window.location.protocol}//${window.location.hostname}:3000/api/public/home`);
      setData(res.data);
    } catch (error) {
      console.error('Failed to load public data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrationTemplate = async () => {
    try {
      const res = await axios.get(`${window.location.protocol}//${window.location.hostname}:3000/api/templates`);
      const reg = res.data.find(t => t.type === 'registrasi');
      if (reg) setRegTemplate(reg.content);
    } catch (error) {
      console.error('Failed to load templates');
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const res = await axios.get(`${window.location.protocol}//${window.location.hostname}:3000/api/payment-methods`);
      setPaymentMethods(res.data);
    } catch (err) {
      console.error('Failed to fetch payment methods', err);
    }
  };

  const validateDuplicate = async (field, value) => {
    if (!value) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
      return;
    }
    
    // Konversi field state form ke field database
    let dbField = field;

    try {
      const res = await axios.get(`${window.location.protocol}//${window.location.hostname}:3000/api/public/check-duplicate?field=${dbField}&value=${encodeURIComponent(value)}`);
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

  const handleRegister = (e) => {
    e.preventDefault();
    setShowRegister(false);
    setShowPaymentSummary(true);
    setSelectedMethod(null);
  };

  const handleConfirmPayment = async () => {
    if (!selectedMethod) return;

    const pkg = data.packages.find(p => p.ID.toString() === formData.package_id);
    const gymName = data.settings?.name || 'M-GYM';
    const adminPhone = data.settings?.phone || '';

    try {
      await axios.post(`${window.location.protocol}//${window.location.hostname}/api/public/register`, {
        full_name: formData.name,
        phone: formData.phone,
        email: formData.email,
        dob: formData.dob,
        address: formData.address,
        package_id: formData.package_id ? parseInt(formData.package_id) : null
      });

      let formattedPhone = adminPhone.replace(/\D/g, '');
      if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1);

      let text = `Halo ${gymName}, saya ingin registrasi.\nNama: ${formData.name}\nNo HP: ${formData.phone}\nAlamat: ${formData.address}\nPaket: ${pkg?.name}\nHarga: Rp ${pkg?.price?.toLocaleString('id-ID')}\nMetode Pembayaran: ${selectedMethod.name}`;
      
      if (regTemplate) {
        text = regTemplate
          .replace(/{{nama_gym}}/g, gymName)
          .replace(/{{nama}}/g, formData.name)
          .replace(/{{phone}}/g, formData.phone)
          .replace(/{{dob}}/g, formData.dob)
          .replace(/{{address}}/g, formData.address)
          .replace(/{{paket}}/g, pkg ? pkg.name : '-')
          .replace(/{{harga}}/g, pkg ? `Rp ${pkg.price.toLocaleString('id-ID')}` : '-')
          .replace(/{{metode_pembayaran}}/g, selectedMethod.name);
      }

      const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
      setShowPaymentSummary(false);
      setFormData({ name: '', phone: '', email: '', dob: '', address: '', package_id: '' });
    } catch (error) {
      alert(error.response?.data?.error || 'Gagal melakukan registrasi, silakan coba lagi');
      setShowPaymentSummary(false);
      setShowRegister(true); // Kembali ke form jika gagal
    }
  };

  const getIconComponent = (iconName) => {
    switch (iconName) {
      case 'Smartphone': return <Smartphone size={24} className="text-blue-500" />;
      case 'Landmark': return <Landmark size={24} className="text-emerald-500" />;
      case 'QrCode': return <QrCode size={24} className="text-purple-500" />;
      default: return <Wallet size={24} className="text-amber-500" />;
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">Loading...</div>;

  const { settings, articles, packages } = data;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans transition-colors">
      {/* Header Navigation */}
      <header className="bg-slate-900 text-white p-4 sm:p-6 sticky top-0 z-40 shadow-lg">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="w-10 h-10 object-contain" crossOrigin="anonymous" />
            ) : (
              <div className="p-2 bg-blue-500 rounded-lg">
                <Dumbbell className="text-white" size={24} />
              </div>
            )}
            <h1 className="text-xl sm:text-2xl font-bold tracking-wider">{settings?.name || 'M-GYM'}</h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <button onClick={toggleDarkMode} className="text-yellow-400 hover:text-yellow-300 transition-colors p-2 sm:p-2.5 bg-slate-800 rounded-xl">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-300 hover:text-white transition-colors"
            >
              <LogIn size={18} /> <span className="hidden sm:inline">Member Login</span>
            </button>
            <button 
              onClick={() => setShowRegister(true)}
              className="flex items-center gap-2 text-sm sm:text-base font-bold bg-blue-600 hover:bg-blue-700 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl transition-colors shadow-lg shadow-blue-500/30"
            >
              <UserPlus size={18} /> <span className="hidden sm:inline">Daftar Sekarang</span><span className="sm:hidden">Daftar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        <div className="max-w-6xl mx-auto px-6 py-24 relative z-10 text-center flex flex-col items-center">
          <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-blue-400 to-emerald-400 text-transparent bg-clip-text">
            {settings?.hero_title || 'Transformasi Tubuh Anda Dimulai Dari Sini'}
          </h2>
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            {settings?.hero_subtitle || 'Bergabunglah dengan fasilitas gym terbaik, pelatih profesional, dan komunitas yang mendukung tujuan kesehatan Anda.'}
          </p>
          <button 
            onClick={() => setShowRegister(true)}
            className="flex items-center gap-2 !bg-white !text-slate-900 hover:!bg-slate-100 px-8 py-4 rounded-full font-bold text-lg transition-transform hover:scale-105 shadow-xl"
          >
            Gabung Sekarang <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* Articles Section */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-4">Tips & Info Terbaru</h2>
          <p className="text-slate-500 dark:text-slate-400">Baca artikel terbaru kami seputar kesehatan, kebugaran, dan nutrisi.</p>
        </div>
        
        {articles.length === 0 ? (
          <div className="text-center p-10 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm text-slate-500 dark:text-slate-400">
            Belum ada artikel yang dipublikasikan.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article) => (
              <Link to={`/article/${article.ID}`} key={article.ID} className="group bg-white dark:bg-slate-800 rounded-3xl shadow-sm hover:shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden transition-all duration-300 flex flex-col">
                <div className="h-56 bg-slate-100 dark:bg-slate-700 overflow-hidden relative">
                  {article.cover_url ? (
                    <img src={article.cover_url} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" crossOrigin="anonymous" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-500">
                      <FileText size={48} />
                    </div>
                  )}
                  <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm">
                    {new Date(article.CreatedAt).toLocaleDateString('id-ID')}
                  </div>
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="font-bold text-xl text-slate-800 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">{article.title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 line-clamp-3 leading-relaxed">
                    {article.content
                      .replace(/&nbsp;/gi, ' ')
                      .replace(/&amp;/gi, '&')
                      .replace(/&lt;/gi, '<')
                      .replace(/&gt;/gi, '>')
                      .replace(/&quot;/gi, '"')
                      .replace(/&#39;/gi, "'")
                      .replace(/<[^>]+>/g, '')
                      .replace(/\u00A0/g, ' ')
                      .replace(/\s+/g, ' ')
                      .trim()}
                  </p>
                  <div className="mt-auto flex items-center justify-between text-sm font-medium">
                    <span className="text-slate-400 dark:text-slate-500">Oleh: {article.author || 'Admin'}</span>
                    <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">Baca selengkapnya <ArrowRight size={14} /></span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-6 border-t border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold text-white mb-2">{settings?.name || 'M-GYM'}</h3>
            <p className="max-w-sm">{settings?.about || 'Your ultimate fitness destination.'}</p>
          </div>
          <div className="text-center md:text-right text-sm">
            <p>{settings?.address}</p>
            <p className="mt-1">{settings?.phone} • {settings?.email}</p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-slate-800 text-center text-sm">
          &copy; {new Date().getFullYear()} {settings?.name || 'M-GYM'}. All rights reserved.
        </div>
      </footer>

      {/* Registration Modal */}
      {showRegister && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">Registrasi Member</h2>
              <button onClick={() => setShowRegister(false)} className="text-slate-400 hover:text-slate-600 p-2 bg-slate-100 rounded-full">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <p className="text-slate-500 mb-6">Isi formulir pendaftaran ini, dan kami akan mengarahkan Anda ke WhatsApp Admin untuk konfirmasi pembayaran.</p>
              
              <form id="registerForm" onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Nama Lengkap</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      required type="text" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50" 
                      placeholder="John Doe" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">No Telepon / WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      required type="tel" 
                      value={formData.phone} 
                      onChange={e => {
                        let val = e.target.value;
                        if (val.startsWith('0')) val = '62' + val.substring(1);
                        else if (val.startsWith('+62')) val = '62' + val.substring(3);
                        setFormData({...formData, phone: val});
                        setFieldErrors(prev => ({ ...prev, phone: '' }));
                      }} 
                      onBlur={(e) => validateDuplicate('phone', e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50 ${fieldErrors.phone ? 'border-rose-500' : 'border-slate-200'}`} 
                      placeholder="08123456789" 
                    />
                  </div>
                  {fieldErrors.phone && <p className="text-xs text-rose-500 mt-1 font-semibold">{fieldErrors.phone}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Alamat Email (Opsional)</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">@</div>
                    <input 
                      type="email" 
                      value={formData.email} 
                      onChange={e => {
                        setFormData({...formData, email: e.target.value});
                        setFieldErrors(prev => ({ ...prev, email: '' }));
                      }} 
                      onBlur={(e) => validateDuplicate('email', e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50 ${fieldErrors.email ? 'border-rose-500' : 'border-slate-200'}`} 
                      placeholder="nama@email.com" 
                    />
                  </div>
                  {fieldErrors.email && <p className="text-xs text-rose-500 mt-1 font-semibold">{fieldErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Tanggal Lahir</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input required type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Alamat Lengkap</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
                    <textarea required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50 min-h-[80px]" placeholder="Jl. Sudirman No 1..." />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Pilih Paket Langganan</label>
                  <select required value={formData.package_id} onChange={e => setFormData({...formData, package_id: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium">
                    <option value="">-- Pilih Paket --</option>
                    {packages.map(p => (
                      <option key={p.ID} value={p.ID}>{p.name} - Rp {p.price.toLocaleString('id-ID')} / {p.duration_days} Hari</option>
                    ))}
                  </select>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-slate-100">
              <button 
                type="submit" 
                form="registerForm" 
                disabled={!!(fieldErrors.phone || fieldErrors.email)}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-emerald-500/30 transition-transform hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none disabled:hover:scale-100 disabled:cursor-not-allowed"
              >
                Lanjut ke Pembayaran <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Summary Modal */}
      {showPaymentSummary && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-800">Metode Pembayaran</h2>
              <button onClick={() => { setShowPaymentSummary(false); setShowRegister(true); }} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full">
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50/50">
              <div className="mb-6">
                <p className="text-sm text-slate-500">Paket yang dipilih:</p>
                <p className="font-bold text-slate-800">{data.packages.find(p => p.ID.toString() === formData.package_id)?.name || '-'}</p>
              </div>

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
                            <div className="bg-amber-50 text-amber-700 text-xs p-3 rounded-lg border border-amber-100">
                              <span className="font-bold">Perhatian:</span> Silakan selesaikan pembayaran ke rekening ini, lalu tekan tombol konfirmasi di bawah untuk mengirimkan bukti via WhatsApp.
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
                 <span className="text-slate-500 font-medium">Total Tagihan</span>
                 <span className="text-2xl font-bold text-slate-800">
                   Rp {data.packages.find(p => p.ID.toString() === formData.package_id)?.price?.toLocaleString('id-ID') || 0}
                 </span>
               </div>
               <button 
                 onClick={handleConfirmPayment}
                 disabled={!selectedMethod}
                 className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-emerald-500/30 transition-colors disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
               >
                 <FileText size={20} /> Konfirmasi Pendaftaran
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
