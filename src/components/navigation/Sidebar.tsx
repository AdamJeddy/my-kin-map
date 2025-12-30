import { NavLink } from 'react-router-dom';
import { TreePine, Search, Settings, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';

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
        'h-screen bg-card border-r flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b">
        {!collapsed && (
          <h1 className="font-semibold text-lg">My Kin Map</h1>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(collapsed && 'mx-auto')}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Add Button */}
      <div className="p-3">
        <Button
          onClick={onAddClick}
          className={cn('w-full', collapsed && 'px-0')}
        >
          <Plus className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Add Person</span>}
        </Button>
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
                'text-muted-foreground hover:text-foreground hover:bg-muted',
                isActive && 'bg-primary/10 text-primary',
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
          <p className="text-xs text-muted-foreground text-center">
            Your data stays on your device
          </p>
        )}
      </div>
    </aside>
  );
}
