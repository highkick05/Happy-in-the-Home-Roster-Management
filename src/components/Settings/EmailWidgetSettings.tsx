import React from 'react';
import { Save, Plus, Trash2, Shield, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function EmailWidgetSettings() {
  const { settings, updateSettings } = useAuth();
  const [accounts, setAccounts] = React.useState<any[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState<Record<number, boolean>>({});

  React.useEffect(() => {
    if (settings?.imapAccounts) {
      setAccounts(settings.imapAccounts);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          imapAccounts: accounts
        })
      });
      if (res.ok) {
        updateSettings({ ...settings, imapAccounts: accounts });
        alert('Email widget settings saved successfully');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const addAccount = () => {
    setAccounts([...accounts, { host: '', port: 993, username: '', password: '', tls: true }]);
  };

  const removeAccount = (index: number) => {
    setAccounts(accounts.filter((_, i) => i !== index));
  };

  const updateAccount = (index: number, field: string, value: any) => {
    const newAccounts = [...accounts];
    newAccounts[index] = { ...newAccounts[index], [field]: value };
    setAccounts(newAccounts);
  };

  const togglePasswordVisibility = (index: number) => {
    setShowPassword(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-[#E6EDF3] mb-2">Email Widget Authentication</h3>
        <p className="text-sm text-[#8B949E]">
          Configure IMAP settings for multiple email accounts to track unread email counts in the floating widget.
        </p>
      </div>

      <div className="space-y-4">
        {accounts.map((acc, i) => (
          <div key={i} className="p-4 bg-white/[0.02] border border-border-subtle rounded-xl relative">
            <button 
              onClick={() => removeAccount(i)}
              className="absolute top-4 right-4 text-red-400 hover:text-red-300 transition-colors"
              title="Remove Account"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <h4 className="text-sm font-semibold text-[#E6EDF3] mb-4">Account {i + 1}</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#8B949E] mb-1">IMAP Host</label>
                <input
                  type="text"
                  value={acc.host}
                  onChange={(e) => updateAccount(i, 'host', e.target.value)}
                  className="w-full bg-brand-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-[#E6EDF3]"
                  placeholder="imap.example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#8B949E] mb-1">IMAP Port</label>
                <input
                  type="number"
                  value={acc.port}
                  onChange={(e) => updateAccount(i, 'port', parseInt(e.target.value))}
                  className="w-full bg-brand-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-[#E6EDF3]"
                  placeholder="993"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#8B949E] mb-1">Username / Email</label>
                <input
                  type="text"
                  value={acc.username}
                  onChange={(e) => updateAccount(i, 'username', e.target.value)}
                  className="w-full bg-brand-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-[#E6EDF3]"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#8B949E] mb-1">Password / App Password</label>
                <div className="relative">
                  <input
                    type={showPassword[i] ? "text" : "password"}
                    value={acc.password}
                    onChange={(e) => updateAccount(i, 'password', e.target.value)}
                    className="w-full bg-brand-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-[#E6EDF3] pr-10"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility(i)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B949E] hover:text-[#E6EDF3] focus:outline-none"
                  >
                    {showPassword[i] ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id={`tls-${i}`}
                  checked={acc.tls}
                  onChange={(e) => updateAccount(i, 'tls', e.target.checked)}
                  className="w-4 h-4 rounded border-border-subtle text-brand-teal focus:ring-brand-teal/20 bg-brand-bg"
                />
                <label htmlFor={`tls-${i}`} className="text-sm text-[#8B949E]">Use TLS/SSL</label>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-border-subtle flex justify-between">
        <button
          onClick={addAccount}
          className="flex items-center px-4 py-2 bg-brand-navy border border-border-subtle text-[#E6EDF3] rounded-lg hover:bg-white/[0.02] hover:border-[#8B949E] transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Email Account
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center px-4 py-2 bg-brand-teal text-brand-navy font-semibold rounded-lg hover:bg-brand-teal/90 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
