import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { QrCode, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Scanner as QrScanner } from '@yudiel/react-qr-scanner';
import axios from 'axios';
import { useSettings } from '../context/SettingsContext';

export default function PublicScanner() {
  const { secret } = useParams();
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [linkName, setLinkName] = useState('');
  const { gymSettings } = useSettings();

  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const validateAccess = async () => {
      // Check if session already holds the token
      if (sessionStorage.getItem('scanner_auth') === secret) {
        setIsAuthorized(true);
        setIsValidating(false);
        return;
      }

      // If not in session, validate against backend
      try {
        const res = await axios.get(`http://localhost:3000/api/scanner-links/validate/${secret}`);
        sessionStorage.setItem('scanner_auth', secret);
        setLinkName(res.data.name);
        setIsAuthorized(true);
      } catch (error) {
        setIsAuthorized(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateAccess();
  }, [secret]);

  const handleDecode = async (result) => {
    if (loading || !result) return;
    
    const qrText = typeof result === 'string' ? result : result[0]?.rawValue || result;
    if (!qrText) return;

    setLoading(true);
    setScanResult(qrText);
    setMessage('Processing...');
    setStatus('');

    try {
      const response = await axios.post('http://localhost:3000/api/attendance/scan', {
        qr_code: qrText
      });
      setStatus('success');
      setMessage(`${response.data.message} - ${response.data.member} at ${response.data.time}`);
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.error || 'Failed to process QR Code');
    } finally {
      setTimeout(() => {
        setLoading(false);
        setScanResult(null);
        setMessage('');
        setStatus('');
      }, 3000);
    }
  };

  if (isValidating) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Validating access...</div>;
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center max-w-sm w-full">
          <AlertTriangle className="mx-auto text-rose-500 mb-4" size={48} />
          <h1 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h1>
          <p className="text-slate-500 text-sm">This scanner link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl shadow-slate-200 border border-slate-100">
        <div className="p-8 text-center bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          <div className="relative z-10 flex flex-col items-center">
            {gymSettings?.logo_url ? (
              <img src={gymSettings.logo_url} alt="Logo" className="mx-auto mb-4 w-12 h-12 object-contain" crossOrigin="anonymous" />
            ) : (
              <QrCode className="mx-auto mb-4 text-blue-400" size={48} />
            )}
            <h2 className="text-2xl font-bold tracking-wider mb-2">{gymSettings?.name || 'M-GYM'} Scanner</h2>
            <p className="text-slate-400 text-sm">{linkName ? `Terminal: ${linkName}` : 'Align QR code to scan'}</p>
          </div>
        </div>
        <div className="p-6 bg-slate-50 relative min-h-[400px] flex flex-col justify-center">
          {!scanResult ? (
            <div className="rounded-2xl overflow-hidden border-4 border-slate-200 shadow-inner w-full aspect-square relative bg-slate-100">
              <QrScanner 
                onScan={handleDecode} 
                onError={(error) => console.log(error?.message)} 
                components={{ audio: false, finder: false }}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 pointer-events-none border-2 border-blue-400/50 m-8 rounded-xl border-dashed"></div>
            </div>
          ) : (
            <div className="w-full aspect-square rounded-2xl flex flex-col items-center justify-center text-center p-6 bg-white border border-slate-200 shadow-inner">
              {status === 'success' ? (
                <CheckCircle className="text-emerald-500 mb-4" size={64} />
              ) : (
                <XCircle className="text-rose-500 mb-4" size={64} />
              )}
              <h3 className={`text-xl font-bold ${status === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {status === 'success' ? 'Success!' : 'Error'}
              </h3>
              <p className="text-slate-600 mt-2 font-medium">{message}</p>
              <p className="text-sm text-slate-400 mt-4 animate-pulse">Resuming scanner...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
