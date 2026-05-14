import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Share, X, Download, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePWAInstall } from 'react-use-pwa-install';

export default function UniversalPWAInstall() {
  const { settings } = useAuth();
  const install = usePWAInstall();
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Check if running as PWA
    const isPwa = window.matchMedia('(display-mode: standalone)').matches || 
                  (window.navigator as any).standalone;
    setIsStandalone(isPwa);

    if (localStorage.getItem('pwaPromptDismissedUniversal4')) {
      setIsDismissed(true);
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

  }, []);

  if (!isMounted) return null;

  // Show if NOT standalone, NOT dismissed (we show it even if install is null so you can see it, and we handle the already installed case)
  const shouldShowButton = !isStandalone && !isDismissed;
  
  let iconUrl = settings?.pwaIcon192 || settings?.websiteLogo;
  if (iconUrl === '/favicon.ico') iconUrl = null;

  const handleDismiss = () => {
     setIsDismissed(true);
     localStorage.setItem('pwaPromptDismissedUniversal4', 'true');
  };

  const handleInstallClick = () => {
    if (install) {
       install();
       handleDismiss();
    } else {
       alert("The app is already installed natively! Click the 'Open in app' monitor icon in your browser's address bar to launch it.");
       handleDismiss();
    }
  };

  return (
    <>
      <AnimatePresence>
        {shouldShowButton && (
          <motion.div
            initial={{ y: 150, opacity: 0, x: '-50%' }}
            animate={{ y: 0, opacity: 1, x: '-50%' }}
            exit={{ y: 150, opacity: 0, x: '-50%' }}
            className="fixed bottom-6 left-1/2 z-[9999] w-[90%] max-w-sm"
          >
            <div className="bg-[#1e293b]/90 border border-[#0ea5e9]/40 rounded-2xl shadow-xl p-4 flex flex-col gap-3 relative overflow-hidden backdrop-blur-xl">
              <button 
                onClick={handleDismiss}
                className="absolute top-2 right-2 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800/50 hover:bg-slate-700 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-4">
                {iconUrl ? (
                  <img 
                    src={iconUrl} 
                    alt="App Icon" 
                    className="w-10 h-10 rounded-xl shadow-md object-contain bg-white shrink-0"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl shadow-md bg-gradient-to-br from-[#0ea5e9] to-[#06b6d4] flex items-center justify-center shrink-0">
                    <Home className="w-6 h-6 text-white" />
                  </div>
                )}
                <div className="pr-2">
                  <h3 className="font-semibold text-white text-[14px]">Install App</h3>
                  <p className="text-slate-300 text-[12px] mt-0.5 leading-snug">
                    Get quick access and offline mode on your home screen.
                  </p>
                </div>
              </div>
              
              {isIOS ? (
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-3 text-[12px] text-slate-300 flex flex-col items-center text-center gap-2 mt-1">
                  <div className="flex items-center gap-1.5">
                      <span>Tap</span>
                      <span className="bg-slate-800 p-1.5 rounded-md border border-slate-600"><Share className="w-3.5 h-3.5 text-blue-400" /></span>
                      <span>in Safari</span>
                  </div>
                  <div>
                      then select <strong className="text-white font-medium">Add to Home Screen</strong>
                  </div>
                </div>
              ) : (
                <div className="mt-1">
                  <button 
                    onClick={handleInstallClick}
                    className="w-full bg-gradient-to-r from-[#0ea5e9] to-[#06b6d4] hover:from-[#06b6d4] hover:to-[#0ea5e9] text-white font-medium py-2.5 rounded-xl shadow-lg hover:shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 text-[13px]"
                  >
                    <Download className="w-4 h-4" /> Install Now
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

