import { Lock, Clock, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  cooldownRemaining: number;
  cooldownTotal: number;
  onClose: () => void;
}

export function QueueModal({ isOpen, cooldownRemaining, cooldownTotal, onClose }: Props) {
  if (!isOpen) return null;

  const seconds = Math.ceil(cooldownRemaining / 1000);
  const progress = cooldownTotal > 0 ? (cooldownRemaining / cooldownTotal) * 100 : 0;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeDisplay = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ animation: 'nb-fade-in 0.2s ease both' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative bg-yellow-300 border-4 border-black nb-shadow-lg p-8 max-w-sm w-full text-center"
        style={{ animation: 'nb-pop-in 0.3s ease both' }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 bg-white border-2 border-black nb-shadow-sm nb-press flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Lock icon */}
        <div className="w-16 h-16 bg-black mx-auto mb-4 flex items-center justify-center nb-shadow-sm">
          <Lock className="w-9 h-9 text-yellow-300" />
        </div>

        <h2 className="font-display text-2xl mb-2">ANTREAN AKTIF</h2>
        <p className="text-sm font-semibold mb-6">
          Tunggu cooldown selesai sebelum melakukan transaksi berikutnya. Ini untuk mencegah spam berlebih.
        </p>

        {/* Timer display */}
        <div className="bg-white border-2 border-black nb-shadow-sm py-4 mb-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Clock className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wide">Tunggu</span>
          </div>
          <p className="font-display text-4xl tabular-nums leading-none">{timeDisplay}</p>
        </div>

        {/* Progress bar */}
        <div className="border-2 border-black bg-white h-6 overflow-hidden relative">
          <div
            className="h-full bg-black transition-all duration-100 ease-linear flex items-center justify-end pr-1"
            style={{ width: `${100 - progress}%` }}
          >
            <div className="w-2 h-2 bg-yellow-300 rounded-full" />
          </div>
        </div>

        <div className="flex justify-between text-[10px] font-bold uppercase mt-1.5 text-neutral-700">
          <span>Progress</span>
          <span>{Math.round(100 - progress)}%</span>
        </div>
      </div>
    </div>
  );
}
