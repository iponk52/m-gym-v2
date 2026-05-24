import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Activity } from 'lucide-react';
import axios from 'axios';
import { useSettings } from '../context/SettingsContext';

export default function Login() {
  const [role, setRole] = useState('member'); // 'member' or 'admin'
  const [username, setUsername] = useState(''); // phone for member, username for admin
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tempAuthData, setTempAuthData] = useState(null);
  
  // Forgot Password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotName, setForgotName] = useState('');
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const navigate = useNavigate();
  const { gymSettings } = useSettings();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post(`${window.location.protocol}//${window.location.hostname}/api/auth/login`, {
        username,
        password,
        role
      });

      if (res.data.role === 'member' && res.data.must_change_password) {
        setTempAuthData(res.data);
        setShowChangePassword(true);
        return; // Hentikan alur, tampilkan modal
      }

      // Lanjut login normal
      proceedWithLogin(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const proceedWithLogin = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.role);
    
    if (data.role === 'member') {
      localStorage.setItem('member_id', data.member_id);
      localStorage.setItem('name', data.name);
      navigate('/member/profile'); 
    } else {
      localStorage.setItem('username', data.username);
      navigate('/dashboard'); 
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Password baru dan konfirmasi tidak cocok.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await axios.put(`${window.location.protocol}//${window.location.hostname}/api/auth/change-password/${tempAuthData.member_id}`, {
        new_password: newPassword
      }, {
        headers: {
          Authorization: `Bearer ${tempAuthData.token}`,
          'X-User-Role': tempAuthData.role || 'member',
          'X-Username': tempAuthData.name || 'member'
        }
      });
      
      // Jika sukses, proceed login
      proceedWithLogin(tempAuthData);
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal merubah password');
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotLoading(true);

    try {
      const res = await axios.post(`${window.location.protocol}//${window.location.hostname}/api/public/forgot-password-check`, {
        full_name: forgotName,
        phone: forgotPhone
      });
      
      if (res.data.text && res.data.admin_phone) {
        let formattedPhone = res.data.admin_phone.replace(/\D/g, '');
        if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1);
        const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(res.data.text)}`;
        window.open(url, '_blank');
        setShowForgotPassword(false);
        setForgotName('');
        setForgotPhone('');
      }
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Gagal menghubungi server');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 p-8 text-center text-white relative overflow-hidden">
           <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
           
           {gymSettings?.logo_url ? (
             <img src={gymSettings.logo_url} alt="Logo" className="mx-auto mb-4 w-16 h-16 object-contain relative z-10" crossOrigin="anonymous" />
           ) : (
             <Activity className="mx-auto mb-4 text-blue-500 relative z-10" size={48} />
           )}
           
           <h1 className="text-3xl font-bold tracking-wider relative z-10">{gymSettings?.name || 'M-GYM'}</h1>
           <p className="text-slate-400 mt-2 relative z-10">Sign in to your account</p>
        </div>

        <div className="p-8">
          <div className="flex rounded-xl bg-slate-100 p-1 mb-8">
            <button 
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${role === 'member' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setRole('member')}
            >
              Member
            </button>
            <button 
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${role === 'admin' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setRole('admin')}
            >
              Admin
            </button>
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-sm font-medium mb-6 border border-rose-100">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {role === 'member' ? 'Phone Number' : 'Username'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder={role === 'member' ? 'e.g. 628123456789' : 'admin'}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
              {role === 'member' && (
                <div className="text-right mt-2">
                  <button type="button" onClick={() => setShowForgotPassword(true)} className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline">
                    Lupa Password?
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>

      {showChangePassword && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Ubah Kata Sandi</h2>
            <p className="text-slate-500 mb-6 text-sm">Demi keamanan, Anda diwajibkan untuk mengubah kata sandi bawaan Anda sebelum melanjutkan masuk ke akun.</p>
            
            {error && (
              <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-sm font-medium mb-6 border border-rose-100">
                {error}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Kata Sandi Baru</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input required type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50" placeholder="••••••••" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Konfirmasi Sandi Baru</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input required type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50" placeholder="••••••••" />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => { setShowChangePassword(false); setLoading(false); setError(''); }} className="w-1/3 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors">Batal</button>
                <button type="submit" disabled={loading} className="w-2/3 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50">
                  {loading ? 'Menyimpan...' : 'Simpan & Masuk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showForgotPassword && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Lupa Password</h2>
            <p className="text-slate-500 mb-6 text-sm">Masukkan nama lengkap dan nomor telepon Anda yang terdaftar. Kami akan mengarahkan Anda ke WhatsApp Admin.</p>
            
            {forgotError && (
              <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-sm font-medium mb-6 border border-rose-100">
                {forgotError}
              </div>
            )}

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nama Lengkap</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input required type="text" value={forgotName} onChange={e => setForgotName(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50" placeholder="Sesuai yang terdaftar" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nomor Telepon</label>
                <div className="relative">
                  <input required type="text" value={forgotPhone} onChange={e => {
                    let val = e.target.value;
                    if (val.startsWith('0')) {
                      val = '62' + val.substring(1);
                    } else if (val.startsWith('+62')) {
                      val = '62' + val.substring(3);
                    }
                    setForgotPhone(val);
                  }} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50" placeholder="e.g. 628123456789" />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => { setShowForgotPassword(false); setForgotError(''); setForgotName(''); setForgotPhone(''); }} className="w-1/3 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors">Batal</button>
                <button type="submit" disabled={forgotLoading} className="w-2/3 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50">
                  {forgotLoading ? 'Mengecek...' : 'Kirim Pesan ke Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
