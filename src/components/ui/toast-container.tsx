import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useToast, ToastType } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

const toastVariants = {
  success: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    text: 'text-green-700 dark:text-green-400',
    icon: CheckCircle,
  },
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-700 dark:text-red-400',
    icon: AlertCircle,
  },
  warning: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    text: 'text-yellow-700 dark:text-yellow-400',
    icon: AlertCircle,
  },
  info: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-700 dark:text-blue-400',
    icon: Info,
  },
};

function ToastItem({ 
  type, 
  title, 
  description, 
  onClose 
}: {
  type: ToastType;
  title: string;
  description?: string;
  onClose: () => void;
}) {
  const variant = toastVariants[type];
  const Icon = variant.icon;

  return (
    <div
      className={cn(
        'flex gap-3 items-start p-4 rounded-lg border shadow-lg backdrop-blur-sm',
        'animate-slide-up transition-all duration-200',
        variant.bg,
        variant.border
      )}
      role="status"
      aria-label={title}
    >
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className={cn('font-medium', variant.text)}>{title}</p>
        {description && (
          <p className={cn('text-sm mt-1', variant.text)}>{description}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className={cn(
          'flex-shrink-0 p-1 rounded hover:bg-white/20 transition-colors',
          variant.text
        )}
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem
            type={toast.type}
            title={toast.title}
            description={toast.description}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}
