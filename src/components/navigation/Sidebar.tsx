import { NavLink } from 'react-router-dom';
import { TreePine, Search, Settings, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  onAddClick?: () => void;
}

export function Sidebar({ onAddClick }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { to: '/', icon: TreePine, label: 'Family Tree' },
    { to: '/search', icon: Search, label: 'Search' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside
      className={cn(
        'h-screen bg-background/95 border-r border-border flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b">
        {!collapsed && (
          <h1 className="font-semibold text-lg">My Kin Map</h1>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            color: 'hsl(var(--foreground))',
            backgroundColor: 'transparent',
          }}
          className={cn('p-2 rounded-lg transition-colors hover:bg-slate-400/20', collapsed && 'mx-auto')}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Add Button */}
      <div className="p-3">
        <button
          onClick={onAddClick}
          style={{
            backgroundColor: 'hsl(var(--primary) / 0.85)',
            color: 'hsl(var(--primary-foreground))',
          }}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium',
            'hover:opacity-90 active:opacity-75',
            collapsed && 'px-0'
          )}
        >
          <Plus className="h-4 w-4" />
          {!collapsed && <span>Add Person</span>}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                'text-foreground/75 hover:text-foreground hover:bg-muted/70',
                isActive && 'bg-primary/20 text-primary font-semibold',
                collapsed && 'justify-center'
              )
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="font-medium">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        {!collapsed && (
          <p className="text-xs text-foreground/60 text-center">
            Your data stays on your device
          </p>
        )}
      </div>
    </aside>
  );
}
