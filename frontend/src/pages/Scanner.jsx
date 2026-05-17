import { QrCode, CheckCircle, XCircle, Link, Plus, Trash2, Copy, X } from 'lucide-react';
import { Scanner as QrScanner } from '@yudiel/react-qr-scanner';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Scanner() {
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(''); // 'success' or 'error'

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [scannerLinks, setScannerLinks] = useState([]);
  const [newLinkName, setNewLinkName] = useState('');

  const fetchLinks = async () => {
    try {
      const res = await axios.get(`${window.location.protocol}//${window.location.hostname}:3000/api/scanner-links`);
      setScannerLinks(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (showLinkModal) fetchLinks();
  }, [showLinkModal]);

  const handleCreateLink = async (e) => {
    e.preventDefault();
    if (!newLinkName) return;
    try {
      await axios.post(`${window.location.protocol}//${window.location.hostname}:3000/api/scanner-links`, { name: newLinkName });
      setNewLinkName('');
      fetchLinks();
    } catch (error) {
      alert('Failed to create link');
    }
  };

  const handleDeleteLink = async (id) => {
    if (!confirm('Are you sure you want to delete this link?')) return;
    try {
      await axios.delete(`${window.location.protocol}//${window.location.hostname}:3000/api/scanner-links/${id}`);
      fetchLinks();
    } catch (error) {
      alert('Failed to delete link');
    }
  };

  const copyToClipboard = (secret) => {
    const url = `${window.location.origin}/s/${secret}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  const handleDecode = async (result) => {
    if (loading || !result) return;
    
    const qrText = typeof result === 'string' ? result : result[0]?.rawValue || result;
    
    if (!qrText) return;

    setLoading(true);
    setScanResult(qrText);
    setMessage('Processing...');
    setStatus('');

    try {
      const response = await axios.post(`${window.location.protocol}//${window.location.hostname}:3000/api/attendance/scan`, {
        qr_code: qrText
      });
      setStatus('success');
      setMessage(`${response.data.message} - ${response.data.member} at ${response.data.time}`);
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.error || 'Failed to process QR Code');
    } finally {
      // Allow scanning again after 3 seconds
      setTimeout(() => {
        setLoading(false);
        setScanResult(null);
        setMessage('');
        setStatus('');
      }, 3000);
    }
  };

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-slate-800">QR Check-in / Out</h1>
        <button 
          onClick={() => setShowLinkModal(true)}
          className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-lg flex items-center gap-2"
        >
          <Link size={18} /> Manage Access Links
        </button>
      </div>

      <div className="max-w-md mx-auto bg-white rounded-3xl overflow-hidden shadow-lg border border-slate-100">
        <div className="p-8 text-center bg-slate-900 text-white">
          <QrCode className="mx-auto mb-4" size={48} />
          <h2 className="text-xl font-semibold mb-2">Scan Member QR Code</h2>
          <p className="text-slate-400 text-sm">Align QR code within the frame to scan</p>
        </div>
        <div className="p-4 bg-slate-50 relative">
          {!scanResult ? (
            <div className="rounded-2xl overflow-hidden border-4 border-slate-200 shadow-inner">
              <QrScanner 
                onScan={handleDecode} 
                onError={(error) => console.log(error?.message)} 
                components={{ audio: false, finder: false }}
              />
            </div>
          ) : (
            <div className="aspect-square rounded-2xl flex flex-col items-center justify-center text-center p-6 bg-white border border-slate-200 shadow-inner">
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

      {showLinkModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Scanner Access Links</h2>
              <button onClick={() => setShowLinkModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleCreateLink} className="flex gap-3 mb-6">
              <input 
                type="text" 
                placeholder="Terminal Name (e.g. Front Desk 1)" 
                value={newLinkName}
                onChange={e => setNewLinkName(e.target.value)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                required
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl flex items-center gap-2 font-medium">
                <Plus size={18} /> Create Link
              </button>
            </form>

            <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-100/50 text-slate-500 text-sm">
                  <tr>
                    <th className="p-4 font-medium">Terminal Name</th>
                    <th className="p-4 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scannerLinks.map(link => (
                    <tr key={link.ID} className="border-t border-slate-100">
                      <td className="p-4 font-medium text-slate-700">{link.name}</td>
                      <td className="p-4 flex gap-2 justify-center">
                        <button onClick={() => copyToClipboard(link.secret_key)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Copy Link"><Copy size={18} /></button>
                        <button onClick={() => handleDeleteLink(link.ID)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg" title="Delete Link"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))}
                  {scannerLinks.length === 0 && (
                    <tr><td colSpan="2" className="p-8 text-center text-slate-500">No active links found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
