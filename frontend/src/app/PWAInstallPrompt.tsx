"use client";

import { useState, useEffect } from 'react';
import { X, Share, PlusSquare } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                            (window.navigator as any).standalone === true;
    setIsStandalone(checkStandalone);

    if (checkStandalone) return;

    // Detect iOS Safari
    const ua = window.navigator.userAgent;
    const isIPad = !!ua.match(/iPad/i);
    const isIPhone = !!ua.match(/iPhone/i);
    const isWebKit = !!ua.match(/WebKit/i);
    const isSafari = isWebKit && !ua.match(/CriOS/i); // Not Chrome on iOS

    if ((isIPad || isIPhone) && isSafari) {
      setIsIOS(true);
      // Show iOS prompt slightly delayed
      setTimeout(() => setShowPrompt(true), 2000);
    }

    // Android / Chrome
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (!showPrompt || isStandalone) return null;

  if (isIOS) {
    return (
      <div className="fixed bottom-[84px] left-4 right-4 bg-[#30302e] border border-[#4d4c48] rounded-[20px] p-4 shadow-2xl z-[100] animate-in slide-in-from-bottom-5 fade-in duration-500" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
        <button onClick={() => setShowPrompt(false)} className="absolute top-3 right-3 text-[#87867f] hover:text-[#faf9f5]">
          <X size={18} />
        </button>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-[#141413] rounded-xl flex items-center justify-center shrink-0 shadow-inner">
            <img src="/logo.png" className="w-8 h-8" alt="Theologica" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-[#faf9f5] mb-1">Install Theologica</h3>
            <p className="text-[13px] text-[#b0aea5] leading-relaxed">
              Install this app on your iPhone: tap <Share size={14} className="inline mx-1" /> and then <strong className="text-[#faf9f5]">"Add to Home Screen"</strong> <PlusSquare size={14} className="inline mx-1" />.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Android/Chrome Banner
  return (
    <div className="fixed bottom-[84px] left-4 right-4 bg-[#30302e] border border-[#4d4c48] rounded-[20px] p-4 shadow-2xl z-[100] animate-in slide-in-from-bottom-5 fade-in duration-500 flex items-center justify-between" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center gap-3">
        <img src="/logo.png" className="w-10 h-10 drop-shadow" alt="Theologica" />
        <div>
          <h3 className="text-[14px] font-semibold text-[#faf9f5]">Install App</h3>
          <p className="text-[12px] text-[#87867f]">Add to your home screen</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={handleInstallClick} className="bg-[#c96442] hover:bg-[#b5583b] text-white text-[13px] font-medium px-4 py-2 rounded-xl transition-colors">
          Install
        </button>
        <button onClick={() => setShowPrompt(false)} className="p-2 text-[#87867f] hover:text-[#faf9f5]">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
