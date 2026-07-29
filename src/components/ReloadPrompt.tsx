import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export default function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-brand-navy border border-brand-teal p-4 rounded-lg shadow-lg max-w-sm">
      <div className="flex items-start space-x-3">
        <div className="flex-1">
          <p className="text-sm text-zinc-200">
            A new version of the app is available!
          </p>
        </div>
      </div>
      <div className="mt-4 flex space-x-2">
        <button
          onClick={() => updateServiceWorker(true)}
          className="flex-1 bg-brand-teal hover:bg-brand-teal/90 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Update App
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          className="px-3 py-2 border border-zinc-700 hover:bg-zinc-800 rounded-md text-sm text-zinc-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
