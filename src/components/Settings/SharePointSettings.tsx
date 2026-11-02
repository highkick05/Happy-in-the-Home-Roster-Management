import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  ExternalLink,
  Eye,
  EyeOff,
  FolderTree,
  HardDrive,
  HelpCircle,
  ShieldCheck,
  FolderCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SharePointSiteOption {
  id: string;
  name: string;
  displayName: string;
  webUrl: string;
}

interface SharePointDriveOption {
  id: string;
  name: string;
  webUrl: string;
  driveType: string;
}

interface SharePointStatusResponse {
  configured: boolean;
  connected: boolean;
  siteName?: string;
  siteWebUrl?: string;
  siteId?: string;
  driveId?: string;
  driveName?: string;
  tokenRoles?: string[];
  ndisPathStatus?: { exists: boolean; path: string; childCount?: number; webUrl?: string };
  hcPathStatus?: { exists: boolean; path: string; childCount?: number; webUrl?: string };
  availableSites?: SharePointSiteOption[];
  availableDrives?: SharePointDriveOption[];
  error?: string;
  settings?: {
    sharepoint_tenant_id?: string;
    sharepoint_client_id?: string;
    sharepoint_client_secret?: string;
    sharepoint_site_url?: string;
    sharepoint_site_id?: string;
    sharepoint_drive_id?: string;
    sharepoint_drive_name?: string;
    sharepoint_ndis_base_path?: string;
    sharepoint_hc_base_path?: string;
  };
}

