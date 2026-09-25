import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, CheckCircle2, AlertCircle, RefreshCw, Save, Shield, Key, Zap, Sliders, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AiStatusData {
  configured: boolean;
  hasDatabaseKey?: boolean;
  maskedKey?: string;
  model: string;
  provider: string;
  mcpActive: boolean;
  tools: string[];
  keySource: string;
  settings?: {
    gemini_api_key?: string;
    ai_gemini_api_key?: string;
    ai_model?: string;
    ai_custom_instructions?: string;
  };
}

export default function AiSettings() {
  const { token, settings, updateSettings } = useAuth();

  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [aiModel, setAiModel] = useState<string>('gemini-3.8-flash');
  const [customInstructions, setCustomInstructions] = useState<string>('');

  const [aiStatus, setAiStatus] = useState<AiStatusData | null>(null);
  const [statusLoading, setStatusLoading] = useState<boolean>(true);
  const [testLoading, setTestLoading] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs?: number;
    reply?: string;
    model?: string;
    error?: string;
  } | null>(null);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchStatus = async () => {
    setStatusLoading(true);
    try {
      const res = await fetch('/api/ai/status', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const data = await res.json();
        setAiStatus(data);
        if (data.settings) {
          if (data.settings.gemini_api_key) setGeminiApiKey(data.settings.gemini_api_key);
          else if (data.settings.ai_gemini_api_key) setGeminiApiKey(data.settings.ai_gemini_api_key);
          if (data.settings.ai_model) setAiModel(data.settings.ai_model);
          if (data.settings.ai_custom_instructions !== undefined) {
            setCustomInstructions(data.settings.ai_custom_instructions);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load AI status:', e);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Also load from current context settings if available
    if (settings) {
      if (settings.gemini_api_key) setGeminiApiKey(settings.gemini_api_key);
      else if (settings.ai_gemini_api_key) setGeminiApiKey(settings.ai_gemini_api_key);
      if (settings.ai_model) setAiModel(settings.ai_model);
      if (settings.ai_custom_instructions !== undefined) {
        setCustomInstructions(settings.ai_custom_instructions);
      }
    }
  }, [settings]);

  const handleTestConnection = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ model: aiModel, apiKey: geminiApiKey })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || 'Failed to ping AI service.'
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const cleanKey = geminiApiKey.trim();
      const payload = {
        ...settings,
        gemini_api_key: cleanKey,
        ai_gemini_api_key: cleanKey,
        ai_model: aiModel,
        ai_custom_instructions: customInstructions
      };

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        updateSettings(payload);
        setSuccessMsg('AI settings and Gemini API key successfully saved to database.');
        setTimeout(() => setSuccessMsg(''), 4000);
        fetchStatus();
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorMsg(errData.error || 'Failed to save AI settings');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Network error saving AI settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl space-y-6">
      {/* Title & Introduction */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-lg bg-brand-teal/20 text-brand-teal border border-brand-teal/30">
            <Bot className="w-5 h-5 text-brand-teal" />
          </div>
          <h3 className="text-base font-medium text-[#E6EDF3]">AI & Roster Intelligence Settings</h3>
        </div>
        <p className="text-xs text-[#8B949E] leading-relaxed">
          Configure and store your Google Gemini API Key in the database, select your preferred AI model, and customize care coordinator instructions for Model Context Protocol (MCP) analytics.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 bg-brand-green/20 text-brand-green border border-brand-green/50 rounded-lg text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-500/20 text-rose-300 border border-rose-500/50 rounded-lg text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. Gemini API Key Configuration Card */}
      <div className="bg-brand-bg/80 border border-border-subtle rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Google Gemini API Key</h4>
              <p className="text-[11px] text-[#8B949E]">
                Stored securely in your portal's SQLite database configuration table
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {statusLoading ? (
              <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Checking...
              </span>
            ) : (aiStatus?.hasDatabaseKey || Boolean(geminiApiKey && geminiApiKey.length > 5)) ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Active in Database
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <AlertCircle className="w-3.5 h-3.5" />
                Missing from Database
              </span>
            )}
            <button
              type="button"
              onClick={fetchStatus}
              title="Refresh status"
              className="p-1.5 text-[#8B949E] hover:text-white hover:bg-white/[0.05] rounded-md transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${statusLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* API Key Input Field */}
        <div>
          <label className="block text-xs font-medium text-[#E6EDF3] mb-1.5">
            Gemini API Key
          </label>
          <div className="relative flex items-center">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={geminiApiKey}
              onChange={e => setGeminiApiKey(e.target.value)}
              placeholder="Paste your Gemini API key (e.g. AIzaSy...)"
              className="w-full bg-black/40 border border-white/[0.1] rounded-lg pl-3 pr-24 py-2.5 text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-brand-teal"
            />
            <div className="absolute right-2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowApiKey(prev => !prev)}
                className="p-1.5 text-zinc-400 hover:text-white rounded transition-colors"
                title={showApiKey ? "Hide key" : "Show key"}
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {geminiApiKey && (
                <button
                  type="button"
                  onClick={() => setGeminiApiKey('')}
                  className="px-1.5 py-0.5 text-[11px] text-zinc-400 hover:text-rose-400 rounded transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <p className="text-[11px] text-[#8B949E] mt-1.5">
            The Express chat controller asynchronously fetches this key directly from the database table before executing any user prompt or MCP tools.
          </p>
        </div>

        {/* Security Info Banner */}
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 text-xs text-[#8B949E] space-y-1.5">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-white font-medium text-[12px]">
                Server-Side Execution & Security
              </p>
              <p className="text-[11px] leading-relaxed">
                When saved, your key is persisted in the internal SQLite configuration store. All AI prompts and MCP tool runs execute strictly on your Node.js server without transmitting secrets to external clients.
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Connection Test */}
        <div className="pt-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-xs text-[#8B949E]">
            Verify your key with Google Gemini and the MCP analytical tools.
          </div>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testLoading}
            className="px-3.5 py-1.5 rounded-lg bg-brand-teal hover:bg-brand-teal/90 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 shadow transition-colors cursor-pointer shrink-0"
          >
            {testLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Testing Key...
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                Test AI Connection
              </>
            )}
          </button>
        </div>

        {/* Test Result Display */}
        {testResult && (
          <div
            className={`p-3 rounded-lg border text-xs animate-in fade-in duration-200 ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
            }`}
          >
            <div className="flex items-center justify-between font-medium mb-1">
              <span className="flex items-center gap-1.5">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                )}
                {testResult.success
                  ? 'Key Valid & AI Engine Operational'
                  : 'Key Validation Failed'}
              </span>
              {testResult.latencyMs !== undefined && (
                <span className="text-[11px] opacity-80 font-mono">
                  {testResult.latencyMs}ms response time
                </span>
              )}
            </div>
            <p className="text-[11px] opacity-90 pl-5.5">
              {testResult.reply || testResult.error}
            </p>
          </div>
        )}
      </div>

      {/* 2. Configuration Form */}
      <form onSubmit={handleSaveSettings} className="space-y-5">
        {/* Model Selection */}
        <div className="bg-brand-bg/80 border border-border-subtle rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-white/[0.06]">
            <Sliders className="w-4 h-4 text-brand-teal" />
            <h4 className="text-sm font-semibold text-white">Gemini Model Selection</h4>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8B949E] mb-1.5">
              Active Gemini AI Model
            </label>
            <select
              value={aiModel}
              onChange={e => setAiModel(e.target.value)}
              className="w-full bg-black/40 border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-teal"
            >
              <option value="gemini-3.8-flash">
                gemini-3.8-flash (Recommended: High-speed, accurate mathematical analysis & general chat)
              </option>
              <option value="gemini-3.1-pro-preview">
                gemini-3.1-pro-preview (Advanced: In-depth strategic reasoning & complex roster optimization)
              </option>
              <option value="gemini-3.1-flash-lite">
                gemini-3.1-flash-lite (Lightweight: Ultra-low latency queries)
              </option>
            </select>
            <p className="text-[11px] text-[#8B949E] mt-1.5">
              Default is <code className="text-brand-teal font-mono">gemini-3.8-flash</code>, offering rapid turnarounds for live care scheduling.
            </p>
          </div>
        </div>

        {/* AI System Instructions & Guidelines */}
        <div className="bg-brand-bg/80 border border-border-subtle rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-white/[0.06]">
            <Sparkles className="w-4 h-4 text-brand-teal" />
            <h4 className="text-sm font-semibold text-white">Assistant Instructions & Guidelines</h4>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8B949E] mb-1.5">
              Custom Care Coordinator Instructions (Optional)
            </label>
            <textarea
              rows={4}
              value={customInstructions}
              onChange={e => setCustomInstructions(e.target.value)}
              placeholder="e.g. Focus on Geraldton and WA regional travel logistics. Remind coordinators to check respite booking limits before adding weekend shifts..."
              className="w-full bg-black/40 border border-white/[0.1] rounded-lg p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-teal leading-relaxed"
            />
            <p className="text-[11px] text-[#8B949E] mt-1.5">
              These instructions are appended to the AI Assistant prompt alongside strict Australian date formatting rules (<code className="text-emerald-300 font-mono">DD/MM/YYYY</code>).
            </p>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 rounded-lg bg-brand-teal hover:bg-brand-teal/90 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-2 shadow transition-colors cursor-pointer"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving to Database...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save AI Settings & API Key
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
