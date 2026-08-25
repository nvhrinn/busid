import { Bus, LogOut, RefreshCw, Wallet } from 'lucide-react';
import { formatRupiah } from '@/lib/format';
import type { AccountInfo } from '@/lib/supabase';

interface Props {
  info: AccountInfo;
  deviceId: string;
  onDisconnect: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export function AccountBadge({ info, deviceId, onDisconnect, onRefresh, refreshing }: Props) {
  return (
    <div className="bg-white border-2 border-black nb-shadow-lg p-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-14 h-14 bg-lime-300 border-2 border-black flex items-center justify-center nb-shadow-sm flex-shrink-0">
            <Bus className="w-8 h-8" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Akun Terhubung</p>
            <p className="font-display text-xl truncate leading-tight">{info.name}</p>
            <p className="text-[10px] font-mono text-neutral-500 truncate max-w-[200px]">
              {deviceId.slice(0, 24)}{deviceId.length > 24 ? '...' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="bg-yellow-300 border-2 border-black px-3 py-2 nb-shadow-sm">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Wallet className="w-3 h-3" />
              <p className="text-[9px] uppercase tracking-wide">Saldo</p>
            </div>
            <p className="font-display text-lg leading-none">Rp {formatRupiah(info.money)}</p>
          </div>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="bg-sky-300 border-2 border-black nb-shadow-sm nb-press p-2.5 disabled:opacity-50"
            title="Refresh saldo"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onDisconnect}
            className="bg-red-400 border-2 border-black nb-shadow-sm nb-press p-2.5 text-white"
            title="Putuskan koneksi"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
