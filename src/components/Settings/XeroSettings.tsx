import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Save, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  Send, 
  FileText, 
  ShieldCheck, 
  Unplug, 
  Check, 
  HelpCircle,
  Play,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface XeroStatusResponse {
  configured: boolean;
  enabled: boolean;
  connected: boolean;
  authType: string;
  tenantId?: string;
  tenantName?: string;
  tokenExpiresAt?: number;
  organisation?: {
    name?: string;
    legalName?: string;
    baseCurrency?: string;
    organisationID?: string;
    countryCode?: string;
  };
  settings?: any;
}

export default function XeroSettings() {
  const { token } = useAuth();

  // Settings State
  const [enabled, setEnabled] = useState<boolean>(false);
  const [authType, setAuthType] = useState<'client_credentials' | 'oauth2' | 'manual'>('oauth2');
  const [clientId, setClientId] = useState<string>('');
  const [clientSecret, setClientSecret] = useState<string>('');
  const [tenantId, setTenantId] = useState<string>('');
  const [tenantName, setTenantName] = useState<string>('');
  const [accountCode, setAccountCode] = useState<string>('200');
  const [invoiceStatus, setInvoiceStatus] = useState<'AUTHORISED' | 'DRAFT'>('AUTHORISED');
  const [taxTypeGst, setTaxTypeGst] = useState<string>('OUTPUT');
  const [taxTypeFree, setTaxTypeFree] = useState<string>('BASEXCLUDED');
  const [syncOnTrilogy, setSyncOnTrilogy] = useState<boolean>(true);
  const [syncOnEmail, setSyncOnEmail] = useState<boolean>(true);
  const [attachPdf, setAttachPdf] = useState<boolean>(true);

  // UI / Password visibility
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string>('');
  const [saveError, setSaveError] = useState<string>('');

  // Status & Connection Check
  const [loadingStatus, setLoadingStatus] = useState<boolean>(true);
  const [statusData, setStatusData] = useState<XeroStatusResponse | null>(null);
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [connectionResult, setConnectionResult] = useState<{
    success: boolean;
    message: string;
    orgName?: string;
    tenantId?: string;
    details?: any;
  } | null>(null);

  // Available Tenants
  const [availableTenants, setAvailableTenants] = useState<Array<{ id: string; tenantId: string; tenantName: string }>>([]);
  const [loadingTenants, setLoadingTenants] = useState<boolean>(false);

  // Test Invoice State
  const [testAmount, setTestAmount] = useState<number>(10.00);
  const [testStatus, setTestStatus] = useState<'AUTHORISED' | 'DRAFT'>('AUTHORISED');
  const [isTestingInvoice, setIsTestingInvoice] = useState<boolean>(false);
  const [testInvoiceResult, setTestInvoiceResult] = useState<{
    success: boolean;
    steps?: Array<{ step: string; status: 'ok' | 'failed' | 'info'; detail?: string }>;
    xeroInvoiceId?: string;
    invoiceNumber?: string;
    xeroUrl?: string;
    tenantName?: string;
    totalAmount?: number;
    error?: string;
  } | null>(null);

  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch('/api/xero/status', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const data: XeroStatusResponse = await res.json();
        setStatusData(data);
        if (data.settings) {
          setEnabled(data.settings.xero_enabled === true || data.settings.xero_enabled === 'true' || data.settings.xero_enabled === 1);
          if (data.settings.xero_auth_type) setAuthType(data.settings.xero_auth_type);
          if (data.settings.xero_client_id) setClientId(data.settings.xero_client_id);
          if (data.settings.xero_client_secret) setClientSecret(data.settings.xero_client_secret);
          if (data.settings.xero_tenant_id) setTenantId(data.settings.xero_tenant_id);
          if (data.settings.xero_tenant_name) setTenantName(data.settings.xero_tenant_name);
          if (data.settings.xero_account_code) setAccountCode(data.settings.xero_account_code);
          if (data.settings.xero_invoice_status) setInvoiceStatus(data.settings.xero_invoice_status);
          if (data.settings.xero_tax_type_gst) setTaxTypeGst(data.settings.xero_tax_type_gst);
          if (data.settings.xero_tax_type_free) setTaxTypeFree(data.settings.xero_tax_type_free);
          if (data.settings.xero_sync_on_trilogy !== undefined) setSyncOnTrilogy(data.settings.xero_sync_on_trilogy !== false && data.settings.xero_sync_on_trilogy !== 'false');
          if (data.settings.xero_sync_on_email !== undefined) setSyncOnEmail(data.settings.xero_sync_on_email !== false && data.settings.xero_sync_on_email !== 'false');
          if (data.settings.xero_attach_pdf !== undefined) setAttachPdf(data.settings.xero_attach_pdf !== false && data.settings.xero_attach_pdf !== 'false');
        }
      }
    } catch (e) {
      console.error('Failed to fetch Xero status:', e);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [token]);

  // Listen for OAuth success message from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'XERO_AUTH_SUCCESS') {
        setSaveSuccess('Connected to Xero successfully!');
        setTimeout(() => setSaveSuccess(''), 5000);
        fetchStatus();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccess('');
    setSaveError('');

    try {
      const payload = {
        xero_enabled: enabled,
        xero_auth_type: authType,
        xero_client_id: clientId.trim(),
        xero_client_secret: clientSecret.trim(),
        xero_tenant_id: tenantId.trim(),
        xero_tenant_name: tenantName.trim(),
        xero_account_code: accountCode.trim(),
        xero_invoice_status: invoiceStatus,
        xero_tax_type_gst: taxTypeGst.trim(),
        xero_tax_type_free: taxTypeFree.trim(),
        xero_sync_on_trilogy: syncOnTrilogy,
        xero_sync_on_email: syncOnEmail,
        xero_attach_pdf: attachPdf,
      };

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Failed to save settings.');
      }

      setSaveSuccess('Xero configuration saved successfully!');
      setTimeout(() => setSaveSuccess(''), 4000);
      fetchStatus();
    } catch (err: any) {
      setSaveError(err.message || 'Error saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (authType === 'oauth2' && !statusData?.connected) {
      setConnectionResult({
        success: false,
        message: 'Xero is not connected yet. Please click the blue "Connect with Xero (Authorize Popup)" button above to sign in and link your organisation.'
      });
      return;
    }

    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const res = await fetch('/api/xero/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
          tenantId: tenantId.trim(),
          authType
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setConnectionResult({
          success: true,
          message: data.message || 'Connection verified successfully!',
          orgName: data.organisation?.name || data.tenantName,
          tenantId: data.tenantId,
          details: data.organisation
        });
        if (data.tenantId && !tenantId) setTenantId(data.tenantId);
        if (data.tenantName && !tenantName) setTenantName(data.tenantName);
        fetchStatus();
      } else {
        setConnectionResult({
          success: false,
          message: data.error || 'Connection test failed.'
        });
      }
    } catch (err: any) {
      setConnectionResult({
        success: false,
        message: err.message || 'Network error testing connection.'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleFetchTenants = async () => {
    setLoadingTenants(true);
    try {
      const res = await fetch('/api/xero/tenants', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.tenants)) {
        setAvailableTenants(data.tenants);
        if (data.tenants.length > 0 && !tenantId) {
          setTenantId(data.tenants[0].tenantId);
          setTenantName(data.tenants[0].tenantName);
        }
      } else {
        alert(data.error || 'No tenants returned. Ensure credentials are valid and you are connected.');
      }
    } catch (err: any) {
      alert('Failed to query tenants: ' + err.message);
    } finally {
      setLoadingTenants(false);
    }
  };

  const handleConnectOAuthPopup = async () => {
    try {
      if (!clientId.trim() || !clientSecret.trim()) {
        alert('Please enter your Client ID and Client Secret above first.');
        return;
      }

      // Save credentials first so server can build auth URL
      await handleSaveSettings();

      const redirectUri = `${window.location.origin}/api/xero/callback`;
      const res = await fetch(`/api/xero/auth-url?redirect_uri=${encodeURIComponent(redirectUri)}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Could not generate Xero authorization URL.');
      }

      const popup = window.open(
        data.url,
        'xero_oauth_popup',
        'width=650,height=750,menubar=no,toolbar=no,location=no,status=no'
      );

      if (!popup) {
        alert('Please allow popups in your browser to complete Xero authentication.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to start OAuth flow.');
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Xero? Stored authentication tokens will be cleared.')) {
      return;
    }
    try {
      const res = await fetch('/api/xero/disconnect', {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        setSaveSuccess('Disconnected from Xero.');
        setTimeout(() => setSaveSuccess(''), 4000);
        fetchStatus();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunTestInvoice = async () => {
    setIsTestingInvoice(true);
    setTestInvoiceResult(null);
    try {
      const res = await fetch('/api/xero/test-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          customAmount: testAmount,
          invoiceStatus: testStatus,
          accountCode: accountCode.trim()
        })
      });

      const data = await res.json();
      setTestInvoiceResult(data);
    } catch (err: any) {
      setTestInvoiceResult({
        success: false,
        error: err.message || 'Failed to run test invoice dispatch.'
      });
    } finally {
      setIsTestingInvoice(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl space-y-6 text-[#E6EDF3]">
      {/* Header & Status Card */}
      <div className="bg-brand-bg border border-border-subtle rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 font-bold shrink-0">
              <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current" aria-hidden="true">
                <path d="M12.75 3a9.75 9.75 0 1 0 9.75 9.75A9.76 9.76 0 0 0 12.75 3zm3.72 13.56-2.43-3.66 2.43-3.67a.75.75 0 0 0-1.24-.83l-2.48 3.73-2.48-3.73a.75.75 0 0 0-1.24.83l2.43 3.67-2.43 3.66a.75.75 0 1 0 1.24.83l2.48-3.73 2.48 3.73a.75.75 0 1 0 1.24-.83z"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-semibold text-white tracking-tight">Xero Accounting Integration</h3>
                {loadingStatus ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 text-zinc-400">
                    <RefreshCw className="w-3 h-3 animate-spin mr-1" /> Checking...
                  </span>
                ) : statusData?.connected ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                    Disconnected
                  </span>
                )}
                {enabled && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30 uppercase">
                    Auto-Sync Active
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8B949E] mt-1">
                Simultaneously upload invoices and PDF attachments to your Xero account when sending to Trilogy Care or Emailing to Plan Managers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://go.xero.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-brand-navy hover:bg-zinc-800 border border-border-subtle rounded-md text-xs font-medium text-[#E6EDF3] flex items-center gap-1.5 transition-colors"
            >
              <span>Open Xero</span>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
            </a>
            {statusData?.connected && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Unplug className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            )}
          </div>
        </div>

        {/* Connected Details Bar */}
        {statusData?.connected && (
          <div className="mt-4 pt-4 border-t border-border-subtle grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-brand-navy/60 p-2.5 rounded-lg border border-border-subtle">
              <span className="text-[#8B949E] block mb-0.5 font-medium">Connected Organisation</span>
              <span className="font-semibold text-white truncate block">
                {statusData.organisation?.name || statusData.tenantName || 'Happy in the Home'}
              </span>
            </div>
            <div className="bg-brand-navy/60 p-2.5 rounded-lg border border-border-subtle">
              <span className="text-[#8B949E] block mb-0.5 font-medium">Tenant ID</span>
              <span className="font-mono text-[#E6EDF3] truncate block" title={statusData.tenantId}>
                {statusData.tenantId ? `${statusData.tenantId.slice(0, 18)}...` : 'Auto-detected'}
              </span>
            </div>
            <div className="bg-brand-navy/60 p-2.5 rounded-lg border border-border-subtle">
              <span className="text-[#8B949E] block mb-0.5 font-medium">Authentication Type</span>
              <span className="text-sky-400 font-medium">
                {statusData.authType === 'client_credentials' ? 'Custom Connection (M2M)' : 'OAuth 2.0 Web'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Sync Automation Toggles */}
        <div className="bg-brand-bg border border-border-subtle rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
            <div>
              <h4 className="text-sm font-semibold text-white">Automated Upload Triggers</h4>
              <p className="text-xs text-[#8B949E] mt-0.5">Control when invoices should automatically be uploaded to Xero.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              syncOnTrilogy ? 'bg-sky-500/5 border-sky-500/30 text-white' : 'bg-brand-navy/40 border-border-subtle text-[#8B949E]'
            }`}>
              <input
                type="checkbox"
                checked={syncOnTrilogy}
                onChange={(e) => setSyncOnTrilogy(e.target.checked)}
                disabled={!enabled}
                className="mt-1 rounded border-border-subtle bg-brand-bg text-sky-500 focus:ring-0"
              />
              <div>
                <span className="text-xs font-semibold block">Submit to Trilogy Care</span>
                <span className="text-[11px] text-[#8B949E] block mt-0.5">Upload Home Care invoices when submitting via Trilogy portal.</span>
              </div>
            </label>

            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              syncOnEmail ? 'bg-sky-500/5 border-sky-500/30 text-white' : 'bg-brand-navy/40 border-border-subtle text-[#8B949E]'
            }`}>
              <input
                type="checkbox"
                checked={syncOnEmail}
                onChange={(e) => setSyncOnEmail(e.target.checked)}
                disabled={!enabled}
                className="mt-1 rounded border-border-subtle bg-brand-bg text-sky-500 focus:ring-0"
              />
              <div>
                <span className="text-xs font-semibold block">Email Invoice (NDIS)</span>
                <span className="text-[11px] text-[#8B949E] block mt-0.5">Upload NDIS invoices when emailing Plan Managers or clients.</span>
              </div>
            </label>

            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              attachPdf ? 'bg-sky-500/5 border-sky-500/30 text-white' : 'bg-brand-navy/40 border-border-subtle text-[#8B949E]'
            }`}>
              <input
                type="checkbox"
                checked={attachPdf}
                onChange={(e) => setAttachPdf(e.target.checked)}
                disabled={!enabled}
                className="mt-1 rounded border-border-subtle bg-brand-bg text-sky-500 focus:ring-0"
              />
              <div>
                <span className="text-xs font-semibold block">Attach PDF Invoice</span>
                <span className="text-[11px] text-[#8B949E] block mt-0.5">Attach the generated invoice PDF directly into Xero.</span>
              </div>
            </label>
          </div>
        </div>

        {/* Credentials & Connection Setup */}
        <div className="bg-brand-bg border border-border-subtle rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
            <div>
              <h4 className="text-sm font-semibold text-white">Xero API Credentials</h4>
              <p className="text-xs text-[#8B949E] mt-0.5">
                Configure your Xero Developer App credentials from{' '}
                <a href="https://developer.xero.com/app/manage" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline inline-flex items-center gap-0.5">
                  developer.xero.com <ExternalLink className="w-3 h-3" />
                </a>.
              </p>
            </div>

            {/* Auth Type Selector */}
            <div className="flex items-center bg-brand-navy rounded-lg p-1 border border-border-subtle">
              <button
                type="button"
                onClick={() => setAuthType('client_credentials')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  authType === 'client_credentials' ? 'bg-sky-500 text-white shadow-sm' : 'text-[#8B949E] hover:text-white'
                }`}
              >
                Custom Connection (M2M)
              </button>
              <button
                type="button"
                onClick={() => setAuthType('oauth2')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  authType === 'oauth2' ? 'bg-sky-500 text-white shadow-sm' : 'text-[#8B949E] hover:text-white'
                }`}
              >
                OAuth 2.0 Web App
              </button>
            </div>
          </div>

          {authType === 'client_credentials' && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-200 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <strong className="text-amber-300 font-semibold">Custom Connection Note: </strong>
                In Xero, Client Credentials M2M requires a paid Custom Connection add-on. If you created a standard free Web App on <a href="https://developer.xero.com" target="_blank" rel="noopener noreferrer" className="underline text-sky-300">developer.xero.com</a> (with a redirect URI), please click the <strong>"OAuth 2.0 Web App"</strong> button above!
              </div>
            </div>
          )}

          {authType === 'oauth2' && (
            <div className="p-4 bg-sky-500/10 border border-sky-500/30 rounded-xl text-xs space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <span className="font-semibold text-white block text-sm">OAuth 2.0 Web App Authorization</span>
                  <span className="text-zinc-300 text-[11px] block mt-0.5">
                    Redirect URI in your Xero Developer Portal must match:
                  </span>
                  <code className="font-mono text-sky-300 bg-black/50 px-2 py-0.5 rounded border border-white/10 text-[11px] inline-block mt-1">
                    {typeof window !== 'undefined' ? `${window.location.origin}/api/xero/callback` : '/api/xero/callback'}
                  </code>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleConnectOAuthPopup}
                    className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-md transition-colors"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>{statusData?.connected ? 'Re-authorize with Xero' : 'Connect with Xero (Authorize Popup)'}</span>
                  </button>
                </div>
              </div>

              {!statusData?.connected ? (
                <div className="p-2.5 bg-sky-950/60 border border-sky-500/20 rounded-lg text-sky-200 text-[11px]">
                  👉 <strong>Next Step:</strong> Ensure your <strong>Client ID</strong> and <strong>Client Secret</strong> are entered below, then click the blue <strong>"Connect with Xero (Authorize Popup)"</strong> button above to link your Xero organisation.
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-300 text-[11px] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Linked to Xero organisation: <strong>{statusData.organisation?.name || statusData.tenantName || 'Happy in the Home'}</strong></span>
                  </div>
                  <div className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-lg text-sky-200 text-[11px] flex items-center justify-between gap-2">
                    <span>💡 <strong>Staff &amp; Payroll:</strong> To sync employees and award pay rates, click <strong>"Re-authorize with Xero"</strong> above if your current connection was authorized before adding payroll permissions.</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                Client ID <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="e.g. 52B3482D..."
                className="w-full bg-brand-navy border border-border-subtle rounded-lg px-3 py-2 text-xs text-[#E6EDF3] focus:border-sky-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                Client Secret <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="e.g. o7X..."
                  className="w-full bg-brand-navy border border-border-subtle rounded-lg pl-3 pr-9 py-2 text-xs text-[#E6EDF3] focus:border-sky-500 focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-zinc-300">
                  Tenant / Organisation ID
                </label>
                <button
                  type="button"
                  onClick={handleFetchTenants}
                  disabled={loadingTenants || !clientId}
                  className="text-[11px] text-sky-400 hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  {loadingTenants ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  <span>Detect Tenants</span>
                </button>
              </div>
              {availableTenants.length > 0 ? (
                <select
                  value={tenantId}
                  onChange={(e) => {
                    const sel = availableTenants.find(t => t.tenantId === e.target.value);
                    setTenantId(e.target.value);
                    if (sel) setTenantName(sel.tenantName);
                  }}
                  className="w-full bg-brand-navy border border-border-subtle rounded-lg px-3 py-2 text-xs text-[#E6EDF3] focus:border-sky-500 focus:outline-none"
                >
                  <option value="">-- Select Organisation --</option>
                  {availableTenants.map(t => (
                    <option key={t.tenantId} value={t.tenantId}>
                      {t.tenantName} ({t.tenantId.slice(0, 8)}...)
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  placeholder="Leave blank for auto-discovery or enter Tenant UUID"
                  className="w-full bg-brand-navy border border-border-subtle rounded-lg px-3 py-2 text-xs text-[#E6EDF3] focus:border-sky-500 focus:outline-none font-mono"
                />
              )}
              <span className="text-[10px] text-zinc-500 block mt-1">If blank, the system automatically binds to your primary Xero Organisation.</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                Organisation Label
              </label>
              <input
                type="text"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="e.g. Happy in the Home Pty Ltd"
                className="w-full bg-brand-navy border border-border-subtle rounded-lg px-3 py-2 text-xs text-[#E6EDF3] focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Accounting Defaults */}
        <div className="bg-brand-bg border border-border-subtle rounded-xl p-5 shadow-sm space-y-4">
          <div className="pb-3 border-b border-border-subtle">
            <h4 className="text-sm font-semibold text-white">Accounting & Chart of Accounts Mapping</h4>
            <p className="text-xs text-[#8B949E] mt-0.5">Specify default sales codes and tax configurations for Xero invoices.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                Sales Account Code
              </label>
              <input
                type="text"
                value={accountCode}
                onChange={(e) => setAccountCode(e.target.value)}
                placeholder="200"
                className="w-full bg-brand-navy border border-border-subtle rounded-lg px-3 py-2 text-xs text-[#E6EDF3] focus:border-sky-500 focus:outline-none font-mono"
              />
              <span className="text-[10px] text-zinc-500 block mt-1">Default: 200 (Sales Revenue)</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                Invoice Status in Xero
              </label>
              <select
                value={invoiceStatus}
                onChange={(e) => setInvoiceStatus(e.target.value as any)}
                className="w-full bg-brand-navy border border-border-subtle rounded-lg px-3 py-2 text-xs text-[#E6EDF3] focus:border-sky-500 focus:outline-none"
              >
                <option value="AUTHORISED">AUTHORISED (Approved / Awaiting Payment)</option>
                <option value="DRAFT">DRAFT (Requires Approval in Xero)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                GST Free Tax Type (NDIS)
              </label>
              <input
                type="text"
                value={taxTypeFree}
                onChange={(e) => setTaxTypeFree(e.target.value)}
                placeholder="BASEXCLUDED"
                className="w-full bg-brand-navy border border-border-subtle rounded-lg px-3 py-2 text-xs text-[#E6EDF3] focus:border-sky-500 focus:outline-none font-mono"
              />
              <span className="text-[10px] text-zinc-500 block mt-1">BASEXCLUDED or EXEMPTOUTPUT</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                10% GST Tax Type
              </label>
              <input
                type="text"
                value={taxTypeGst}
                onChange={(e) => setTaxTypeGst(e.target.value)}
                placeholder="OUTPUT"
                className="w-full bg-brand-navy border border-border-subtle rounded-lg px-3 py-2 text-xs text-[#E6EDF3] focus:border-sky-500 focus:outline-none font-mono"
              />
              <span className="text-[10px] text-zinc-500 block mt-1">Default: OUTPUT (10% GST on Income)</span>
            </div>
          </div>
        </div>

        {/* Action Buttons & Feedback */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-brand-blue hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-2 shadow-sm transition-colors"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Xero Settings</span>
            </button>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection || !clientId}
              className="px-4 py-2 bg-brand-navy hover:bg-zinc-800 border border-border-subtle rounded-lg text-xs font-medium text-white flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {testingConnection ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" /> : <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />}
              <span>Test Connection</span>
            </button>
          </div>

          {saveSuccess && (
            <div className="text-xs text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-md border border-emerald-500/20">
              <Check className="w-3.5 h-3.5" />
              <span>{saveSuccess}</span>
            </div>
          )}

          {saveError && (
            <div className="text-xs text-rose-400 flex items-center gap-1.5 bg-rose-500/10 px-3 py-1.5 rounded-md border border-rose-500/20">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{saveError}</span>
            </div>
          )}
        </div>

        {/* Connection Test Result Modal / Box */}
        {connectionResult && (
          <div className={`p-4 rounded-xl border text-xs ${
            connectionResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
          }`}>
            <div className="flex items-center gap-2 font-semibold">
              {connectionResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
              <span>{connectionResult.message}</span>
            </div>
            {connectionResult.orgName && (
              <div className="mt-2 text-zinc-300 space-y-0.5 font-mono text-[11px]">
                <div>Organisation: <strong>{connectionResult.orgName}</strong></div>
                {connectionResult.tenantId && <div>Tenant ID: {connectionResult.tenantId}</div>}
              </div>
            )}
          </div>
        )}
      </form>

      {/* DIAGNOSTIC TEST INVOICE SECTION (Explicitly requested by user) */}
      <div className="bg-brand-bg border border-sky-500/30 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/10 rounded-lg text-sky-400">
              <Play className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Live Diagnostic: Test Sending Invoice to Xero</h4>
              <p className="text-xs text-[#8B949E] mt-0.5">
                Dispatch a real test invoice to Xero with an attached PDF to verify and debug your end-to-end integration.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRunTestInvoice}
            disabled={isTestingInvoice || !clientId}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors self-start sm:self-auto"
          >
            {isTestingInvoice ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Dispatching Test...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Send Test Invoice to Xero</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">Test Invoice Amount ($ AUD)</label>
            <input
              type="number"
              step="0.01"
              value={testAmount}
              onChange={(e) => setTestAmount(parseFloat(e.target.value) || 0)}
              className="w-full bg-brand-navy border border-border-subtle rounded-lg px-3 py-2 text-xs text-[#E6EDF3] focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">Invoice Status in Xero</label>
            <select
              value={testStatus}
              onChange={(e) => setTestStatus(e.target.value as any)}
              className="w-full bg-brand-navy border border-border-subtle rounded-lg px-3 py-2 text-xs text-[#E6EDF3] focus:border-sky-500 focus:outline-none"
            >
              <option value="DRAFT">DRAFT (Safe test - does not lock invoice in Xero)</option>
              <option value="AUTHORISED">AUTHORISED (Live approved sales invoice)</option>
            </select>
          </div>
        </div>

        {/* Test Execution Output */}
        {testInvoiceResult && (
          <div className={`p-4 rounded-xl border space-y-3 ${
            testInvoiceResult.success ? 'bg-brand-navy/90 border-emerald-500/40' : 'bg-brand-navy/90 border-rose-500/40'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold flex items-center gap-1.5 ${
                testInvoiceResult.success ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {testInvoiceResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {testInvoiceResult.success ? 'Test Invoice Created & Uploaded to Xero!' : 'Test Invoice Failed'}
              </span>

              {testInvoiceResult.xeroUrl && (
                <a
                  href={testInvoiceResult.xeroUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <span>View in Xero</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Step Diagnostics */}
            {testInvoiceResult.steps && (
              <div className="space-y-1.5 pt-1 text-xs">
                {testInvoiceResult.steps.map((st, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="mt-0.5">
                      {st.status === 'ok' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : st.status === 'failed' ? (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                      )}
                    </span>
                    <div>
                      <span className="font-medium text-white">{st.step}</span>
                      {st.detail && <span className="text-[#8B949E] block text-[11px] font-mono">{st.detail}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {testInvoiceResult.error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded text-xs text-rose-300 font-mono">
                {testInvoiceResult.error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
