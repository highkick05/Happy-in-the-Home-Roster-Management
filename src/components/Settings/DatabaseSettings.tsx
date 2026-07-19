import React, { useState, useEffect } from 'react';
import { Download, Database, HardDrive, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function DatabaseSettings() {
  const { token, user } = useAuth();
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/database/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBackups(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleDownloadLive = async () => {
    try {
      const res = await fetch('/api/admin/database/download-live', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `live-database-${new Date().toISOString().split('T')[0]}.sqlite`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
      alert('Failed to download live database');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalSize = backups.reduce((acc, curr) => acc + curr.size, 0);

  if (user?.role !== 'ADMIN') {
    return <div className="p-3 text-white">Access denied. Admins only.</div>;
  }

  return (
    <div className="p-3 max-w-5xl">
      <div className="mb-8 p-3 bg-brand-bg border border-border-subtle rounded-xl flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-0.5">
            <Database className="w-5 h-5 text-brand-teal" />
            Manual Database Access
          </h3>
          <p className="text-xs text-[#8B949E] max-w-2xl">
            <span className="font-semibold text-red-400">Required:</span> Perform this manual download before every system update or code push. This packages the live SQLite database file.
          </p>
        </div>
        <button
          onClick={handleDownloadLive}
          className="px-6 py-3 font-semibold rounded-md hover:opacity-90 transition-opacity flex items-center gap-2 whitespace-nowrap bg-brand-teal text-brand-bg"
        >
          <Download className="w-5 h-5" />
          Download Current Database
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-0.5">
        <div className="p-5 bg-brand-bg border border-border-subtle rounded-xl flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-brand-teal/10 flex items-center justify-center">
            <HardDrive className="w-6 h-6 text-brand-teal" />
          </div>
          <div>
            <div className="text-xs text-[#8B949E] mb-0.5">Total Storage Used</div>
            <div className="text-2xl font-bold text-white tracking-tight">{formatBytes(totalSize)}</div>
          </div>
        </div>
        <div className="p-5 bg-brand-bg border border-border-subtle rounded-xl flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <div className="text-xs text-[#8B949E] mb-0.5">Last Successful Backup</div>
            <div className="text-xl font-bold text-white tracking-tight">
              {backups.length > 0 ? new Date(backups[0].date).toLocaleString() : 'Never'}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-brand-bg border border-border-subtle rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border-subtle bg-brand-navy flex justify-between items-center">
          <h3 className="text-md font-semibold text-white">Daily Automated Backups</h3>
          <button onClick={fetchBackups} className="text-brand-teal text-sm hover:underline">Refresh</button>
        </div>
        
        {loading ? (
          <div className="p-3 text-center text-[#8B949E]">Loading...</div>
        ) : backups.length === 0 ? (
          <div className="p-3 text-center text-[#8B949E]">No automated backups found. Note: Backup system runs at 2:00 AM daily.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-brand-navy border-b border-border-subtle text-xs uppercase tracking-wider text-[#8B949E]">
                  <th className="px-6 py-3 font-medium">Filename</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Size</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle bg-brand-bg">
                {backups.map((bkp, i) => (
                  <tr key={i} className="hover:bg-brand-navy/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-[#E6EDF3] whitespace-nowrap">
                      {bkp.name}
                    </td>
                    <td className="px-6 py-4 text-xs text-[#8B949E] whitespace-nowrap">
                      {new Date(bkp.date).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-xs text-[#8B949E] whitespace-nowrap">
                      {formatBytes(bkp.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <a 
                        href={`/api/admin/database/download-backup/${encodeURIComponent(bkp.name)}?token=${token}`}
                        className="p-2 text-[#8B949E] hover:text-brand-teal transition-colors inline-block focus:outline-none"
                        title="Download Backup"
                      >
                       <Download className="w-4 h-4" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
