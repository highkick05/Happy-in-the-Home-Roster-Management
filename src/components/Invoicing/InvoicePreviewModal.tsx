import React, { useState, useEffect } from 'react';
import { X, FileText, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Props {
  shiftId: number;
  onClose: () => void;
}

export default function InvoicePreviewModal({ shiftId, onClose }: Props) {
  const { token, settings } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [shiftId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shifts/${shiftId}/invoice-preview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex items-center justify-center">
           <span className="text-zinc-500">Loading invoice preview...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-[#09090b] rounded-lg shadow-xl w-full max-w-4xl p-4 text-center text-white">
          Failed to load invoice preview.
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-zinc-400 hover:text-white transition-colors">Close</button>
        </div>
      </div>
    );
  }

  const { shift, settingsMap, invoiceNum, invoiceDate, lineItems, subtotal, totalAmount, gstAmount } = data;

  const isHomeCare = shift.funding_type === 'HCP' || shift.funding_type === 'Home Care' || shift.funding_type === 'HOME_CARE';
  const billToLabel = isHomeCare ? 'PROVIDER' : 'PLAN MANAGER';
  const billToName = shift.plan_manager_name || `${shift.c_fn} ${shift.c_ln}`;
  
  const ndisLabel = isHomeCare ? 'Home Care ID:' : 'NDIS No:';
  
  let bankName = 'National Australia Bank';
  let bankAccName = 'Happy in the Home';
  let bankBsb = '086-554';
  let bankAcc = '506627847';
  if (settingsMap.bankName) bankName = settingsMap.bankName;
  if (settingsMap.bankAccountName) bankAccName = settingsMap.bankAccountName;
  if (settingsMap.bankBsb) bankBsb = settingsMap.bankBsb;
  if (settingsMap.bankAcc) bankAcc = settingsMap.bankAcc;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Fixed Close Button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 lg:right-10 z-[60] p-3 border border-white/[0.12] bg-[#121214]/80 hover:bg-zinc-800 text-white rounded-full transition-colors backdrop-blur flex items-center justify-center shadow-xl"
      >
        <X className="w-5 h-5" />
      </button>
      
      {/* Invoice Container - scrollable */}
      <div className="w-full h-full max-w-[800px] relative z-10 overflow-y-auto py-8 lg:py-16 hide-scrollbar flex justify-center">
        <div className="bg-white text-zinc-900 rounded shadow-xl w-full flex-shrink-0 flex flex-col relative h-max">
          
          {/* Invoice Page Wrapper */}
          <div className="p-12 md:p-16 flex flex-col min-h-[90vh]">
          {/* Header */}
          <div className="flex justify-between items-start mb-12">
             {settingsMap.letterheadLogo ? (
                <img src={settingsMap.letterheadLogo} alt="Letterhead Logo" className="h-20 object-contain" />
             ) : (
                <div className="flex flex-col">
                   <h1 className="text-xl font-bold uppercase text-white tracking-tight">{settingsMap.businessName || 'Happy in the Home'}</h1>
                   <div className="text-sm">ABN: {settingsMap.abn || '12 345 678 910'}</div>
                   <div className="text-sm text-zinc-600">{settingsMap.businessAddress || '123 Care Lane, Sydney NSW 2000'}</div>
                </div>
             )}
             <div className="text-right flex flex-col space-y-1">
                <h1 className="text-3xl font-light text-zinc-800 tracking-wide mb-2 pt-2">TAX INVOICE</h1>
                <div className="text-sm"><span className="font-semibold">Invoice No:</span> {invoiceNum}</div>
                <div className="text-sm"><span className="font-semibold">Date:</span> {invoiceDate}</div>
             </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
             {/* FROM section */}
             <div className="flex flex-col text-sm border-t-2 border-brand-teal pt-4 relative">
                <div className="font-bold text-xs uppercase tracking-widest text-brand-teal mb-2">From</div>
                <div className="font-semibold text-lg leading-tight mb-1">{settingsMap.businessName || 'Happy in the Home'}</div>
                <div className="text-zinc-600 mt-1">ABN: {settingsMap.abn || '12 345 678 910'}</div>
                <div className="text-zinc-600 max-w-[200px]">{settingsMap.businessAddress || '123 Care Lane, Sydney NSW 2000'}</div>
                {settingsMap.businessEmail && <div className="text-zinc-600">{settingsMap.businessEmail}</div>}
             </div>

             {/* BILL TO section */}
             <div className="flex flex-col text-sm border-t-2 border-brand-teal pt-4 relative">
                <div className="font-bold text-xs uppercase tracking-widest text-brand-teal mb-2">Bill To</div>
                <div className="font-semibold text-lg leading-tight mb-1">{shift.c_fn} {shift.c_ln}</div>
                <div className="text-zinc-600 mt-1">{ndisLabel} {shift.ndis_number || 'N/A'}</div>
                
                <div className="mt-4 pt-3 border-t border-zinc-200/60">
                   <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">{billToLabel}</div>
                   <div className="font-medium text-zinc-800">{billToName}</div>
                   {shift.plan_manager_email && <div className="text-zinc-600">{shift.plan_manager_email}</div>}
                   {shift.plan_manager_address && <div className="text-zinc-600 max-w-[200px]">{shift.plan_manager_address}</div>}
                </div>
             </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-x-auto">
             <table className="w-full text-sm text-left align-top">
                <thead>
                   <tr className="border-b-2 border-zinc-900 text-xs uppercase tracking-wider font-semibold text-zinc-900">
                      <th className="py-3 px-2 w-[12%]">Date</th>
                      <th className="py-3 px-2 w-[35%]">Description</th>
                      <th className="py-3 px-2 w-[20%]">Time</th>
                      <th className="py-3 px-2 text-right">Qty</th>
                      <th className="py-3 px-2 text-left">Unit</th>
                      <th className="py-3 px-2 text-right">Rate</th>
                      <th className="py-3 px-2 text-right">Amount</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                   {lineItems.map((item: any, i: number) => (
                      <tr key={i} className="group">
                         <td className="py-4 px-2 whitespace-nowrap text-zinc-600">{item.date}</td>
                         <td className="py-4 px-2">
                            <div className="font-medium text-zinc-900 leading-tight mb-1">{item.serviceName}</div>
                            <div className="text-xs text-zinc-500 font-mono tracking-tight mb-1">
                                {(shift.funding_type === 'HCP' || shift.funding_type === 'Home Care') ? 'Serv. ID:' : 'Code:'} {item.code || 'N/A'}
                            </div>
                            {item.metadata && (
                               <div className="text-xs text-zinc-500 italic mt-0.5">{item.metadata}</div>
                            )}
                         </td>
                         <td className="py-4 px-2 whitespace-nowrap text-zinc-600 text-xs">{item.time}</td>
                         <td className="py-4 px-2 text-right text-zinc-700">{item.qty}</td>
                         <td className="py-4 px-2 text-left text-zinc-500 text-xs">{item.unit}</td>
                         <td className="py-4 px-2 text-right text-zinc-700">${Number(item.rate).toFixed(2)}</td>
                         <td className="py-4 px-2 text-right font-medium text-zinc-900">${Number(item.amount).toFixed(2)}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>

          <div className="flex justify-between items-start mt-12 pt-8 border-t-2 border-zinc-900">
             {/* Payment Details */}
             <div className="text-sm bg-zinc-50 p-4 rounded-md border border-zinc-200 flex-1 max-w-xs">
                <div className="font-bold uppercase tracking-wider text-xs text-zinc-900 mb-3 border-b border-zinc-200 pb-2">Payment Details</div>
                <div className="space-y-1.5">
                   <div className="grid grid-cols-[80px_1fr]"><span className="text-zinc-500">Bank:</span><span className="font-medium">{bankName}</span></div>
                   <div className="grid grid-cols-[80px_1fr]"><span className="text-zinc-500">Account:</span><span className="font-medium">{bankAccName}</span></div>
                   <div className="grid grid-cols-[80px_1fr]"><span className="text-zinc-500">BSB:</span><span className="font-medium tracking-tight">{bankBsb}</span></div>
                   <div className="grid grid-cols-[80px_1fr]"><span className="text-zinc-500">Acc No:</span><span className="font-medium tracking-tight">{bankAcc}</span></div>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-200 grid grid-cols-[80px_1fr]">
                   <span className="font-bold text-zinc-900">Reference:</span>
                   <span className="font-bold text-indigo-600">{invoiceNum}</span>
                </div>
             </div>

             {/* Totals */}
             <div className="w-1/3 min-w-[240px] flex flex-col justify-end text-sm ml-8">
                <div className="flex justify-between py-2 text-zinc-600">
                   <span>Subtotal:</span>
                   <span className="font-medium text-zinc-900">${Number(subtotal).toFixed(2)}</span>
                </div>
                {isHomeCare ? (
                  <div className="flex justify-between py-2 text-zinc-600 border-b border-zinc-200">
                     <span>GST (10%):</span>
                     <span className="font-medium text-zinc-900">${Number(gstAmount).toFixed(2)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between py-2 text-zinc-600 border-b border-zinc-200">
                     <span>GST (GST-Free):</span>
                     <span className="font-medium text-zinc-900">$0.00</span>
                  </div>
                )}
                <div className="flex justify-between py-4 text-xl font-bold text-indigo-900 bg-indigo-50 px-3 -mx-3 mt-2 rounded">
                   <span className="text-indigo-950">TOTAL AMOUNT:</span>
                   <span className="text-indigo-600 tracking-tight">${Number(totalAmount).toFixed(2)}</span>
                </div>
             </div>
          </div>

          {/* Footer Text */}
          <div className="mt-16 text-center text-xs font-medium text-zinc-400 tracking-wider uppercase border-t border-zinc-100 pt-8">
             Thank you for your business. Payment is due within {settingsMap.paymentDueDays || 14} days.
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
