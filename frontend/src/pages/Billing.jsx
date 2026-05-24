import { useState, useEffect } from 'react';
import { AlertCircle, Clock, Send, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

export default function Billing() {
  const [billingData, setBillingData] = useState({ near_expiry: [], overdue: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [notifStatus, setNotifStatus] = useState({});

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${window.location.protocol}//${window.location.hostname}/api/billing/status`);
      const historyRes = await axios.get(`${window.location.protocol}//${window.location.hostname}/api/billing/history`);
      setBillingData({ ...res.data, history: historyRes.data });
    } catch (error) {
      console.error("Failed to fetch billing data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const handleSendBilling = async (id) => {
    try {
      setNotifStatus(prev => ({ ...prev, [id]: 'loading' }));
      const res = await axios.post(`${window.location.protocol}//${window.location.hostname}/api/billing/send/${id}`);
      
      let formattedPhone = res.data.phone.replace(/\D/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '62' + formattedPhone.substring(1);
      }

      const text = encodeURIComponent(res.data.text);
      
      // Open WhatsApp Web
      window.open(`https://wa.me/${formattedPhone}?text=${text}`, '_blank');
      
      setNotifStatus(prev => ({ ...prev, [id]: 'sent' }));
      setTimeout(() => {
        setNotifStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[id];
          return newStatus;
        });
      }, 3000);
    } catch (error) {
      console.error("Failed to send billing", error);
      setNotifStatus(prev => ({ ...prev, [id]: 'error' }));
    }
  };

  const handleSendReceipt = async (id) => {
    try {
      setNotifStatus(prev => ({ ...prev, [`receipt_${id}`]: 'loading' }));
      const res = await axios.post(`${window.location.protocol}//${window.location.hostname}/api/billing/send-receipt/${id}`);
      
      let formattedPhone = res.data.phone.replace(/\D/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '62' + formattedPhone.substring(1);
      }

      const text = encodeURIComponent(res.data.text);
      window.open(`https://wa.me/${formattedPhone}?text=${text}`, '_blank');
      
      setNotifStatus(prev => ({ ...prev, [`receipt_${id}`]: 'sent' }));
      setTimeout(() => {
        setNotifStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[`receipt_${id}`];
          return newStatus;
        });
      }, 3000);
    } catch (error) {
      console.error("Failed to send receipt", error);
      setNotifStatus(prev => ({ ...prev, [`receipt_${id}`]: 'error' }));
    }
  };

  const handleMarkAsPaid = async (id) => {
    if (confirm('Are you sure you want to mark this as paid and extend the subscription by 1 month?')) {
      try {
        await axios.post(`${window.location.protocol}//${window.location.hostname}/api/billing/paid/${id}`);
        alert('Subscription extended successfully!');
        fetchBillingData(); // Refresh list
      } catch (error) {
        alert('Failed to mark as paid.');
      }
    }
  };

  const handleUndoPayment = async (id) => {
    if (confirm('Are you sure you want to undo this payment? The member\'s subscription date will be reverted by 1 month.')) {
      try {
        await axios.post(`${window.location.protocol}//${window.location.hostname}/api/billing/undo/${id}`);
        alert('Payment cancelled successfully!');
        fetchBillingData(); // Refresh list
      } catch (error) {
        alert('Failed to undo payment.');
      }
    }
  };

  const renderTable = (data, type) => {
    if (data.length === 0) {
      return <div className="text-center text-slate-500 py-8 font-medium">No records found.</div>;
    }
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm">
              <th className="p-4 font-medium">Member Name</th>
              <th className="p-4 font-medium hidden sm:table-cell">Phone</th>
              <th className="p-4 font-medium">{type === 'overdue' ? 'Days Overdue' : 'Days Left'}</th>
              <th className="p-4 font-medium">Harga Asli</th>
              <th className="p-4 font-medium">Diskon</th>
              <th className="p-4 font-medium text-emerald-600">Total Tagihan</th>
              <th className="p-4 font-medium text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.subscription_id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="p-4 font-medium text-slate-800">
                  {item.member_name}
                  <div className="sm:hidden text-xs text-slate-500 mt-1">{item.member_phone}</div>
                </td>
                <td className="p-4 text-slate-600 hidden sm:table-cell">{item.member_phone}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    type === 'overdue' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {type === 'overdue' ? item.days_overdue : item.days_left} Days
                  </span>
                </td>
                <td className="p-4 text-slate-500">Rp {item.package_price?.toLocaleString('id-ID')}</td>
                <td className="p-4 text-amber-600 font-medium">
                  {item.discount_amount && item.discount_amount > 0 ? (
                    `Rp ${item.discount_amount.toLocaleString('id-ID')}`
                  ) : '-'}
                </td>
                <td className="p-4 text-emerald-600 font-bold">Rp {item.total_bill?.toLocaleString('id-ID')}</td>
                <td className="p-4 flex gap-2 justify-center">
                  <button 
                    onClick={() => handleSendBilling(item.subscription_id)}
                    disabled={notifStatus[item.subscription_id] === 'loading'}
                    className="flex items-center justify-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium text-sm transition-all bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                    title="Send WA"
                  >
                    <Send size={16} /> <span className="hidden sm:inline">Tagih</span>
                  </button>
                  <button 
                    onClick={() => handleMarkAsPaid(item.subscription_id)}
                    className="flex items-center justify-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium text-sm transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
                    title="Mark as Paid"
                  >
                    <CheckCircle2 size={16} /> <span className="hidden sm:inline">Dibayar</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-slate-800 mb-8">Billing & Finance</h1>
      
      {loading ? (
        <div className="text-center py-12 text-slate-500 animate-pulse">Loading billing data...</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Near Expiry Panel */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-amber-50/30">
              <div className="flex items-center gap-3 text-amber-500">
                <Clock size={24} />
                <h2 className="text-xl font-bold text-slate-800">Near Expiry (&le; 5 Days)</h2>
                <span className="ml-auto bg-amber-100 text-amber-700 py-1 px-3 rounded-full text-xs font-bold">
                  {billingData.near_expiry?.length || 0}
                </span>
              </div>
            </div>
            <div className="p-0 flex-1">
              {renderTable(billingData.near_expiry || [], 'near_expiry')}
            </div>
          </div>

          {/* Overdue Panel */}
          <div className="bg-white rounded-2xl shadow-sm border border-rose-100 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-rose-100 bg-rose-50/30">
              <div className="flex items-center gap-3 text-rose-500">
                <AlertCircle size={24} />
                <h2 className="text-xl font-bold text-slate-800">Overdue</h2>
                <span className="ml-auto bg-rose-100 text-rose-700 py-1 px-3 rounded-full text-xs font-bold">
                  {billingData.overdue?.length || 0}
                </span>
              </div>
            </div>
            <div className="p-0 flex-1">
              {renderTable(billingData.overdue || [], 'overdue')}
            </div>
          </div>
        </div>
      )}

      {/* Payment History Panel */}
      {!loading && (
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-emerald-50/30">
            <div className="flex items-center gap-3 text-emerald-600">
              <CheckCircle2 size={24} />
              <h2 className="text-xl font-bold text-slate-800">Payment History</h2>
            </div>
          </div>
          <div className="p-0 overflow-x-auto">
            {billingData.history?.length === 0 ? (
              <div className="text-center text-slate-500 py-8 font-medium">No payment history found.</div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm">
                    <th className="p-4 font-medium">Member Name</th>
                    <th className="p-4 font-medium">Package</th>
                    <th className="p-4 font-medium">Harga Asli</th>
                    <th className="p-4 font-medium">Diskon</th>
                    <th className="p-4 font-medium text-emerald-600">Total Dibayar</th>
                    <th className="p-4 font-medium">Date Paid</th>
                    <th className="p-4 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {billingData.history?.map((item) => (
                    <tr key={item.ID} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-medium text-slate-800">{item.subscription?.member?.full_name}</td>
                      <td className="p-4 text-slate-600">{item.subscription?.package?.name || '-'}</td>
                      <td className="p-4 text-slate-500">Rp {item.subscription?.package?.price?.toLocaleString('id-ID')}</td>
                      <td className="p-4 text-amber-600 font-medium">
                        {item.subscription?.discount && item.subscription?.discount?.value > 0 ? (
                          item.subscription.discount.type === 'percentage' 
                            ? `Rp ${(item.subscription.package.price * item.subscription.discount.value / 100).toLocaleString('id-ID')}`
                            : `Rp ${item.subscription.discount.value.toLocaleString('id-ID')}`
                        ) : '-'}
                      </td>
                      <td className="p-4 text-emerald-600 font-bold">Rp {item.amount.toLocaleString('id-ID')}</td>
                      <td className="p-4 text-slate-600">{new Date(item.payment_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="p-4 flex gap-2 justify-center">
                        <button 
                          onClick={() => handleSendReceipt(item.ID)}
                          disabled={notifStatus[`receipt_${item.ID}`] === 'loading'}
                          className="flex items-center justify-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium text-sm transition-all bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-500/20"
                          title="Kirim Lunas"
                        >
                          <Send size={16} /> <span className="hidden sm:inline">Kirim Lunas</span>
                        </button>
                        <button 
                          onClick={() => handleUndoPayment(item.ID)}
                          className="flex items-center justify-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium text-sm transition-all bg-rose-50 text-rose-600 hover:bg-rose-100"
                          title="Batal"
                        >
                          <span className="font-bold text-lg leading-none">&times;</span> <span className="hidden sm:inline">Batal</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