export default function SharePointSettings() {
  const { token } = useAuth();

  const [tenantId, setTenantId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [siteId, setSiteId] = useState('');
  const [driveId, setDriveId] = useState('');
  const [driveName, setDriveName] = useState('Documents');
  const [ndisBasePath, setNdisBasePath] = useState('General\\NDIS\\Participant Files');
  const [hcBasePath, setHcBasePath] = useState('General\\SAH\\Clients');

  const [showSecret, setShowSecret] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');
  const [statusData, setStatusData] = useState<SharePointStatusResponse | null>(null);
  const [availableSites, setAvailableSites] = useState<SharePointSiteOption[]>([]);
  const [availableDrives, setAvailableDrives] = useState<SharePointDriveOption[]>([]);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    siteName?: string;
    siteWebUrl?: string;
    driveName?: string;
    tokenRoles?: string[];
    ndisPathStatus?: { exists: boolean; path: string; childCount?: number; webUrl?: string };
    hcPathStatus?: { exists: boolean; path: string; childCount?: number; webUrl?: string };
  } | null>(null);

  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch('/api/sharepoint/status', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const data: SharePointStatusResponse = await res.json();
        setStatusData(data);
        if (data.availableSites) {
          setAvailableSites(data.availableSites);
        }
        if (data.availableDrives) {
          setAvailableDrives(data.availableDrives);
        }
        if (data.settings) {
          if (data.settings.sharepoint_tenant_id !== undefined) setTenantId(data.settings.sharepoint_tenant_id);
          if (data.settings.sharepoint_client_id !== undefined) setClientId(data.settings.sharepoint_client_id);
          if (data.settings.sharepoint_client_secret !== undefined) setClientSecret(data.settings.sharepoint_client_secret);
          if (data.settings.sharepoint_site_url !== undefined) setSiteUrl(data.settings.sharepoint_site_url);
          if (data.settings.sharepoint_site_id !== undefined) setSiteId(data.settings.sharepoint_site_id);
          if (data.settings.sharepoint_drive_id !== undefined) setDriveId(data.settings.sharepoint_drive_id);
          if (data.settings.sharepoint_drive_name !== undefined) setDriveName(data.settings.sharepoint_drive_name || 'Documents');
          if (data.settings.sharepoint_ndis_base_path) setNdisBasePath(data.settings.sharepoint_ndis_base_path);
          if (data.settings.sharepoint_hc_base_path) setHcBasePath(data.settings.sharepoint_hc_base_path);
        }
      }
    } catch (e) {
      console.error('Failed to fetch SharePoint status:', e);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [token]);

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccess('');
    setSaveError('');

    try {
      const res = await fetch('/api/sharepoint/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          sharepoint_tenant_id: tenantId.trim(),
          sharepoint_client_id: clientId.trim(),
          sharepoint_client_secret: clientSecret.trim(),
          sharepoint_site_url: siteUrl.trim(),
          sharepoint_site_id: siteId.trim(),
          sharepoint_drive_id: driveId.trim(),
          sharepoint_drive_name: driveName.trim(),
          sharepoint_ndis_base_path: ndisBasePath.trim(),
          sharepoint_hc_base_path: hcBasePath.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save SharePoint settings');
      }

      setSaveSuccess('SharePoint settings saved successfully.');
      setTimeout(() => setSaveSuccess(''), 4000);
      await fetchStatus();
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save SharePoint settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    setSaveError('');

    try {
      const res = await fetch('/api/sharepoint/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          sharepoint_tenant_id: tenantId.trim(),
          sharepoint_client_id: clientId.trim(),
          sharepoint_client_secret: clientSecret.trim(),
          sharepoint_site_url: siteUrl.trim(),
          sharepoint_site_id: siteId.trim(),
          sharepoint_drive_id: driveId.trim(),
          sharepoint_drive_name: driveName.trim(),
          sharepoint_ndis_base_path: ndisBasePath.trim(),
          sharepoint_hc_base_path: hcBasePath.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.siteId) setSiteId(data.siteId);
        if (data.siteWebUrl && !siteUrl.trim()) setSiteUrl(data.siteWebUrl);
        if (data.driveId) setDriveId(data.driveId);
        if (data.driveName) setDriveName(data.driveName);
        if (data.availableSites) setAvailableSites(data.availableSites);
        if (data.availableDrives) setAvailableDrives(data.availableDrives);
        setTestResult({
          success: true,
          message: data.message || 'Connected to SharePoint Online successfully!',
          siteName: data.siteName,
          siteWebUrl: data.siteWebUrl,
          driveName: data.driveName,
          tokenRoles: data.tokenRoles,
          ndisPathStatus: data.ndisPathStatus,
          hcPathStatus: data.hcPathStatus
        });
        await fetchStatus();
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Could not connect to SharePoint. Please verify your credentials and Site URL.'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network error while testing SharePoint connection.'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-brand-teal shrink-0">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-semibold text-[#E6EDF3]">Microsoft SharePoint Online Integration</h3>
              {loadingStatus ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-[#8B949E]">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Checking...
                </span>
              ) : statusData?.connected ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </span>
              ) : statusData?.configured ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <AlertCircle className="w-3 h-3" /> Configured (Needs Verification)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-500/15 text-zinc-400 border border-zinc-500/30">
                  Not Connected
                </span>
              )}
            </div>
            <p className="text-xs text-[#8B949E] mt-1">
              Sync client &amp; participant documents directly with your SharePoint Document Library in real time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-border-subtle text-xs text-[#E6EDF3] flex items-center gap-1.5 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-brand-teal" />
            <span>{showGuide ? 'Hide Setup Guide' : 'Entra ID Setup Guide'}</span>
          </button>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testingConnection || !tenantId || !clientId || !clientSecret}
            className="px-3.5 py-1.5 rounded-lg bg-brand-teal/15 hover:bg-brand-teal/25 border border-brand-teal/40 text-brand-teal text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
            <span>{testingConnection ? 'Testing Connection...' : 'Test & Verify Connection'}</span>
          </button>
        </div>
      </div>

      {/* Entra ID Setup Guide Collapsible */}
      {showGuide && (
        <div className="p-4 rounded-xl bg-[#0D1117] border border-brand-teal/30 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-brand-teal flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              How to Connect Microsoft SharePoint via Entra ID (Azure AD)
            </h4>
            <a
              href="https://entra.microsoft.com"
              target="_blank"
              rel="noreferrer"
              className="text-brand-teal hover:underline flex items-center gap-1 text-[11px]"
            >
              Open Microsoft Entra Admin Center <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-[#8B949E] leading-relaxed">
            <li>
              Go to <strong className="text-[#E6EDF3]">Microsoft Entra Admin Center</strong> (or Azure Portal) &rarr; <strong className="text-[#E6EDF3]">App registrations</strong> &rarr; <strong className="text-[#E6EDF3]">New registration</strong> (e.g., <em>Happy in the Home Portal</em>).
            </li>
            <li>
              Copy the <strong className="text-[#E6EDF3]">Application (client) ID</strong> and <strong className="text-[#E6EDF3]">Directory (tenant) ID</strong> into the fields below.
            </li>
            <li>
              Go to <strong className="text-[#E6EDF3]">Certificates &amp; secrets</strong> &rarr; <strong className="text-[#E6EDF3]">New client secret</strong>. Copy the generated <strong className="text-[#E6EDF3]">Value</strong> (not the Secret ID) into the <strong className="text-[#E6EDF3]">Client Secret</strong> field below.
            </li>
            <li>
              Go to <strong className="text-[#E6EDF3]">API permissions</strong> &rarr; <strong className="text-[#E6EDF3]">Add a permission</strong> &rarr; <strong className="text-[#E6EDF3]">Microsoft Graph</strong> &rarr; <strong className="text-[#E6EDF3]">Application permissions</strong>, and add <code className="text-brand-teal bg-white/5 px-1.5 py-0.5 rounded">Sites.ReadWrite.All</code> and <code className="text-brand-teal bg-white/5 px-1.5 py-0.5 rounded">Files.ReadWrite.All</code>.
            </li>
            <li>
              Click <strong className="text-[#E6EDF3]">&ldquo;Grant admin consent for [Your Organization]&rdquo;</strong> so the green checkmarks appear, then paste your SharePoint Site URL below and click <strong className="text-[#E6EDF3]">Test &amp; Verify Connection</strong>.
            </li>
          </ol>
        </div>
      )}

      {/* Alerts */}
      {saveSuccess && (
        <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}
      {saveError && (
        <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Live Connection Test Result */}
      {testResult && (
        <div
          className={`p-4 rounded-xl border text-xs space-y-2.5 ${
            testResult.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 font-semibold">
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
            {testResult.siteWebUrl && (
              <a
                href={testResult.siteWebUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-brand-teal hover:underline"
              >
                Open SharePoint Site <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {testResult.tokenRoles && testResult.tokenRoles.length > 0 && (
            <div className="text-[11px] text-[#8B949E]">
              Granted Application Roles:{' '}
              <span className="font-mono text-brand-teal">
                {testResult.tokenRoles.join(', ')}
              </span>
            </div>
          )}

          {testResult.success && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10">
              <div className="p-2.5 rounded-lg bg-black/30 border border-white/5 flex items-start gap-2.5">
                <FolderCheck className={`w-4 h-4 mt-0.5 shrink-0 ${testResult.ndisPathStatus?.exists ? 'text-emerald-400' : 'text-amber-400'}`} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[#E6EDF3]">NDIS Participant Folder Base</div>
                  <div className="text-[11px] text-[#8B949E] truncate">{testResult.ndisPathStatus?.path}</div>
                  <div className="text-[11px] mt-1">
                    {testResult.ndisPathStatus?.exists ? (
                      <span className="text-emerald-400 font-medium">
                        Found on SharePoint ({testResult.ndisPathStatus.childCount ?? 0} participant folders)
                      </span>
                    ) : (
                      <span className="text-amber-400">
                        Folder not found yet (will be created automatically when needed)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-black/30 border border-white/5 flex items-start gap-2.5">
                <FolderCheck className={`w-4 h-4 mt-0.5 shrink-0 ${testResult.hcPathStatus?.exists ? 'text-emerald-400' : 'text-amber-400'}`} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[#E6EDF3]">Home Care (SAH) Client Folder Base</div>
                  <div className="text-[11px] text-[#8B949E] truncate">{testResult.hcPathStatus?.path}</div>
                  <div className="text-[11px] mt-1">
                    {testResult.hcPathStatus?.exists ? (
                      <span className="text-emerald-400 font-medium">
                        Found on SharePoint ({testResult.hcPathStatus.childCount ?? 0} client folders)
                      </span>
                    ) : (
                      <span className="text-amber-400">
                        Folder not found yet (will be created automatically when needed)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: Entra ID Credentials */}
        <div className="p-4 rounded-xl bg-[#0D1117]/70 border border-border-subtle space-y-4">
          <div className="flex items-center gap-2 border-b border-border-subtle pb-2.5">
            <ShieldCheck className="w-4 h-4 text-brand-teal" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#E6EDF3]">
              1. Microsoft Entra ID (Azure AD) Credentials
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#8B949E] mb-1.5">
                Directory (Tenant) ID
              </label>
              <input
                type="text"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="e.g. 12345678-abcd-1234-abcd-1234567890ab"
                className="w-full bg-brand-navy border border-border-subtle rounded-lg px-3 py-2 text-xs text-[#E6EDF3] outline-none focus:border-brand-teal transition-colors font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8B949E] mb-1.5">
                Application (Client) ID
              </label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="e.g. 87654321-dcba-4321-dcba-ba0987654321"
                className="w-full bg-brand-navy border border-border-subtle rounded-lg px-3 py-2 text-xs text-[#E6EDF3] outline-none focus:border-brand-teal transition-colors font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#8B949E] mb-1.5">
                Client Secret Value
              </label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Enter your Entra ID App Client Secret Value..."
                  className="w-full bg-brand-navy border border-border-subtle rounded-lg pl-3 pr-10 py-2 text-xs text-[#E6EDF3] outline-none focus:border-brand-teal transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8B949E] hover:text-[#E6EDF3] p-1"
                  title={showSecret ? 'Hide Secret' : 'Show Secret'}
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: SharePoint Site & Document Library */}
        <div className="p-4 rounded-xl bg-[#0D1117]/70 border border-border-subtle space-y-4">
          <div className="flex items-center gap-2 border-b border-border-subtle pb-2.5">
            <HardDrive className="w-4 h-4 text-brand-teal" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#E6EDF3]">
              2. SharePoint Site &amp; Document Library
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={availableSites.length > 0 ? 'sm:col-span-1' : 'sm:col-span-2'}>
              <label className="block text-xs font-medium text-[#8B949E] mb-1.5">
                SharePoint Site URL
              </label>
              <input
                type="text"
                value={siteUrl}
                onChange={(e) => {
                  setSiteUrl(e.target.value);
                  setSiteId('');
                  setDriveId('');
                }}
                placeholder="e.g. https://happyinthehome.sharepoint.com/sites/HappyInTheHome"
                className="w-full bg-brand-navy border border-border-subtle rounded-lg px-3 py-2 text-xs text-[#E6EDF3] outline-none focus:border-brand-teal transition-colors"
              />
              <p className="text-[11px] text-[#8B949E] mt-1">
                Paste any URL from your SharePoint site (or leave blank and click &ldquo;Test &amp; Verify Connection&rdquo; to auto-discover your sites).
              </p>
            </div>

            {availableSites.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-[#8B949E] mb-1.5">
                  Discovered SharePoint Sites
                </label>
                <select
                  value={siteId}
                  onChange={(e) => {
                    const selected = availableSites.find((s) => s.id === e.target.value);
                    setSiteId(e.target.value);
                    setDriveId('');
                    if (selected) {
                      setSiteUrl(selected.webUrl);
                    }
                  }}
                  className="w-full bg-brand-navy border border-border-subtle rounded-lg px-3 py-2 text-xs text-[#E6EDF3] outline-none focus:border-brand-teal transition-colors"
                >
                  {availableSites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.displayName || s.name} ({s.webUrl})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[#8B949E] mt-1">
                  Select a discovered site from your Microsoft 365 tenant.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#8B949E] mb-1.5">
                Document Library (Drive)
              </label>
              {availableDrives.length > 0 ? (
                <select
                  value={driveId}
                  onChange={(e) => {
                    const selected = availableDrives.find((d) => d.id === e.target.value);
                    setDriveId(e.target.value);
                    if (selected) setDriveName(selected.name);
                  }}
                  className="w-full bg-brand-navy border border-border-subtle rounded-lg px-3 py-2 text-xs text-[#E6EDF3] outline-none focus:border-brand-teal transition-colors"
                >
                  {availableDrives.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.webUrl})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={driveName}
                  onChange={(e) => setDriveName(e.target.value)}
                  placeholder="Documents (or Shared Documents)"
                  className="w-full bg-brand-navy border border-border-subtle rounded-lg px-3 py-2 text-xs text-[#E6EDF3] outline-none focus:border-brand-teal transition-colors"
                />
              )}
              <p className="text-[11px] text-[#8B949E] mt-1">
                Click &ldquo;Test &amp; Verify Connection&rdquo; above to auto-detect all document libraries on your site.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8B949E] mb-1.5">
                Resolved Drive ID <span className="text-[10px] opacity-60">(Auto-filled)</span>
              </label>
              <input
                type="text"
                value={driveId}
                onChange={(e) => setDriveId(e.target.value)}
                placeholder="Auto-detected when testing connection"
                className="w-full bg-brand-navy/60 border border-border-subtle rounded-lg px-3 py-2 text-xs text-[#8B949E] outline-none focus:border-brand-teal transition-colors font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Client & Participant Folder Mapping */}
        <div className="p-4 rounded-xl bg-[#0D1117]/70 border border-border-subtle space-y-4">
          <div className="flex items-center gap-2 border-b border-border-subtle pb-2.5">
            <FolderTree className="w-4 h-4 text-brand-teal" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#E6EDF3]">
              3. Client &amp; Participant Folder Mapping
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#8B949E] mb-1.5">
                NDIS Participants Base Folder Path
              </label>
              <input
                type="text"
                value={ndisBasePath}
                onChange={(e) => setNdisBasePath(e.target.value)}
                placeholder="General\NDIS\Participant Files"
                className="w-full bg-brand-navy border border-border-subtle rounded-lg px-3 py-2 text-xs text-[#E6EDF3] outline-none focus:border-brand-teal transition-colors font-mono"
              />
              <p className="text-[11px] text-[#8B949E] mt-1">
                NDIS participants (both Active and Suspended) map to{' '}
                <code className="text-brand-teal">{ndisBasePath}\&lt;Participant Name&gt;</code>
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8B949E] mb-1.5">
                Home Care (SAH / HCP) Clients Base Folder Path
              </label>
              <input
                type="text"
                value={hcBasePath}
                onChange={(e) => setHcBasePath(e.target.value)}
                placeholder="General\SAH\Clients"
                className="w-full bg-brand-navy border border-border-subtle rounded-lg px-3 py-2 text-xs text-[#E6EDF3] outline-none focus:border-brand-teal transition-colors font-mono"
              />
              <p className="text-[11px] text-[#8B949E] mt-1">
                Home Care / Support at Home clients map to{' '}
                <code className="text-brand-teal">{hcBasePath}\&lt;Client Name&gt;</code>
              </p>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 bg-brand-teal hover:bg-teal-400 text-black font-semibold rounded-lg text-xs flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save SharePoint Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
