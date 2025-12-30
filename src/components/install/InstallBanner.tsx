import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui';

interface InstallBannerProps {
  onInstall: () => void;
  onDismiss: () => void;
}

export function InstallBanner({ onInstall, onDismiss }: InstallBannerProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground safe-area-inset-top">
      <div className="flex items-center justify-between gap-2 px-4 py-2">
        <div className="flex items-center gap-3 min-w-0">
          <Download className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium truncate">
            Install My Kin Map for offline access
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={onInstall}
            className="h-8"
          >
            Install
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            className="h-8 w-8 hover:bg-primary-foreground/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
