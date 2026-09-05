import React, { useState, useEffect } from 'react';
import { X, FileText, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Props {
  quoteId: number;
  onClose: () => void;
}

export default function QuotePreviewModal({ quoteId, onClose }: Props) {
  const { token, settings } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [quoteId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/preview`, {
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 md:p-6">
        <div className="absolute inset-0" onClick={onClose} />
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col items-center justify-center relative z-10">
           <button
             onClick={onClose}
             className="absolute top-4 right-4 md:top-6 md:right-6 p-2.5 rounded-full text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
             title="Close Preview"
           >
             <X className="w-5 h-5" />
           </button>
           <span className="text-zinc-500 font-medium animate-pulse text-sm">Loading quote preview...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 md:p-6">
        <div className="absolute inset-0" onClick={onClose} />
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl p-12 text-center flex flex-col items-center justify-center gap-4 relative z-10 font-sans">
           <button
             onClick={onClose}
             className="absolute top-4 right-4 md:top-6 md:right-6 p-2.5 rounded-full text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
             title="Close Preview"
           >
             <X className="w-5 h-5" />
           </button>
          <p className="text-zinc-700 font-semibold text-base">Failed to load quote preview.</p>
          <button onClick={onClose} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg transition-colors shadow-md">
             Close Preview
          </button>
        </div>
      </div>
    );
  }

  const { quote, settingsMap, lineItems, subtotal, totalAmount, gstAmount } = data;

  const quoteNum = quote.quote_number || `QUOTE-${quote.id}`;
  const qDate = quote.quote_date || quote.created_at;
  const quoteDate = qDate ? new Date(qDate).toLocaleDateString('en-AU', {
    day: '2-digit', month: 'short', year: 'numeric'
  }) : '';

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center bg-black/75 backdrop-blur-sm p-4 md:p-6 overflow-hidden">
      {/* Background Overlay */}
      <div className="absolute inset-0" onClick={onClose} />
      
      {/* Container */}
      <div className="relative z-10 w-full max-w-5xl flex flex-col h-full bg-zinc-100/50 rounded-xl shadow-2xl overflow-hidden border border-white/10">
        
        {/* Top Action Bar */}
        <div className="flex-none bg-white/95 backdrop-blur border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
           <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-brand-teal/10 flex items-center justify-center text-brand-teal">
                 <FileText className="w-4 h-4" />
              </div>
              <div>
                 <h2 className="text-lg font-semibold text-zinc-900 leading-tight">Quote Preview</h2>
                 <p className="text-sm text-zinc-500 font-medium">#{quoteNum}</p>
              </div>
           </div>
           
           <div className="flex items-center space-x-3">
              <button
                onClick={async () => {
                   try {
                     const res = await fetch(`/api/quotes/${quote.id}/download`, { headers: { Authorization: `Bearer ${token}` } });
                     if (!res.ok) throw new Error('Download failed');
                     const blob = await res.blob();
                     const url = window.URL.createObjectURL(blob);
                     const a = document.createElement('a');
                     a.href = url;
                     a.download = `${quoteNum}.pdf`;
                     document.body.appendChild(a);
                     a.click();
                     window.URL.revokeObjectURL(url);
                     a.remove();
                   } catch (e) {
                     alert("Failed to download quote");
                   }
                }}
                className="flex items-center px-4 py-2 bg-white border border-zinc-200 hover:border-brand-teal hover:text-brand-teal hover:bg-brand-teal/5 text-zinc-700 font-medium text-sm rounded-lg transition-all shadow-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </button>
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
           </div>
        </div>

        {/* Scrollable Document Canvas */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center pb-20 custom-scrollbar">
          
        {/* The "Paper" Document */}
        <div className="bg-white w-full max-w-[210mm] min-h-[297mm] shadow-xl border border-zinc-200 rounded-sm p-[12mm] sm:p-[20mm] text-zinc-900 font-sans flex flex-col relative mx-auto my-0">
          
          <div className="flex justify-between items-start mb-6 border-b border-zinc-100 pb-4">
             {settingsMap.letterheadLogo ? (
                <img src={settingsMap.letterheadLogo} alt="Logo" className="h-20 object-contain" />
             ) : (
                <div className="flex flex-col">
                   <h1 className="text-xl font-bold uppercase text-white tracking-tight">{settingsMap.businessName || 'Happy in the Home'}</h1>
                   <div className="text-sm">ABN: {settingsMap.abn || '12 345 678 910'}</div>
                   <div className="text-sm text-zinc-600">{settingsMap.businessAddress || '123 Care Lane, Sydney NSW 2000'}</div>
                </div>
             )}
             <div className="text-right flex flex-col space-y-1">
                <h1 className="text-3xl font-light text-zinc-800 tracking-wide mb-2 pt-2">SERVICE QUOTE</h1>
                <div className="text-sm"><span className="font-semibold">Quote No:</span> {quoteNum}</div>
                <div className="text-sm"><span className="font-semibold">Date:</span> {quoteDate}</div>
             </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
             {/* FROM section */}
             <div className="flex flex-col text-sm border-t-2 border-brand-teal pt-4 relative">
                <div className="font-bold text-xs uppercase tracking-widest text-brand-teal mb-2">From</div>
                <div className="font-semibold text-lg leading-tight mb-1">{settingsMap.businessName || 'Happy in the Home'}</div>
                <div className="text-zinc-600 mt-1">ABN: {settingsMap.abn || '12 345 678 910'}</div>
                <div className="text-zinc-600 max-w-[200px]">{settingsMap.businessAddress || '123 Care Lane, Sydney NSW 2000'}</div>
                {settingsMap.businessEmail && <div className="text-zinc-600">{settingsMap.businessEmail}</div>}
             </div>

             {/* PREPARED FOR section */}
             <div className="flex flex-col text-sm border-t-2 border-brand-teal pt-4 relative">
                <div className="font-bold text-xs uppercase tracking-widest text-brand-teal mb-2">Prepared For</div>
                <div className="font-semibold text-lg leading-tight mb-1">{quote.client_first_name} {quote.client_last_name}</div>
                {quote.ndis_number && <div className="text-zinc-600 mt-1">NDIS No: {quote.ndis_number}</div>}
                {quote.my_aged_care_id && <div className="text-zinc-600 mt-1">Home Care ID: {quote.my_aged_care_id}</div>}
             </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-x-auto">
             <table className="w-full text-sm text-left align-top">
                <thead>
                   <tr className="border-b-2 border-zinc-900 text-xs uppercase tracking-wider font-semibold text-zinc-900">
                      <th className="py-3 px-2 w-[12%]">Date</th>
                      <th className="py-3 px-2 w-[30%]">Description</th>
                      <th className="py-3 px-2 w-[15%]">Time</th>
                      <th className="py-3 px-2 text-right">Qty</th>
                      <th className="py-3 px-2 text-left">Unit</th>
                      <th className="py-3 px-2 text-right">Rate</th>
                      <th className="py-3 px-2 text-right">GST</th>
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
                                Code: {item.code || 'N/A'}
                            </div>
                         </td>
                         <td className="py-4 px-2 whitespace-pre-wrap text-zinc-600 text-xs">{item.time}</td>
                         <td className="py-4 px-2 text-right text-zinc-700">{item.qty}</td>
                         <td className="py-4 px-2 text-left text-zinc-500 text-xs">{item.unit}</td>
                         <td className="py-4 px-2 text-right text-zinc-700">${Number(item.rate).toFixed(2)}</td>
                         <td className="py-4 px-2 text-right text-zinc-700">${Number(item.gst || 0).toFixed(2)}</td>
                         <td className="py-4 px-2 text-right font-medium text-zinc-900">${Number(item.amount).toFixed(2)}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>

          <div className="flex justify-end mt-8 pt-6 border-t-2 border-zinc-900">
             {/* Totals */}
             <div className="w-1/3 min-w-[240px] flex flex-col justify-end text-sm ml-8">
                <div className="flex justify-between py-2 text-zinc-600">
                   <span>Subtotal:</span>
                   <span className="font-medium text-zinc-900">${Number(subtotal).toFixed(2)}</span>
                </div>
                {gstAmount > 0 ? (
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

        </div>
        </div>
      </div>
    </div>
  );
}
