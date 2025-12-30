import { Menu } from 'lucide-react';
import { Button } from '@/components/ui';

interface MobileHeaderProps {
  title?: string;
  onMenuClick?: () => void;
  rightAction?: React.ReactNode;
}

export function MobileHeader({ title = 'My Kin Map', onMenuClick, rightAction }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-background border-b safe-area-inset-top">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2">
          {onMenuClick && (
            <Button variant="ghost" size="icon" onClick={onMenuClick}>
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <h1 className="font-semibold text-lg truncate">{title}</h1>
        </div>
        {rightAction && (
          <div className="flex items-center">
            {rightAction}
          </div>
        )}
      </div>
    </header>
  );
}
