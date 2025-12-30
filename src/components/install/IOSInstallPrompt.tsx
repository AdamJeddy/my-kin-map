import { Share, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
} from '@/components/ui';

interface IOSInstallPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IOSInstallPrompt({ open, onOpenChange }: IOSInstallPromptProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">📱</span>
            Install My Kin Map
          </DialogTitle>
          <DialogDescription>
            Install this app on your iPhone for the best experience with offline access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary flex-shrink-0">
              <span className="font-semibold">1</span>
            </div>
            <div className="flex-1">
              <p className="font-medium">Tap the Share button</p>
              <p className="text-sm text-muted-foreground mt-1">
                Look for the{' '}
                <Share className="h-4 w-4 inline-block align-text-bottom" />{' '}
                icon at the bottom of Safari
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary flex-shrink-0">
              <span className="font-semibold">2</span>
            </div>
            <div className="flex-1">
              <p className="font-medium">Scroll and tap "Add to Home Screen"</p>
              <p className="text-sm text-muted-foreground mt-1">
                Look for{' '}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded text-xs">
                  <Plus className="h-3 w-3" /> Add to Home Screen
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary flex-shrink-0">
              <span className="font-semibold">3</span>
            </div>
            <div className="flex-1">
              <p className="font-medium">Tap "Add" to confirm</p>
              <p className="text-sm text-muted-foreground mt-1">
                The app will be added to your home screen
              </p>
            </div>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
          <p>
            <strong>Why install?</strong> Installing gives you quick access, offline support, and a full-screen experience. Your data always stays on your device.
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Maybe Later
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Got It
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
