import { useEffect, useRef, useState } from 'react';
import { CheckCircle, XCircle, Info } from 'lucide-react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const toast = (message: string, type: Toast['type'] = 'info') => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4000);
  };

  return { toasts, toast };
}

export function ToastContainer({ toasts }: { toasts: Toast[] }) {
  const [visible, setVisible] = useState<Toast[]>([]);

  useEffect(() => {
    setVisible(toasts);
  }, [toasts]);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {visible.map((t) => {
        const Icon = t.type === 'success' ? CheckCircle : t.type === 'error' ? XCircle : Info;
        return (
          <div
            key={t.id}
            className={`nb-shadow-lg border-2 border-black px-4 py-3 font-semibold text-sm min-w-[240px] flex items-start gap-2 ${
              t.type === 'success'
                ? 'bg-lime-300'
                : t.type === 'error'
                ? 'bg-red-400 text-white'
                : 'bg-yellow-300'
            }`}
            style={{ animation: 'nb-slide-in 0.3s ease both' }}
          >
            <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
