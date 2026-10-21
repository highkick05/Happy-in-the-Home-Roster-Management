import { registerSW } from 'virtual:pwa-register';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';

if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    // Ensure no leftover dev service workers trigger unexpected reloads in development
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const reg of registrations) {
        reg.unregister();
      }
    }).catch(() => {});
  } else {
    // Only reload on controllerchange if the page was ALREADY controlled by an older Service Worker.
    // Prevents an immediate double-reload when a SW claims control for the very first time.
    const hadController = !!navigator.serviceWorker.controller;
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) return;
      // Never force reload while user is on time-critical shift claim or onboarding invite route
      if (window.location.pathname.startsWith('/shifts/claim') || window.location.pathname.startsWith('/invite')) {
        return;
      }
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }
}

import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (import.meta.env.PROD) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // When the PWA detects a new version, automatically click refresh for them unless on shift claim or invite onboarding
      if (!window.location.pathname.startsWith('/shifts/claim') && !window.location.pathname.startsWith('/invite')) {
        updateSW(true);
      }
    },
    onRegistered(r) {
      if (r) {
        // Check for updates when the tab becomes visible
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            r.update();
          }
        });

        // Check periodically in the background (every 5 minutes)
        setInterval(() => {
          r.update();
        }, 5 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    }
  });
}

// Proactive Server Version Polling:
// Directly queries /api/version to compare deployed server commit against running client __APP_VERSION__.
// If a newer version is deployed, unregisters SW, purges browser caches, and performs clean reload.
declare const __APP_VERSION__: string | undefined;

(function initVersionPolling() {
  // Clean up cache-busting ?v= query parameter from URL bar after an auto-update reload
  if (typeof window !== 'undefined' && window.location.search.includes('v=')) {
    const url = new URL(window.location.href);
    url.searchParams.delete('v');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  }

  // Only poll for deployed server version mismatches in production builds
  if (!import.meta.env.PROD) {
    return;
  }

  const currentClientVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';
  if (!currentClientVersion || currentClientVersion === 'unknown' || currentClientVersion === 'dev') {
    return;
  }

  let isUpdating = false;

  const triggerCleanReload = async (targetVersion?: string) => {
    if (!targetVersion || targetVersion === 'unknown' || targetVersion === 'dev') return;
    if (isUpdating || window.location.pathname.startsWith('/shifts/claim') || window.location.pathname.startsWith('/invite')) return;
    
    // Loop prevention: never repeatedly reload for the exact same targetVersion in the same session,
    // and enforce a minimum 60-second cooldown between any auto-update attempts.
    const lastAttempt = Number(sessionStorage.getItem('last_auto_update_attempt') || 0);
    const lastAttemptVersion = sessionStorage.getItem('last_auto_update_version') || '';
    if (lastAttemptVersion === targetVersion || Date.now() - lastAttempt < 60000) {
      console.warn('[Auto-Update] Update attempt throttled to avoid refresh loops.');
      return;
    }

    isUpdating = true;
    sessionStorage.setItem('last_auto_update_attempt', String(Date.now()));
    sessionStorage.setItem('last_auto_update_version', targetVersion);

    console.log(`[Auto-Update] Newer version (${targetVersion} vs ${currentClientVersion}) detected on server. Performing cache cleanup and reload...`);

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
    if (document.visibilityState !== 'visible') {
      return;
    }
    try {
      const res = await fetch(`/api/version?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.version && data.version !== 'unknown' && data.version !== 'dev') {
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

  // Poll server version every 60 seconds and when tab becomes visible
  setInterval(checkServerVersion, 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkServerVersion();
    }
  });

  // Run initial check after page stabilizes
  setTimeout(checkServerVersion, 5000);
})();
