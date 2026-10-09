import { registerSW } from 'virtual:pwa-register';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';

if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Never force reload while user is on time-critical shift claim route
    if (window.location.pathname.startsWith('/shifts/claim')) {
      return;
    }
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);


const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // When the PWA detects a new version, automatically click refresh for them unless on shift claim
    if (!window.location.pathname.startsWith('/shifts/claim')) {
      updateSW(true);
    }
  },
  onRegistered(r) {
    if (r) {
      // Check for updates immediately when the tab becomes visible or gains focus
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          r.update();
        }
      });
      window.addEventListener('focus', () => {
        r.update();
      });

      // Also check periodically in the background just in case
      setInterval(() => {
        r.update();
      }, 60 * 1000); // Check SW every 60s
    }
  },
  onRegisterError(error) {
    console.error('SW registration error', error);
  }
});

// Proactive Server Version Polling:
// Directly queries /api/version to compare deployed server commit against running client __APP_VERSION__.
// If a newer version is deployed, unregisters SW, purges browser caches, and performs clean reload.
declare const __APP_VERSION__: string | undefined;

(function initVersionPolling() {
  const currentClientVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';
  if (!currentClientVersion || currentClientVersion === 'unknown' || currentClientVersion === 'dev') {
    return;
  }

  let isUpdating = false;

  const triggerCleanReload = async (targetVersion?: string) => {
    if (isUpdating || window.location.pathname.startsWith('/shifts/claim')) return;
    
    // Loop prevention: prevent re-triggering reload if we already attempted within the last 30 seconds
    const lastAttempt = Number(sessionStorage.getItem('last_auto_update_attempt') || 0);
    const lastAttemptVersion = sessionStorage.getItem('last_auto_update_version') || '';
    if (Date.now() - lastAttempt < 30000 && lastAttemptVersion === (targetVersion || '')) {
      console.warn('[Auto-Update] Update attempt throttled to avoid refresh loops.');
      return;
    }

    isUpdating = true;
    sessionStorage.setItem('last_auto_update_attempt', String(Date.now()));
    if (targetVersion) sessionStorage.setItem('last_auto_update_version', targetVersion);

    console.log('[Auto-Update] Newer version detected on server. Performing cache cleanup and reload...');

    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch (e) {
      console.warn('[Auto-Update] Error during cache wipe:', e);
    }

    const cleanUrl = window.location.origin + window.location.pathname;
    window.location.replace(`${cleanUrl}?v=${Date.now()}`);
  };

  const checkServerVersion = async () => {
    if (document.visibilityState !== 'visible' && !document.hasFocus()) {
      return;
    }
    try {
      const res = await fetch(`/api/version?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.version && data.version !== 'unknown') {
          // If the server reported version differs from the client bundle version
          if (data.version !== currentClientVersion) {
            await triggerCleanReload(data.version);
          }
        }
      }
    } catch (err) {
      // Ignore network transients
    }
  };

  // Poll server version every 45 seconds and on visibility/focus
  setInterval(checkServerVersion, 45 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkServerVersion();
    }
  });
  window.addEventListener('focus', checkServerVersion);

  // Run initial check after page stabilizes
  setTimeout(checkServerVersion, 3000);
})();
