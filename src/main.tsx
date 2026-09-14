import { registerSW } from 'virtual:pwa-register';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';

if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
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
    // When the PWA detects a new version, automatically click refresh for them!
    updateSW(true);
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
      }, 5 * 60 * 1000); // Every 5 mins is safer to prevent looping
    }
  },
  onRegisterError(error) {
    console.error('SW registration error', error);
  }
});
