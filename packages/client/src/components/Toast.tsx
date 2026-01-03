import { useToastStore, type ToastType } from '../stores/toastStore';

const typeStyles: Record<ToastType, string> = {
  error: 'bg-red-500/90 border-red-400',
  success: 'bg-green-500/90 border-green-400',
  info: 'bg-blue-500/90 border-blue-400',
};

const typeIcons: Record<ToastType, string> = {
  error: '!',
  success: '✓',
  info: 'i',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${typeStyles[toast.type]} border rounded-lg px-4 py-3 shadow-lg
            animate-slide-in flex items-center gap-3 text-white`}
        >
          <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
            {typeIcons[toast.type]}
          </span>
          <p className="flex-1 text-sm">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-white/70 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
