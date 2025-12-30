import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TreePage, SearchPage, SettingsPage } from '@/pages';
import { BottomNav, Sidebar } from '@/components/navigation';
import { PersonEditor } from '@/components/person';
import { IOSInstallPrompt, InstallBanner } from '@/components/install';
import { ToastProvider, ToastContainer } from '@/components/ui';
import { useIsMobile, useInstallPrompt } from '@/hooks';
import { useSettings, updateSettings } from '@/db';
import './App.css';

function AppLayout() {
  const isMobile = useIsMobile();
  const settings = useSettings();
  const { isInstallable, isIOS, showIOSPrompt, promptInstall, dismissIOSPrompt } = useInstallPrompt();
  
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Show install banner for installable PWA (non-iOS)
  useEffect(() => {
    if (isInstallable && !isIOS) {
      const hasSeenBanner = localStorage.getItem('hasSeenInstallBanner');
      if (!hasSeenBanner) {
        setShowInstallBanner(true);
      }
    }
  }, [isInstallable, isIOS]);

  // Apply theme from settings
  useEffect(() => {
    if (!settings) return;
    
    const applyTheme = () => {
      if (settings.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (settings.theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', prefersDark);
      }
    };

    applyTheme();

    // Listen for system theme changes
    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme();
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [settings?.theme]);

  const handleAddPerson = () => {
    setIsAddPersonOpen(true);
  };

  const handleDismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('hasSeenInstallBanner', 'true');
  };

  const handleIOSPromptClose = () => {
    dismissIOSPrompt();
    updateSettings({ hasSeenInstallPrompt: true });
  };

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* iOS Install Prompt */}
      <IOSInstallPrompt
        open={showIOSPrompt && !settings?.hasSeenInstallPrompt}
        onOpenChange={(open) => {
          if (!open) handleIOSPromptClose();
        }}
      />

      {/* Desktop Sidebar */}
      {!isMobile && <Sidebar onAddClick={handleAddPerson} />}

      {/* Main Content */}
      <main className={`flex-1 flex flex-col overflow-hidden ${isMobile ? 'pb-20' : ''}`}>
        {/* Install Banner (non-iOS) */}
        {showInstallBanner && (
          <InstallBanner
            onInstall={promptInstall}
            onDismiss={handleDismissInstallBanner}
          />
        )}
        <Routes>
          <Route path="/" element={<TreePage onAddPerson={handleAddPerson} />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>

      {/* Mobile Bottom Nav */}
      {isMobile && <BottomNav onAddClick={handleAddPerson} />}

      {/* Add Person Modal */}
      <PersonEditor
        open={isAddPersonOpen}
        onOpenChange={setIsAddPersonOpen}
      />

      {/* Toast Container */}
      <ToastContainer />
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
