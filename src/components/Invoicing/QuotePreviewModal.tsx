import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { X, FileText, Download, Printer, Clock, Tag, Building2, User, ShieldCheck, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Props {
  quoteId: number;
  onClose: () => void;
}

export default function QuotePreviewModal({ quoteId, onClose }: Props) {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'document' | 'pdf'>('document');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  useEffect(() => {
    fetchData();
  }, [quoteId]);

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

  const loadPdfView = async () => {
    if (pdfBlobUrl) {
      setViewMode('pdf');
      return;
    }
    setLoadingPdf(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      setPdfBlobUrl(url);
      setViewMode('pdf');
    } catch (e) {
      console.error(e);
      alert('Failed to load PDF view');
    } finally {
      setLoadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      const quoteNum = data?.quote?.quote_number || `QUOTE-${quoteId}`;
      const res = await fetch(`/api/quotes/${quoteId}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${quoteNum}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to download quote PDF');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="absolute inset-0" onClick={onClose} />
        <div className="bg-[#121216] border border-white/10 rounded-2xl shadow-2xl p-8 flex flex-col items-center justify-center relative z-10 text-center max-w-sm">
          <div className="w-10 h-10 rounded-xl bg-brand-teal/15 flex items-center justify-center text-brand-teal mb-3 animate-pulse border border-brand-teal/30">
            <FileText className="w-5 h-5" />
          </div>
          <p className="text-white font-medium text-sm">Loading Quote Preview</p>
          <span className="text-zinc-500 text-xs mt-1">Retrieving quote details...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="absolute inset-0" onClick={onClose} />
        <div className="bg-[#121216] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-8 text-center flex flex-col items-center justify-center gap-4 relative z-10">
          <p className="text-zinc-300 font-semibold text-base">Failed to load quote preview</p>
          <p className="text-zinc-500 text-xs">The quote record could not be retrieved from the server.</p>
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

  // Format Australian date helper
  const formatAuDate = (dateVal: any, opts: { monthFormat?: 'short' | '2-digit' } = {}): string => {
    if (!dateVal) return '';
    const str = String(dateVal).trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
      if (opts.monthFormat === 'short') {
        const [d, m, y] = str.split('/');
        const dt = new Date(`${y}-${m}-${d}T00:00:00`);
        if (!isNaN(dt.getTime())) {
          return dt.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
        }
      }
      return str;
    }
    const dt = new Date(str);
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleDateString('en-AU', {
        day: '2-digit',
        month: opts.monthFormat === 'short' ? 'short' : '2-digit',
        year: 'numeric'
      });
    }
    return str;
  };

  const { quote, settingsMap, lineItems, subtotal, totalAmount, gstAmount } = data;

  const quoteNum = quote.quote_number || `QUOTE-${quote.id}`;
  const qDate = quote.quote_date || quote.created_at;
  const quoteDate = qDate ? formatAuDate(qDate, { monthFormat: 'short' }) : '—';

  // Overall quote service period
  let servicePeriod = '';
  const rawStartDate = quote.activity_date || (lineItems && lineItems[0]?.date);
  if (rawStartDate) {
    const sDate = formatAuDate(rawStartDate, { monthFormat: 'short' });
    const firstWithEnd = (lineItems || []).find((l: any) => l.endDate);
    if (firstWithEnd && firstWithEnd.endDate) {
      const eDateStr = formatAuDate(firstWithEnd.endDate, { monthFormat: '2-digit' });
      servicePeriod = `${sDate} – ${eDateStr}`;
    } else {
      servicePeriod = sDate;
    }
  }

  const clientName = (quote.custom_client_name && quote.custom_client_name.trim())
    ? quote.custom_client_name.trim()
    : `${quote.client_first_name || ''} ${quote.client_last_name || ''}`.trim() || 'Prospective Client';

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 md:p-6 overflow-hidden">
      {/* Background Overlay */}
      <div className="absolute inset-0" onClick={onClose} />
      
      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-5xl flex flex-col h-[92vh] bg-[#121216] rounded-xl shadow-2xl overflow-hidden border border-white/10">
        
        {/* Top Header & Toolbar */}
        <div className="flex-none bg-[#161820] border-b border-white/[0.08] px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 border border-teal-500/25">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{quoteNum}</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30">
                  {quote.status || 'DRAFT'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {clientName} • Issued {quoteDate}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="bg-[#0e0f14] border border-white/10 p-0.5 rounded-lg flex items-center text-xs">
              <button
                type="button"
                onClick={() => setViewMode('document')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
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
                className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
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
              title="Print Quote"
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
            
            {/* The Clean White Paper Quote Sheet - Page 1 */}
            <div className="bg-white w-full max-w-4xl shrink-0 shadow-xl rounded-xl p-8 sm:p-12 text-zinc-900 font-sans flex flex-col relative overflow-hidden isolate border border-zinc-200/90 print:shadow-none print:border-none print:m-0 print:p-0 print:break-after-page">
              {/* Subtle Faded Houses & Colour-Accent Swooshes Background */}
              <div className="pointer-events-none select-none absolute inset-0 overflow-hidden -z-10" aria-hidden="true">
                <img
                  src="/hith houses for folder.png"
                  alt=""
                  className="absolute -top-6 inset-x-0 w-full h-[360px] object-cover opacity-[0.26] [mask-image:radial-gradient(ellipse_95%_75%_at_85%_25%,black_15%,rgba(0,0,0,0.6)_45%,rgba(0,0,0,0.2)_72%,transparent_96%)] [-webkit-mask-image:radial-gradient(ellipse_95%_75%_at_85%_25%,black_15%,rgba(0,0,0,0.6)_45%,rgba(0,0,0,0.2)_72%,transparent_96%)]"
                />
                <img
                  src="/hith houses for folder.png"
                  alt=""
                  className="absolute top-[28%] inset-x-0 w-full h-[360px] object-cover opacity-[0.22] [mask-image:radial-gradient(ellipse_95%_70%_at_15%_50%,black_15%,rgba(0,0,0,0.55)_45%,rgba(0,0,0,0.18)_72%,transparent_96%)] [-webkit-mask-image:radial-gradient(ellipse_95%_70%_at_15%_50%,black_15%,rgba(0,0,0,0.55)_45%,rgba(0,0,0,0.18)_72%,transparent_96%)]"
                />
                <img
                  src="/hith houses for folder.png"
                  alt=""
                  className="absolute -bottom-8 inset-x-0 w-full h-[360px] object-cover opacity-[0.26] [mask-image:radial-gradient(ellipse_95%_75%_at_85%_75%,black_15%,rgba(0,0,0,0.6)_45%,rgba(0,0,0,0.2)_72%,transparent_96%)] [-webkit-mask-image:radial-gradient(ellipse_95%_75%_at_85%_75%,black_15%,rgba(0,0,0,0.6)_45%,rgba(0,0,0,0.2)_72%,transparent_96%)]"
                />
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 612 792" preserveAspectRatio="none" fill="none">
                  {/* Top-Right Swooshes */}
                  <path d="M250 0 C360 75, 495 25, 612 155 L612 95 C505 5, 395 45, 310 0 Z" fill="#0D8A99" fillOpacity="0.055" />
                  <path d="M330 0 C430 55, 530 35, 612 120 L612 75 C540 15, 450 25, 385 0 Z" fill="#52B788" fillOpacity="0.05" />
                  <path d="M220 0 C355 92, 495 40, 612 175" stroke="#38BDF8" strokeOpacity="0.14" strokeWidth="1.5" />
                  {/* Mid-Left Swooshes */}
                  <path d="M0 220 C95 290, 125 420, 0 520 L0 470 C85 395, 65 300, 0 255 Z" fill="#52B788" fillOpacity="0.045" />
                  <path d="M0 265 C120 335, 90 455, 0 545 L0 505 C65 435, 85 345, 0 295 Z" fill="#0D8A99" fillOpacity="0.04" />
                  <path d="M0 240 C115 315, 110 435, 0 535" stroke="#0D9488" strokeOpacity="0.12" strokeWidth="1.2" />
                  {/* Bottom-Right Swooshes */}
                  <path d="M190 792 C335 685, 485 735, 612 575 L612 635 C495 760, 355 720, 250 792 Z" fill="#0D8A99" fillOpacity="0.055" />
                  <path d="M275 792 C400 710, 515 745, 612 620 L612 665 C525 765, 420 735, 330 792 Z" fill="#38BDF8" fillOpacity="0.045" />
                  <path d="M165 792 C325 670, 480 725, 612 555" stroke="#52B788" strokeOpacity="0.14" strokeWidth="1.5" />
                </svg>
              </div>
              
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b border-zinc-200">
                {/* Provider Details */}
                <div className="flex flex-col max-w-sm">
                  {settingsMap.letterheadLogo ? (
                    <img src={settingsMap.letterheadLogo} alt="Logo" className="h-36 sm:h-44 max-w-[340px] sm:max-w-[420px] w-auto object-contain mix-blend-multiply" />
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

                {/* Quote Meta */}
                <div className="sm:text-right flex flex-col sm:items-end">
                  <div className="text-2xl font-light text-zinc-800 tracking-wide mb-1">
                    SERVICE QUOTE
                  </div>
                  <div className="text-sm font-semibold font-mono text-zinc-900 mb-2">
                    {quoteNum}
                  </div>
                  <div className="text-xs text-zinc-600 space-y-0.5">
                    <div><span className="font-medium text-zinc-500">Date Issued:</span> {quoteDate}</div>
                    {servicePeriod && (
                      <div><span className="font-medium text-zinc-500">Service Period:</span> {servicePeriod}</div>
                    )}
                    <div><span className="font-medium text-zinc-500">Page:</span> Page 1 of 2</div>
                  </div>
                </div>
              </div>

              {/* Activity / Scope Banner */}
              {quote.activity_name && (
                <div className="mt-4 px-4 py-2.5 bg-teal-50/60 border border-teal-200/60 rounded-lg flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-teal-800 uppercase tracking-wider text-[11px]">Activity / Scope:</span>
                    <span className="font-bold text-zinc-900">{quote.activity_name}</span>
                  </div>
                  {servicePeriod && (
                    <span className="text-zinc-600 font-medium">
                      Period: {servicePeriod}
                    </span>
                  )}
                </div>
              )}

              {/* From / Bill To Two-Column Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 pt-2">
                {/* From Card */}
                <div className="border-t-2 border-teal-600 pt-3 text-xs space-y-1">
                  <div className="font-bold text-[10px] uppercase tracking-wider text-teal-700 mb-1">
                    Service Provider
                  </div>
                  <div className="font-bold text-sm text-zinc-900">
                    {settingsMap.businessName || 'Happy in the Home Pty Ltd'}
                  </div>
                  <div className="text-zinc-600 space-y-0.5 leading-relaxed">
                    <p>NDIS & Home Care Registered Provider</p>
                    {settingsMap.abn && <p>ABN: {settingsMap.abn}</p>}
                    {settingsMap.businessAddress && <p>{settingsMap.businessAddress}</p>}
                    {settingsMap.contactEmail && <p>{settingsMap.contactEmail}</p>}
                    {settingsMap.contactPhone && <p>Tel: {settingsMap.contactPhone}</p>}
                  </div>
                </div>

                {/* Prepared For Card */}
                <div className="border-t-2 border-teal-600 pt-3 text-xs space-y-1">
                  <div className="font-bold text-[10px] uppercase tracking-wider text-teal-700 mb-1">
                    Prepared For
                  </div>
                  <div className="font-bold text-sm text-zinc-900">
                    {clientName}
                  </div>
                  <div className="text-zinc-600 space-y-0.5 leading-relaxed">
                    {quote.ndis_number && (
                      <p className="font-medium text-teal-800">NDIS No: {quote.ndis_number}</p>
                    )}
                    {quote.my_aged_care_id && (
                      <p className="font-medium text-purple-800">Home Care ID: {quote.my_aged_care_id}</p>
                    )}
                    {quote.client_email && <p>Email: {quote.client_email}</p>}
                    <p className="text-zinc-400 italic">Recipient / Plan Nominee</p>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="overflow-x-auto my-2">
                <table className="w-full text-xs text-left align-top border-collapse">
                  <thead>
                    <tr className="border-b-2 border-zinc-900 text-[11px] uppercase tracking-wider font-semibold text-zinc-900">
                      <th className="py-2.5 px-2 w-[16%]">Date</th>
                      <th className="py-2.5 px-2 w-[34%]">Description</th>
                      <th className="py-2.5 px-2 w-[16%] text-center">Time / Hours</th>
                      <th className="py-2.5 px-2 text-right w-[7%]">Qty</th>
                      <th className="py-2.5 px-2 text-left w-[7%]">Unit</th>
                      <th className="py-2.5 px-2 text-right w-[10%]">Rate</th>
                      <th className="py-2.5 px-2 text-right w-[10%]">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {lineItems.map((item: any, i: number) => {
                      const hasEnd = Boolean(item.endDate && item.endDate.trim());
                      const isRange = hasEnd && item.endDate !== item.date;

                      return (
                        <tr key={i} className="hover:bg-zinc-50/70 transition-colors">
                          {/* Date */}
                          <td className="py-3 px-2 text-zinc-700 align-top whitespace-nowrap">
                            <div className="font-medium text-zinc-900">
                              {item.date || '—'}
                            </div>
                            {isRange && (
                              <div className="text-[10px] text-zinc-500 font-medium mt-0.5">
                                to {item.endDate}
                              </div>
                            )}
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
                              {item.type && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold tracking-wide uppercase border bg-zinc-100 text-zinc-600 border-zinc-200">
                                  {item.type === 'HOME_CARE' ? 'Home Care' : 'NDIS'}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Time */}
                          <td className="py-3 px-2 text-zinc-600 text-[11px] align-top whitespace-pre-line text-center">
                            {item.time ? (
                              <div className="flex items-center justify-center gap-1">
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
                          <td className="py-3 px-2 text-left text-zinc-500 text-[11px] align-top">
                            {/^(km|kilometre|kilometres|kilometer|kilometers)$/i.test(String(item.unit || '').trim()) ? 'KM' : (item.unit || 'Hr')}
                          </td>

                          {/* Rate */}
                          <td className="py-3 px-2 text-right font-mono text-zinc-700 align-top whitespace-nowrap">
                            ${Number(item.rate).toFixed(2)}
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

              {/* Bottom Section: TOTAL AMOUNT Calculation Box */}
              <div className="flex justify-end mt-6 pt-5 border-t-2 border-zinc-900">
                <div className="w-full max-w-xs sm:max-w-sm bg-zinc-50 p-4 rounded-lg border border-zinc-200 space-y-2 text-xs">
                  <div className="flex justify-between text-zinc-600 font-medium">
                    <span>Subtotal:</span>
                    <span className="font-mono text-zinc-900 font-semibold">${Number(subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600 font-medium">
                    <span>GST ({gstAmount > 0 ? '10%' : 'GST Free'}):</span>
                    <span className="font-mono text-zinc-900 font-semibold">
                      ${Number(gstAmount || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-zinc-300 flex justify-between items-center text-sm">
                    <span className="font-bold text-zinc-900 tracking-tight">TOTAL AMOUNT:</span>
                    <span className="text-base font-extrabold font-mono text-teal-700">
                      ${Number(totalAmount).toFixed(2)}
                    </span>
                  </div>

                  <div className="text-[10px] text-zinc-400 text-right pt-0.5">
                    AUD • Inclusive of applicable GST
                  </div>
                </div>
              </div>

              {/* Page 1 Footer */}
              <div className="mt-8 pt-4 border-t border-zinc-200 flex flex-col sm:flex-row justify-between items-center text-[10px] text-zinc-400 gap-2">
                <span>{settingsMap.businessName || 'Happy in the Home'} • Generated via Care Management System</span>
                <span>Ref: {quoteNum}</span>
              </div>

            </div>

            {/* Page 2: Important Notes & Terms of Service */}
            <div className="bg-white w-full max-w-4xl shrink-0 shadow-xl rounded-xl p-8 sm:p-12 text-zinc-900 font-sans flex flex-col relative overflow-hidden isolate border border-zinc-200/90 print:shadow-none print:border-none print:m-0 print:p-0 print:break-before-page">
              {/* Subtle Faded Houses & Colour-Accent Swooshes Background */}
              <div className="pointer-events-none select-none absolute inset-0 overflow-hidden -z-10" aria-hidden="true">
                <img
                  src="/hith houses for folder.png"
                  alt=""
                  className="absolute -top-6 inset-x-0 w-full h-[360px] object-cover opacity-[0.26] [mask-image:radial-gradient(ellipse_95%_75%_at_85%_25%,black_15%,rgba(0,0,0,0.6)_45%,rgba(0,0,0,0.2)_72%,transparent_96%)] [-webkit-mask-image:radial-gradient(ellipse_95%_75%_at_85%_25%,black_15%,rgba(0,0,0,0.6)_45%,rgba(0,0,0,0.2)_72%,transparent_96%)]"
                />
                <img
                  src="/hith houses for folder.png"
                  alt=""
                  className="absolute top-[28%] inset-x-0 w-full h-[360px] object-cover opacity-[0.22] [mask-image:radial-gradient(ellipse_95%_70%_at_15%_50%,black_15%,rgba(0,0,0,0.55)_45%,rgba(0,0,0,0.18)_72%,transparent_96%)] [-webkit-mask-image:radial-gradient(ellipse_95%_70%_at_15%_50%,black_15%,rgba(0,0,0,0.55)_45%,rgba(0,0,0,0.18)_72%,transparent_96%)]"
                />
                <img
                  src="/hith houses for folder.png"
                  alt=""
                  className="absolute -bottom-8 inset-x-0 w-full h-[360px] object-cover opacity-[0.26] [mask-image:radial-gradient(ellipse_95%_75%_at_85%_75%,black_15%,rgba(0,0,0,0.6)_45%,rgba(0,0,0,0.2)_72%,transparent_96%)] [-webkit-mask-image:radial-gradient(ellipse_95%_75%_at_85%_75%,black_15%,rgba(0,0,0,0.6)_45%,rgba(0,0,0,0.2)_72%,transparent_96%)]"
                />
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 612 792" preserveAspectRatio="none" fill="none">
                  <path d="M250 0 C360 75, 495 25, 612 155 L612 95 C505 5, 395 45, 310 0 Z" fill="#0D8A99" fillOpacity="0.055" />
                  <path d="M330 0 C430 55, 530 35, 612 120 L612 75 C540 15, 450 25, 385 0 Z" fill="#52B788" fillOpacity="0.05" />
                  <path d="M220 0 C355 92, 495 40, 612 175" stroke="#38BDF8" strokeOpacity="0.14" strokeWidth="1.5" />
                  <path d="M0 220 C95 290, 125 420, 0 520 L0 470 C85 395, 65 300, 0 255 Z" fill="#52B788" fillOpacity="0.045" />
                  <path d="M0 265 C120 335, 90 455, 0 545 L0 505 C65 435, 85 345, 0 295 Z" fill="#0D8A99" fillOpacity="0.04" />
                  <path d="M0 240 C115 315, 110 435, 0 535" stroke="#0D9488" strokeOpacity="0.12" strokeWidth="1.2" />
                  <path d="M190 792 C335 685, 485 735, 612 575 L612 635 C495 760, 355 720, 250 792 Z" fill="#0D8A99" fillOpacity="0.055" />
                  <path d="M275 792 C400 710, 515 745, 612 620 L612 665 C525 765, 420 735, 330 792 Z" fill="#38BDF8" fillOpacity="0.045" />
                  <path d="M165 792 C325 670, 480 725, 612 555" stroke="#52B788" strokeOpacity="0.14" strokeWidth="1.5" />
                </svg>
              </div>
              
              {/* Page 2 Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b border-zinc-200">
                <div className="flex items-center gap-3">
                  {settingsMap.letterheadLogo ? (
                    <img src={settingsMap.letterheadLogo} alt="Logo" className="h-16 w-auto object-contain mix-blend-multiply" />
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                        H
                      </div>
                      <span className="text-base font-bold uppercase text-zinc-900 tracking-tight">
                        {settingsMap.businessName || 'HAPPY IN THE HOME'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="sm:text-right flex flex-col sm:items-end">
                  <div className="text-lg font-light text-zinc-800 tracking-wide">
                    SERVICE QUOTE
                  </div>
                  <div className="text-xs font-semibold font-mono text-zinc-900">
                    {quoteNum}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1">
                    Page 2 of 2
                  </div>
                </div>
              </div>

              {/* Page 2 Body: Important Notes & Terms */}
              <div className="mt-8">
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs text-zinc-800 mb-4 pb-2 border-b border-zinc-200">
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  <span>Important Notes & Terms of Service</span>
                </div>

                <div className="bg-zinc-50 p-6 rounded-xl border border-zinc-200 text-zinc-700 leading-relaxed text-sm">
                  {quote.important_notes && quote.important_notes.trim() ? (
                    <div className="prose prose-zinc max-w-none text-zinc-700 text-sm">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        components={{
                          h1: ({ node, ...props }) => <h1 className="text-base font-bold text-zinc-900 mt-3 mb-2 border-b border-zinc-200 pb-1 first:mt-0" {...props} />,
                          h2: ({ node, ...props }) => <h2 className="text-sm font-bold text-zinc-900 mt-2.5 mb-1.5 first:mt-0" {...props} />,
                          h3: ({ node, ...props }) => <h3 className="text-xs font-bold text-zinc-800 mt-2 mb-1 uppercase tracking-wide first:mt-0" {...props} />,
                          p: ({ node, ...props }) => <p className="mb-2.5 last:mb-0 leading-relaxed whitespace-pre-line text-zinc-700 text-sm" {...props} />,
                          ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1.5 mb-2.5 text-zinc-700" {...props} />,
                          ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-1.5 mb-2.5 text-zinc-700" {...props} />,
                          li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                          blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-teal-600 pl-3 my-2 text-zinc-600 italic bg-teal-50/50 py-1.5 rounded-r" {...props} />,
                          hr: ({ node, ...props }) => <hr className="my-4 border-zinc-300" {...props} />,
                          strong: ({ node, ...props }) => <strong className="font-bold text-zinc-900" {...props} />,
                          u: ({ node, ...props }) => <u className="underline decoration-zinc-500 underline-offset-2" {...props} />,
                          del: ({ node, ...props }) => <del className="line-through text-zinc-400" {...props} />
                        }}
                      >
                        {quote.important_notes
                          .trim()
                          .replace(/^\[ \]\s+/gm, '☐ ')
                          .replace(/^\[[xX]\]\s+/gm, '☑ ')}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <ul className="list-disc list-inside space-y-2 text-zinc-700">
                      <li>This quote is valid for 30 calendar days from the date of issue.</li>
                      <li>Pricing adheres strictly to current NDIA Price Limits and Home Care guidelines.</li>
                      <li>Payment terms: 14 days from date of tax invoice upon service delivery.</li>
                      <li>Cancellations require 24 hours advance notice per standard service agreements.</li>
                    </ul>
                  )}
                </div>
              </div>

              {/* Page 2 Footer */}
              <div className="mt-10 pt-4 border-t border-zinc-200 flex flex-col sm:flex-row justify-between items-center text-[10px] text-zinc-400 gap-2">
                <span>{settingsMap.businessName || 'Happy in the Home'} • Generated via Care Management System</span>
                <span>Ref: {quoteNum}</span>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
