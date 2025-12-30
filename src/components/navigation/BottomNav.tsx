import { NavLink } from 'react-router-dom';
import { TreePine, Search, Settings, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  onAddClick?: () => void;
}

export function BottomNav({ onAddClick }: BottomNavProps) {
  const navItems = [
    { to: '/', icon: TreePine, label: 'Tree' },
    { to: '/search', icon: Search, label: 'Search' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors touch-target',
                'text-muted-foreground hover:text-foreground',
                isActive && 'text-primary'
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs font-medium">{label}</span>
          </NavLink>
        ))}
      </div>

      {/* Floating Add Button */}
      <button
        onClick={onAddClick}
        className={cn(
          'absolute -top-6 left-1/2 -translate-x-1/2',
          'flex items-center justify-center',
          'w-14 h-14 rounded-full',
          'bg-primary text-primary-foreground shadow-lg',
          'hover:bg-primary/90 active:scale-95 transition-transform',
          'touch-target'
        )}
        aria-label="Add person"
      >
        <Plus className="h-6 w-6" />
      </button>
    </nav>
  );
}
