import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface UseInstallPromptReturn {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  showIOSPrompt: boolean;
  promptInstall: () => Promise<void>;
  dismissIOSPrompt: () => void;
}

/**
 * Hook to handle PWA installation prompts
 * Handles both the standard beforeinstallprompt event (Chrome/Edge)
 * and provides iOS detection for custom "Add to Home Screen" instructions
 */
export function useInstallPrompt(): UseInstallPromptReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;

  // Detect if running as standalone (installed PWA)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
    || (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  useEffect(() => {
    // Check if already installed
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Show iOS prompt if on iOS and not installed
    if (isIOS && !isStandalone) {
      // Check if user has already seen the prompt
      const hasSeenPrompt = localStorage.getItem('hasSeenIOSInstallPrompt');
      if (!hasSeenPrompt) {
        // Delay showing the prompt to avoid interrupting initial experience
        const timer = setTimeout(() => {
          setShowIOSPrompt(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isIOS, isStandalone]);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const dismissIOSPrompt = useCallback(() => {
    setShowIOSPrompt(false);
    localStorage.setItem('hasSeenIOSInstallPrompt', 'true');
  }, []);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    showIOSPrompt,
    promptInstall,
    dismissIOSPrompt
  };
}
