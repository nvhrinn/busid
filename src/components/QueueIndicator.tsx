import { Clock, Lock } from 'lucide-react';

interface Props {
  isQueued: boolean;
  cooldownRemaining: number;
}

export function QueueIndicator({ isQueued, cooldownRemaining }: Props) {
  if (!isQueued) return null;

  const seconds = Math.ceil(cooldownRemaining / 1000);
  const progress = cooldownRemaining > 0 ? cooldownRemaining : 0;

  return (
    <div className="bg-black text-yellow-300 border-2 border-black nb-shadow-sm px-3 py-2 flex items-center gap-2 animate-pulse">
      <Lock className="w-4 h-4" />
      <span className="text-xs font-bold uppercase tracking-wide">Antrian</span>
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" />
        <span className="font-display text-sm tabular-nums">{seconds}s</span>
      </div>
      <div className="w-20 h-2 bg-neutral-800 border border-yellow-300 overflow-hidden">
        <div
          className="h-full bg-yellow-300 transition-all duration-100"
          style={{ width: `${progress > 0 ? (progress / 8000) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}
