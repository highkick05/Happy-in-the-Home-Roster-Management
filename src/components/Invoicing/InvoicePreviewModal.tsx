import React, { useState, useEffect } from 'react';
import { X, FileText, Download, Printer, Clock, Tag, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Props {
  shiftId?: number | null;
  invoiceId?: number | null;
  onClose: () => void;
}

export default function InvoicePreviewModal({ shiftId, invoiceId, onClose }: Props) {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'document' | 'pdf'>('document');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  useEffect(() => {
    fetchData();
  }, [shiftId, invoiceId]);

  useEffect(() => {
    return () => {
      if (pdfBlobUrl) {
        window.URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const url = invoiceId 
        ? `/api/invoices/${invoiceId}/invoice-preview`
        : `/api/shifts/${shiftId}/invoice-preview`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/pdf')) {
          const blob = await res.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          setPdfBlobUrl(blobUrl);
          setViewMode('pdf');
          setData({ isHistoricalPdf: true });
        } else {
          const json = await res.json();
          setData(json.data);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getDownloadUrl = () => {
    const resolvedInvoiceId = invoiceId || data?.invoiceId;
    if (resolvedInvoiceId) {
      return `/api/invoices/${resolvedInvoiceId}/download-by-id`;
    }
    return `/api/invoices/${shiftId}/download`;
  };

  const loadPdfView = async () => {
    if (pdfBlobUrl) {
      setViewMode('pdf');
      return;
    }
    setLoadingPdf(true);
    try {
      const res = await fetch(getDownloadUrl(), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      setPdfBlobUrl(url);
      setViewMode('pdf');
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      const invNum = data?.invoiceNum || (invoiceId ? `INV-${invoiceId}` : `INV-${shiftId}`);
      const res = await fetch(getDownloadUrl(), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invNum}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="absolute inset-0" onClick={onClose} />
        <div className="bg-[#121216] border border-white/10 rounded-2xl shadow-2xl p-8 flex flex-col items-center justify-center relative z-10 text-center max-w-sm">
          <div className="w-10 h-10 rounded-xl bg-brand-teal/15 flex items-center justify-center text-brand-teal mb-3 animate-pulse border border-brand-teal/30">
            <FileText className="w-5 h-5" />
          </div>
          <p className="text-white font-medium text-sm">Loading Invoice Preview</p>
          <span className="text-zinc-500 text-xs mt-1">Retrieving invoice details...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="absolute inset-0" onClick={onClose} />
        <div className="bg-[#121216] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-8 text-center flex flex-col items-center justify-center gap-4 relative z-10">
          <p className="text-zinc-300 font-semibold text-base">Failed to load invoice preview</p>
          <p className="text-zinc-500 text-xs">The invoice record could not be retrieved from the server.</p>
          <button 
            onClick={onClose} 
            className="px-5 py-2 bg-brand-teal/20 hover:bg-brand-teal/30 text-brand-teal border border-brand-teal/40 font-medium text-xs rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (data.isHistoricalPdf && pdfBlobUrl) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 md:p-6 overflow-hidden">
        <div className="absolute inset-0" onClick={onClose} />
        <div className="relative z-10 w-full max-w-5xl flex flex-col h-[92vh] bg-[#121216] rounded-xl shadow-2xl overflow-hidden border border-white/10">
          <div className="flex-none bg-[#161820] border-b border-white/[0.08] px-5 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 border border-teal-500/25">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-white">Historical Invoice PDF</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Close Preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 bg-black/60 relative overflow-hidden flex items-center justify-center">
            <iframe src={`${pdfBlobUrl}#view=FitH`} className="w-full h-full border-0" title="PDF Preview" />
          </div>
        </div>
      </div>
    );
  }

  const { shift, settingsMap, invoiceNum, invoiceDate, lineItems, subtotal, totalAmount, gstAmount, invoiceStatus } = data;

  const isHomeCare = shift.funding_type === 'HCP' || shift.funding_type === 'Home Care' || shift.funding_type === 'HOME_CARE';
  const billToLabel = isHomeCare ? 'PROVIDER' : 'PLAN MANAGER';
  const clientName = `${shift.c_fn || ''} ${shift.c_ln || ''}`.trim() || 'Client';
  const billToName = shift.plan_manager_name || clientName;
  
  const ndisLabel = isHomeCare ? 'Home Care ID:' : 'NDIS No:';
  const ndisVal = shift.my_aged_care_id || shift.ndis_number;
  
  let bankName = 'National Australia Bank';
  let bankAccName = 'Happy in the Home';
  let bankBsb = '086-554';
  let bankAcc = '506627847';
  if (settingsMap.bankName) bankName = settingsMap.bankName;
  if (settingsMap.bankAccountName) bankAccName = settingsMap.bankAccountName;
  if (settingsMap.bankBsb) bankBsb = settingsMap.bankBsb;
  if (settingsMap.bankAcc) bankAcc = settingsMap.bankAcc;

  const statusLabel = invoiceStatus || 'GENERATED';

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 md:p-6 overflow-hidden">
      {/* Background Overlay */}
      <div className="absolute inset-0" onClick={onClose} />
      
      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-5xl flex flex-col h-[92vh] bg-[#121216] rounded-xl shadow-2xl overflow-hidden border border-white/10">
        
        {/* Top Header & Toolbar */}
        <div className="flex-none bg-[#161820] border-b border-white/[0.08] px-5 py-3 flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 border border-teal-500/25">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{invoiceNum}</span>
                <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border ${
                  statusLabel === 'PAID'
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : statusLabel === 'SENT'
                    ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                    : 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                }`}>
                  {statusLabel}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {clientName} • Issued {invoiceDate}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="bg-[#0e0f14] border border-white/10 p-0.5 rounded-lg flex items-center text-xs">
              <button
                type="button"
                onClick={() => setViewMode('document')}
                className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  viewMode === 'document' 
                    ? 'bg-teal-600 text-white shadow-sm' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Document
              </button>
              <button
                type="button"
                onClick={loadPdfView}
                disabled={loadingPdf}
                className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'pdf' 
                    ? 'bg-teal-600 text-white shadow-sm' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>{loadingPdf ? 'Loading...' : 'PDF'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              title="Print Invoice"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              id="invoice-preview-close-paper"
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {viewMode === 'pdf' && pdfBlobUrl ? (
          <div className="flex-1 bg-black/60 relative overflow-hidden flex items-center justify-center">
            <iframe 
              src={`${pdfBlobUrl}#view=FitH`}
              className="w-full h-full border-0"
              title="PDF Preview"
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 flex flex-col items-center gap-8 bg-[#0d0e12] custom-scrollbar">
            
            {/* The Clean White Paper Invoice Sheet */}
            <div className="bg-white w-full max-w-4xl shrink-0 shadow-xl rounded-xl p-8 sm:p-12 text-zinc-900 font-sans flex flex-col relative border border-zinc-200/90 print:shadow-none print:border-none print:m-0 print:p-0">
              
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b border-zinc-200">
                {/* Provider Details */}
                <div className="flex flex-col max-w-sm">
                  {settingsMap.letterheadLogo ? (
                    <img src={settingsMap.letterheadLogo} alt="Logo" className="h-36 sm:h-44 max-w-[340px] sm:max-w-[420px] w-auto object-contain" />
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                        H
                      </div>
                      <h1 className="text-xl font-bold uppercase text-zinc-900 tracking-tight">
                        {settingsMap.businessName || 'HAPPY IN THE HOME'}
                      </h1>
                    </div>
                  )}
                </div>

                {/* Invoice Meta */}
                <div className="sm:text-right flex flex-col sm:items-end">
                  <div className="text-2xl font-light text-zinc-800 tracking-wide mb-1">
                    TAX INVOICE
                  </div>
                  <div className="text-sm font-semibold font-mono text-zinc-900 mb-2">
                    {invoiceNum}
                  </div>
                  <div className="text-xs text-zinc-600 space-y-0.5">
                    <div><span className="font-medium text-zinc-500">Date Issued:</span> {invoiceDate}</div>
                    <div><span className="font-medium text-zinc-500">Page:</span> Page 1 of 1</div>
                  </div>
                </div>
              </div>

              {/* Service Provider / Bill To Two-Column Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 pt-2">
                {/* Service Provider Card */}
                <div className="border-t-2 border-teal-600 pt-3 text-xs space-y-1">
                  <div className="font-bold text-[10px] uppercase tracking-wider text-teal-700 mb-1">
                    Service Provider
                  </div>
                  <div className="font-bold text-sm text-zinc-900">
                    {settingsMap.businessName || 'Happy in the Home'}
                  </div>
                  <div className="text-zinc-600 space-y-0.5 leading-relaxed">
                    <p>NDIS & Home Care Registered Provider</p>
                    {settingsMap.abn && <p>ABN: {settingsMap.abn}</p>}
                    {settingsMap.businessAddress && <p>{settingsMap.businessAddress}</p>}
                    {(settingsMap.contactEmail || settingsMap.businessEmail) && (
                      <p>{settingsMap.contactEmail || settingsMap.businessEmail}</p>
                    )}
                    {settingsMap.contactPhone && <p>Tel: {settingsMap.contactPhone}</p>}
                  </div>
                </div>

                {/* Bill To Card */}
                <div className="border-t-2 border-teal-600 pt-3 text-xs space-y-1">
                  <div className="font-bold text-[10px] uppercase tracking-wider text-teal-700 mb-1">
                    Bill To
                  </div>
                  <div className="font-bold text-sm text-zinc-900">
                    {clientName}
                  </div>
                  <div className="text-zinc-600 space-y-0.5 leading-relaxed">
                    <p className={`font-medium ${isHomeCare ? 'text-purple-800' : 'text-teal-800'}`}>
                      {ndisLabel} {ndisVal || 'N/A'}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-zinc-200/70 space-y-0.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {billToLabel}
                    </div>
                    <div className="font-semibold text-zinc-800">{billToName}</div>
                    {shift.plan_manager_email && <div className="text-zinc-600">{shift.plan_manager_email}</div>}
                    {shift.plan_manager_address && <div className="text-zinc-600">{shift.plan_manager_address}</div>}
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="overflow-x-auto my-2">
                <table className="w-full text-xs text-left align-top border-collapse">
                  <thead>
                    <tr className="border-b-2 border-zinc-900 text-[11px] uppercase tracking-wider font-semibold text-zinc-900">
                      <th className="py-2.5 px-2 w-[13%]">Date</th>
                      <th className="py-2.5 px-2 w-[31%]">Description</th>
                      <th className="py-2.5 px-2 w-[16%] text-center">Time</th>
                      <th className="py-2.5 px-2 text-right w-[7%]">Qty</th>
                      <th className="py-2.5 px-2 text-left w-[7%]">Unit</th>
                      <th className="py-2.5 px-2 text-right w-[9%]">Rate</th>
                      <th className="py-2.5 px-2 text-right w-[8%]">GST</th>
                      <th className="py-2.5 px-2 text-right w-[9%]">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {lineItems.map((item: any, i: number) => {
                      const itemGst = item.gst !== undefined 
                        ? Number(item.gst) 
                        : (item.hasGst 
                            ? Math.round(Number(item.amount || 0) * 0.1 * 100) / 100 
                            : (isHomeCare ? Math.round(Number(item.amount || 0) * 0.1 * 100) / 100 : 0));
                      return (
                        <tr key={i} className="hover:bg-zinc-50/70 transition-colors">
                          {/* Date */}
                          <td className="py-3 px-2 text-zinc-700 align-top whitespace-nowrap font-medium text-zinc-900">
                            {item.date || '—'}
                          </td>

                          {/* Description */}
                          <td className="py-3 px-2 align-top">
                            <div className="font-semibold text-zinc-900 leading-snug mb-1">
                              {item.serviceName}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {item.code && item.code !== 'N/A' && (
                                <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-teal-50 text-teal-800 border border-teal-200 px-1.5 py-0.2 rounded">
                                  <Tag className="w-2.5 h-2.5" />
                                  {item.code}
                                </span>
                              )}
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold tracking-wide uppercase border bg-zinc-100 text-zinc-600 border-zinc-200">
                                {isHomeCare ? 'Home Care' : 'NDIS'}
                              </span>
                              {itemGst > 0 && (
                                <span className="inline-flex items-center text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-sans">
                                  10% GST
                                </span>
                              )}
                            </div>
                            {item.metadata && (
                              <div className="text-[11px] text-zinc-500 italic mt-1">{item.metadata}</div>
                            )}
                          </td>

                          {/* Time */}
                          <td className="py-3 px-2 text-zinc-600 text-[11px] align-top whitespace-nowrap text-center">
                            {item.time ? (
                              <div className="inline-flex items-center justify-center gap-1">
                                <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                                <span>{item.time}</span>
                              </div>
                            ) : (
                              <span className="text-zinc-400">—</span>
                            )}
                          </td>

                          {/* Qty */}
                          <td className="py-3 px-2 text-right font-medium text-zinc-900 align-top">
                            {item.qty}
                          </td>

                          {/* Unit */}
                          <td className="py-3 px-2 text-left text-zinc-500 text-[11px] align-top capitalize">
                            {item.unit || 'Hr'}
                          </td>

                          {/* Rate */}
                          <td className="py-3 px-2 text-right font-mono text-zinc-700 align-top whitespace-nowrap">
                            ${Number(item.rate).toFixed(2)}
                          </td>

                          {/* GST */}
                          <td className="py-3 px-2 text-right font-mono text-zinc-700 align-top whitespace-nowrap">
                            ${itemGst.toFixed(2)}
                          </td>

                          {/* Amount */}
                          <td className="py-3 px-2 text-right font-semibold font-mono text-zinc-900 align-top whitespace-nowrap">
                            ${Number(item.amount).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bottom Section: Payment Details + TOTAL AMOUNT Calculation Box */}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-start gap-6 mt-6 pt-5 border-t-2 border-zinc-900">
                {/* Payment Details Card */}
                <div className="w-full sm:max-w-xs bg-zinc-50 p-4 rounded-lg border border-zinc-200 text-xs">
                  <div className="font-bold uppercase tracking-wider text-[11px] text-zinc-900 mb-2.5 border-b border-zinc-200 pb-1.5">
                    Payment Details
                  </div>
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-[75px_1fr]"><span className="text-zinc-500">Bank:</span><span className="font-semibold text-zinc-900">{bankName}</span></div>
                    <div className="grid grid-cols-[75px_1fr]"><span className="text-zinc-500">Account:</span><span className="font-semibold text-zinc-900">{bankAccName}</span></div>
                    <div className="grid grid-cols-[75px_1fr]"><span className="text-zinc-500">BSB:</span><span className="font-semibold text-zinc-900 font-mono">{bankBsb}</span></div>
                    <div className="grid grid-cols-[75px_1fr]"><span className="text-zinc-500">Acc No:</span><span className="font-semibold text-zinc-900 font-mono">{bankAcc}</span></div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-zinc-200 grid grid-cols-[75px_1fr] items-center">
                    <span className="font-bold text-zinc-900">Reference:</span>
                    <span className="font-bold font-mono text-teal-700">{invoiceNum}</span>
                  </div>
                </div>

                {/* Financial Summary Box */}
                <div className="w-full sm:max-w-xs md:max-w-sm bg-zinc-50 p-4 rounded-lg border border-zinc-200 space-y-2 text-xs">
                  <div className="flex justify-between text-zinc-600 font-medium">
                    <span>Subtotal:</span>
                    <span className="font-mono text-zinc-900 font-semibold">${Number(subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600 font-medium">
                    <span>{gstAmount > 0 ? 'GST (10%):' : 'GST (GST-Free):'}</span>
                    <span className="font-mono text-zinc-900 font-semibold">${Number(gstAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-zinc-300 pt-2.5 mt-2 flex justify-between items-baseline">
                    <span className="font-bold text-zinc-900 text-sm tracking-tight">TOTAL AMOUNT:</span>
                    <span className="font-extrabold text-teal-700 font-mono text-base">${Number(totalAmount).toFixed(2)}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 text-right">
                    AUD • Inclusive of applicable GST
                  </div>
                </div>
              </div>

              {/* Payment Due Note */}
              <div className="mt-8 text-center text-xs text-zinc-500">
                Thank you for your business. Payment is due within {settingsMap.paymentDueDays || 14} days.
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-400 gap-2">
                <div>{settingsMap.businessName || 'Happy in the Home'} • Generated via Care Management System</div>
                <div className="font-mono">Ref: {invoiceNum}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
