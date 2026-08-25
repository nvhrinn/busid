import { useState } from 'react';
import { Bus, Search, User, KeyRound, Smartphone } from 'lucide-react';
import { callEdge, type AccountInfo } from '@/lib/supabase';

interface Props {
  onConnected: (info: AccountInfo, deviceId: string) => void;
  onError: (msg: string) => void;
}

export function AccountPanel({ onConnected, onError }: Props) {
  const [deviceId, setDeviceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'device' | 'ticket'>('device');

  const handleConnect = async () => {
    const id = deviceId.trim();
    if (!id) {
      onError('Masukkan Device ID atau Session Ticket dulu.');
      return;
    }
    setLoading(true);
    try {
      const { result: res } = await callEdge('getInfo', { authToken: id, deviceId: id });
      if (res.error) {
        onError(res.error);
        return;
      }
      onConnected(
        { name: res.name || '[ganti nama]', money: res.money || 0, sessionTicket: res.sessionTicket },
        id,
      );
    } catch {
      onError('Gagal terhubung ke server. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border-2 border-black nb-shadow-lg p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-300 border-l-2 border-b-2 border-black -rotate-45 translate-x-12 -translate-y-12" />

      <div className="flex items-center gap-3 mb-5 relative">
        <div className="w-12 h-12 bg-yellow-300 border-2 border-black flex items-center justify-center nb-shadow-sm">
          <Bus className="w-7 h-7" />
        </div>
        <div>
          <h2 className="font-display text-2xl leading-none">MASUKKAN AKUN</h2>
          <p className="text-sm text-neutral-600 mt-1">Pilih metode lalu masukkan ID</p>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('device')}
          className={`flex-1 border-2 border-black px-3 py-2 text-xs font-bold uppercase flex items-center justify-center gap-2 transition-all ${
            mode === 'device'
              ? 'bg-lime-300 nb-shadow-sm translate-x-[1px] translate-y-[1px]'
              : 'bg-white nb-shadow-sm nb-press hover:bg-neutral-100'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          Device ID
        </button>
        <button
          onClick={() => setMode('ticket')}
          className={`flex-1 border-2 border-black px-3 py-2 text-xs font-bold uppercase flex items-center justify-center gap-2 transition-all ${
            mode === 'ticket'
              ? 'bg-sky-300 nb-shadow-sm translate-x-[1px] translate-y-[1px]'
              : 'bg-white nb-shadow-sm nb-press hover:bg-neutral-100'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          Session Ticket
        </button>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <input
            type="text"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            placeholder={mode === 'device' ? 'contoh: 84C7A1B2D3E4F5A6' : 'contoh: EF45A92B...panjang'}
            className="w-full border-2 border-black px-4 py-3 font-mono text-sm bg-yellow-50 nb-shadow-sm focus:bg-white focus:nb-shadow-none focus:translate-x-[2px] focus:translate-y-[2px] transition-all outline-none"
            disabled={loading}
          />
        </div>

        <button
          onClick={handleConnect}
          disabled={loading}
          className="w-full bg-lime-300 border-2 border-black nb-shadow nb-press px-4 py-3 font-display text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              MENGHUBUNGKAN...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              CEK AKUN
            </>
          )}
        </button>
      </div>

      <div className="mt-5 pt-4 border-t-2 border-black border-dashed">
        <div className="flex items-start gap-2 text-xs text-neutral-600">
          <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            {mode === 'device'
              ? 'Device ID adalah ID unik perangkat Androidmu di game Bussid. Ditemukan di pengaturan game.'
              : 'Session Ticket (X-Authorization) didapat setelah login pertama. Lebih cepat karena tidak perlu login ulang.'}
          </p>
        </div>
      </div>
    </div>
  );
}
