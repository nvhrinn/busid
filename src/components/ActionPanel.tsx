import { useState } from 'react';
import { Wallet, ArrowDownCircle, Trash2, Edit3, Zap, Lock, Gauge } from 'lucide-react';
import { callEdge, type AccountInfo } from '@/lib/supabase';
import { formatRupiah } from '@/lib/format';

interface Props {
  info: AccountInfo;
  deviceId: string;
  onAccountUpdate: (info: AccountInfo) => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onQueued: (waitMs: number) => void;
  isQueued: boolean;
  cooldownRemaining: number;
  onOpenQueueModal: () => void;
  onLogTransaction: (params: {
    type: string;
    amount: number;
    status: string;
    detail?: string;
    balanceBefore?: number;
    balanceAfter?: number;
  }) => Promise<void>;
}

const MAX_COUNT = 5;
const COOLDOWN_MS = 60000;
const QUICK_AMOUNTS = [1000000, 5000000, 10000000, 50000000, 100000000, 1000000000];

export function ActionPanel({
  info,
  deviceId,
  onAccountUpdate,
  onToast,
  onQueued,
  isQueued,
  cooldownRemaining,
  onOpenQueueModal,
  onLogTransaction,
}: Props) {
  const [tab, setTab] = useState<'topup' | 'drain' | 'rename' | 'delete'>('topup');
  const [amount, setAmount] = useState(1000000);
  const [count, setCount] = useState(5);
  const [drainAmount, setDrainAmount] = useState(1000000);
  const [drainCount, setDrainCount] = useState(5);
  const [newName, setNewName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const refreshInfo = async (ticket?: string) => {
    const { result: res } = await callEdge('getInfo', { authToken: ticket || info.sessionTicket });
    if (!res.error) {
      onAccountUpdate({
        name: res.name || info.name,
        money: res.money ?? info.money,
        sessionTicket: res.sessionTicket || info.sessionTicket,
      });
    }
    return res;
  };

  const handleQueueError = (res: { error?: string; queued?: boolean; waitMs?: number }): boolean => {
    if (res.queued && res.waitMs) {
      onQueued(res.waitMs);
      onOpenQueueModal();
      return true;
    }
    return false;
  };

  const handleTopup = async () => {
    if (amount <= 0) {
      onToast('Jumlah harus lebih dari 0.', 'error');
      return;
    }
    setLoading('topup');
    const balanceBefore = info.money;
    try {
      const { result: res } = await callEdge('addMoney', {
        authToken: info.sessionTicket,
        amount,
        count,
      });
      if (handleQueueError(res)) return;
      if (res.error) {
        onToast(res.error, 'error');
        await onLogTransaction({ type: 'topup', amount: amount * count, status: 'failed', balanceBefore });
        return;
      }
      onToast(`Top-up ${count}x berhasil! Sukses: ${res.success}, Gagal: ${res.failed}`, 'success');
      const refreshed = await refreshInfo(res.sessionTicket || info.sessionTicket);
      await onLogTransaction({
        type: 'topup',
        amount: amount * count,
        status: 'success',
        balanceBefore,
        balanceAfter: refreshed.money,
      });
      onQueued(COOLDOWN_MS);
    } catch {
      onToast('Gagal top-up. Coba lagi.', 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleDrain = async () => {
    setLoading('drain');
    const balanceBefore = info.money;
    try {
      const { result: res } = await callEdge('addMoney', {
        authToken: info.sessionTicket,
        amount: -Math.abs(drainAmount),
        count: drainCount,
      });
      if (handleQueueError(res)) return;
      if (res.error) {
        onToast(res.error, 'error');
        await onLogTransaction({ type: 'drain', amount: -drainAmount * drainCount, status: 'failed', balanceBefore });
        return;
      }
      onToast(`Drain ${drainCount}x selesai! Sukses: ${res.success}, Gagal: ${res.failed}`, 'success');
      const refreshed = await refreshInfo(res.sessionTicket || info.sessionTicket);
      await onLogTransaction({
        type: 'drain',
        amount: -drainAmount * drainCount,
        status: 'success',
        balanceBefore,
        balanceAfter: refreshed.money,
      });
      onQueued(COOLDOWN_MS);
    } catch {
      onToast('Gagal drain. Coba lagi.', 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleKuras = async () => {
    setLoading('kuras');
    const balanceBefore = info.money;
    try {
      const { result: res } = await callEdge('kurasSemua', { authToken: info.sessionTicket });
      if (handleQueueError(res)) return;
      if (res.error) {
        onToast(res.error, 'error');
        return;
      }
      onToast(`Kuras semua berhasil! Terkuras: Rp ${formatRupiah(res.drained || 0)}`, 'success');
      const refreshed = await refreshInfo(res.sessionTicket || info.sessionTicket);
      await onLogTransaction({
        type: 'kuras_semua',
        amount: -(res.drained || 0),
        status: 'success',
        balanceBefore,
        balanceAfter: refreshed.money,
      });
      onQueued(COOLDOWN_MS);
    } catch {
      onToast('Gagal kuras. Coba lagi.', 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleRename = async () => {
    if (!newName.trim()) {
      onToast('Masukkan nama baru.', 'error');
      return;
    }
    setLoading('rename');
    try {
      const { result: res } = await callEdge('gantiNama', {
        authToken: info.sessionTicket,
        displayName: newName.trim(),
      });
      if (handleQueueError(res)) return;
      if (res.error) {
        onToast(res.error, 'error');
        await onLogTransaction({ type: 'ganti_nama', amount: 0, status: 'failed', detail: newName.trim() });
        return;
      }
      onToast(`Nama berhasil diganti ke "${newName.trim()}"!`, 'success');
      await onLogTransaction({ type: 'ganti_nama', amount: 0, status: 'success', detail: newName.trim() });
      setNewName('');
      await refreshInfo(res.sessionTicket || info.sessionTicket);
      onQueued(COOLDOWN_MS);
    } catch {
      onToast('Gagal ganti nama.', 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      onToast('Klik "HAPUS AKUN" sekali lagi untuk konfirmasi.', 'info');
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    setLoading('delete');
    try {
      const { result: res } = await callEdge('hapusAkun', { authToken: info.sessionTicket });
      if (handleQueueError(res)) return;
      if (res.error) {
        onToast(res.error, 'error');
        await onLogTransaction({ type: 'hapus_akun', amount: 0, status: 'failed' });
        return;
      }
      onToast('Akun berhasil dihapus!', 'success');
      await onLogTransaction({ type: 'hapus_akun', amount: 0, status: 'success' });
    } catch {
      onToast('Gagal hapus akun.', 'error');
    } finally {
      setLoading(null);
      setConfirmDelete(false);
    }
  };

  const tabs = [
    { id: 'topup' as const, label: 'TOP-UP', icon: Wallet, color: 'bg-lime-300' },
    { id: 'drain' as const, label: 'DRAIN', icon: ArrowDownCircle, color: 'bg-orange-300' },
    { id: 'rename' as const, label: 'GANTI NAMA', icon: Edit3, color: 'bg-sky-300' },
    { id: 'delete' as const, label: 'HAPUS', icon: Trash2, color: 'bg-red-400' },
  ];

  const disabledByQueue = isQueued;
  const queueSeconds = Math.ceil(cooldownRemaining / 1000);

  return (
    <div className="bg-white border-2 border-black nb-shadow-lg p-6">
      {/* Tabs */}
      <div className="grid grid-cols-4 gap-1.5 mb-5">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`border-2 border-black py-2.5 font-display text-[11px] flex flex-col items-center gap-1 transition-all ${
                active
                  ? `${t.color} nb-shadow-sm translate-x-[1px] translate-y-[1px]`
                  : 'bg-white nb-shadow-sm nb-press hover:bg-neutral-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Queue warning bar - clickable to open modal */}
      {disabledByQueue && (
        <button
          onClick={onOpenQueueModal}
          className="w-full mb-4 bg-black text-yellow-300 border-2 border-black px-3 py-2 flex items-center gap-2 animate-pulse hover:bg-neutral-800 transition-colors"
        >
          <Lock className="w-4 h-4" />
          <span className="text-xs font-bold uppercase">Tunggu {queueSeconds}s — Klik untuk detail</span>
          <div className="ml-auto w-16 h-2 bg-neutral-800 border border-yellow-300 overflow-hidden">
            <div
              className="h-full bg-yellow-300 transition-all duration-100"
              style={{ width: `${(cooldownRemaining / COOLDOWN_MS) * 100}%` }}
            />
          </div>
        </button>
      )}

      {/* Top-up tab */}
      {tab === 'topup' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold mb-2 uppercase tracking-wide text-neutral-600">
              Jumlah Uang (Rp)
            </label>
            <input
              type="number"
              value={amount || ''}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
              className="w-full border-2 border-black px-4 py-3 font-mono text-lg bg-yellow-50 nb-shadow-sm focus:bg-white focus:nb-shadow-none focus:translate-x-[2px] focus:translate-y-[2px] transition-all outline-none"
            />
            <div className="grid grid-cols-3 gap-2 mt-2">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAmount(a)}
                  className={`border-2 border-black nb-shadow-sm nb-press px-2 py-2 text-xs font-bold transition-all ${
                    amount === a ? 'bg-yellow-300' : 'bg-yellow-100 hover:bg-yellow-200'
                  }`}
                >
                  {a >= 1_000_000_000 ? '1M' : a >= 1_000_000 ? `${a / 1_000_000}JT` : `${a / 1000}K`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wide text-neutral-600">
                Jumlah Eksekusi
              </label>
              <span className="font-display text-lg bg-black text-yellow-300 px-2 py-0.5 border-2 border-black">
                {count}x
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={MAX_COUNT}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full accent-black"
            />
            <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
              <span>1x</span>
              <span>3x</span>
              <span>{MAX_COUNT}x</span>
            </div>
          </div>

          <div className="bg-lime-100 border-2 border-black p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              <span className="text-sm font-semibold">Total ditambah:</span>
            </div>
            <span className="font-display text-lg">Rp {formatRupiah(amount * count)}</span>
          </div>

          <button
            onClick={handleTopup}
            disabled={loading === 'topup' || disabledByQueue}
            className="w-full bg-lime-300 border-2 border-black nb-shadow nb-press px-4 py-4 font-display text-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === 'topup' ? (
              <>
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                MEMPROSES...
              </>
            ) : (
              <>
                <Zap className="w-6 h-6" />
                TOP-UP SEKARANG
              </>
            )}
          </button>
        </div>
      )}

      {/* Drain tab */}
      {tab === 'drain' && (
        <div className="space-y-4">
          <div className="bg-orange-100 border-2 border-black p-3 text-sm font-semibold flex items-center gap-2">
            <ArrowDownCircle className="w-5 h-5 flex-shrink-0" />
            Drain mengurangi saldo akun. Berguna untuk reset uang.
          </div>
          <div>
            <label className="block text-xs font-bold mb-2 uppercase tracking-wide text-neutral-600">
              Jumlah Dikurangi (Rp)
            </label>
            <input
              type="number"
              value={drainAmount || ''}
              onChange={(e) => setDrainAmount(Math.max(0, Number(e.target.value)))}
              className="w-full border-2 border-black px-4 py-3 font-mono text-lg bg-orange-50 nb-shadow-sm focus:bg-white focus:nb-shadow-none focus:translate-x-[2px] focus:translate-y-[2px] transition-all outline-none"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wide text-neutral-600">
                Jumlah Eksekusi
              </label>
              <span className="font-display text-lg bg-black text-orange-300 px-2 py-0.5 border-2 border-black">
                {drainCount}x
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={MAX_COUNT}
              value={drainCount}
              onChange={(e) => setDrainCount(Number(e.target.value))}
              className="w-full accent-black"
            />
          </div>

          <div className="border-2 border-black bg-red-100 p-3 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">Kuras SEMUA saldo sekaligus:</span>
            <button
              onClick={handleKuras}
              disabled={loading === 'kuras' || disabledByQueue}
              className="bg-red-400 border-2 border-black nb-shadow-sm nb-press px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {loading === 'kuras' ? '...' : 'KURAS SEMUA'}
            </button>
          </div>

          <button
            onClick={handleDrain}
            disabled={loading === 'drain' || disabledByQueue}
            className="w-full bg-orange-300 border-2 border-black nb-shadow nb-press px-4 py-4 font-display text-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading === 'drain' ? (
              <>
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                MEMPROSES...
              </>
            ) : (
              <>
                <ArrowDownCircle className="w-6 h-6" />
                DRAIN UANG
              </>
            )}
          </button>
        </div>
      )}

      {/* Rename tab */}
      {tab === 'rename' && (
        <div className="space-y-4">
          <div className="bg-sky-100 border-2 border-black p-3 text-sm font-semibold flex items-center gap-2">
            <Edit3 className="w-5 h-5 flex-shrink-0" />
            Ganti nama tampilan akunmu di game.
          </div>
          <div>
            <label className="block text-xs font-bold mb-2 uppercase tracking-wide text-neutral-600">
              Nama Baru
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              placeholder={info.name}
              maxLength={25}
              className="w-full border-2 border-black px-4 py-3 font-mono text-lg bg-sky-50 nb-shadow-sm focus:bg-white focus:nb-shadow-none focus:translate-x-[2px] focus:translate-y-[2px] transition-all outline-none"
            />
            <p className="text-[10px] text-neutral-500 mt-1 text-right">{newName.length}/25 karakter</p>
          </div>
          <button
            onClick={handleRename}
            disabled={loading === 'rename' || disabledByQueue}
            className="w-full bg-sky-300 border-2 border-black nb-shadow nb-press px-4 py-4 font-display text-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading === 'rename' ? (
              <>
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                MEMPROSES...
              </>
            ) : (
              <>
                <Edit3 className="w-6 h-6" />
                GANTI NAMA
              </>
            )}
          </button>
        </div>
      )}

      {/* Delete tab */}
      {tab === 'delete' && (
        <div className="space-y-4">
          <div className={`border-2 border-black p-4 text-sm font-semibold flex items-start gap-2 transition-all ${
            confirmDelete ? 'bg-red-300 text-white animate-pulse' : 'bg-red-100'
          }`}>
            <Trash2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-display text-base mb-1">PERINGATAN</p>
              <p>
                {confirmDelete
                  ? 'Klik tombol di bawah SEKALI LAGI untuk konfirmasi hapus akun permanen.'
                  : 'Tindakan ini akan menghapus akun secara permanen dari server game. Tidak bisa dibatalkan.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleDelete}
            disabled={loading === 'delete' || disabledByQueue}
            className={`w-full border-2 border-black nb-shadow nb-press px-4 py-4 font-display text-xl flex items-center justify-center gap-2 disabled:opacity-50 text-white transition-all ${
              confirmDelete ? 'bg-red-500 animate-pulse' : 'bg-red-400'
            }`}
          >
            {loading === 'delete' ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                MEMPROSES...
              </>
            ) : (
              <>
                <Trash2 className="w-6 h-6" />
                {confirmDelete ? 'KONFIRMASI HAPUS' : 'HAPUS AKUN'}
              </>
            )}
          </button>
        </div>
      )}

      <p className="text-[10px] text-neutral-400 mt-4 text-center font-mono">
        ID: {deviceId.slice(0, 20)}{deviceId.length > 20 ? '...' : ''}
      </p>
    </div>
  );
}
