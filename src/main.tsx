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
  onRegistered(r) {
    if (r) {
      // Check immediately
      r.update();
      
      // Check every minute
      setInterval(() => {
        r.update();
      }, 60 * 1000); 

      // Check whenever the window regains focus
      window.addEventListener('focus', () => {
         r.update();
      });
    }
  },
  onRegisterError(error) {
    console.error('SW registration error', error);
  }
});
