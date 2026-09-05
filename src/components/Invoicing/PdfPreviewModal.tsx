import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';

export default function PdfPreviewModal({ 
  url, 
  filename,
  onClose,
  token
}: { 
  url: string; 
  filename: string;
  onClose: () => void;
  token: string | null;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchPdf = async () => {
      try {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load PDF');
        const blob = await res.blob();
        if (active) {
          const objUrl = window.URL.createObjectURL(blob);
          setBlobUrl(objUrl);
          setLoading(false);
        }
      } catch (e: any) {
        if (active) {
          console.error(e);
          setError(e.message);
          setLoading(false);
        }
      }
    };
    fetchPdf();
    return () => {
      active = false;
      if (blobUrl) window.URL.revokeObjectURL(blobUrl);
    };
  }, [url, token]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0D1117] border border-border-subtle rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-[#161B22]">
          <h2 className="text-lg font-semibold text-[#E6EDF3]">{filename}</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (blobUrl) {
                  const a = document.createElement('a');
                  a.href = blobUrl;
                  a.download = filename;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }
              }}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              title="Download PDF"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-black/50 relative overflow-hidden flex items-center justify-center">
          {loading ? (
            <div className="text-zinc-400">Loading PDF...</div>
          ) : error ? (
            <div className="text-red-400">Error: {error}</div>
          ) : (
            <iframe 
              src={`${blobUrl}#view=FitH`}
              className="w-full h-full border-0"
              title="PDF Preview"
            />
          )}
        </div>
      </div>
    </div>
  );
}
