import { useEffect, useState } from 'react';
import { History, Trash, TrendingUp, TrendingDown, Edit3, XCircle, RefreshCw, Inbox, Filter } from 'lucide-react';
import { supabase, type TransactionRow } from '@/lib/supabase';
import { formatRupiah, formatDate } from '@/lib/format';

interface Props {
  deviceId: string;
  refreshKey: number;
}

const TYPE_META: Record<string, { label: string; icon: typeof TrendingUp; color: string; accent: string }> = {
  topup: { label: 'Top-up', icon: TrendingUp, color: 'bg-lime-200', accent: 'text-green-700' },
  drain: { label: 'Drain', icon: TrendingDown, color: 'bg-orange-200', accent: 'text-red-700' },
  kuras_semua: { label: 'Kuras Semua', icon: TrendingDown, color: 'bg-red-200', accent: 'text-red-700' },
  ganti_nama: { label: 'Ganti Nama', icon: Edit3, color: 'bg-sky-200', accent: 'text-blue-700' },
  hapus_akun: { label: 'Hapus Akun', icon: XCircle, color: 'bg-red-300', accent: 'text-red-800' },
};

export function TransactionHistory({ deviceId, refreshKey }: Props) {
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('device_id', deviceId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (active) {
        setRows((data as TransactionRow[]) || []);
        setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [deviceId, refreshKey]);

  const filtered = filter === 'all' ? rows : rows.filter((r) => r.type === filter);

  const handleClear = async () => {
    await supabase.from('transactions').delete().eq('device_id', deviceId);
    setRows([]);
  };

  const types = ['all', 'topup', 'drain', 'kuras_semua', 'ganti_nama', 'hapus_akun'];

  return (
    <div className="bg-white border-2 border-black nb-shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-300 border-2 border-black flex items-center justify-center nb-shadow-sm">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display text-xl leading-none">RIWAYAT</h2>
            <p className="text-xs text-neutral-600 mt-0.5">{rows.length} transaksi tercatat</p>
          </div>
        </div>
        {rows.length > 0 && (
          <button
            onClick={handleClear}
            className="bg-red-400 border-2 border-black nb-shadow-sm nb-press p-2 text-white"
            title="Hapus riwayat"
          >
            <Trash className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filters toggle */}
      <div className="mb-3">
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="flex items-center gap-2 border-2 border-black bg-white nb-shadow-sm nb-press px-3 py-1.5 text-xs font-bold uppercase"
        >
          <Filter className="w-3.5 h-3.5" />
          Filter{filter !== 'all' ? `: ${TYPE_META[filter]?.label || filter}` : ''}
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-1.5 mb-4" style={{ animation: 'nb-slide-down 0.2s ease both' }}>
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`border-2 border-black px-2.5 py-1 text-[10px] font-bold uppercase transition-all ${
              filter === t
                ? 'bg-black text-white nb-shadow-sm'
                : 'bg-white nb-shadow-sm nb-press hover:bg-neutral-100'
            }`}
          >
            {t === 'all' ? 'Semua' : TYPE_META[t]?.label || t}
          </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border-2 border-black border-dashed bg-yellow-50">
          <Inbox className="w-10 h-10 mx-auto mb-2 text-neutral-400" />
          <p className="text-neutral-500 font-bold">Belum ada transaksi.</p>
          <p className="text-xs text-neutral-400 mt-1">Lakukan top-up untuk mulai mencatat.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {filtered.map((row, idx) => {
            const meta = TYPE_META[row.type] || TYPE_META.topup;
            const Icon = meta.icon;
            const positive = row.amount > 0;
            return (
              <div
                key={row.id}
                className={`border-2 border-black ${meta.color} p-3 flex items-center gap-3 nb-shadow-sm`}
                style={{ animation: `nb-slide-in 0.3s ease ${idx * 0.03}s both` }}
              >
                <div className="w-9 h-9 bg-white border-2 border-black flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{meta.label}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 border border-black font-bold ${
                        row.status === 'success' ? 'bg-lime-300' : 'bg-red-300'
                      }`}
                    >
                      {row.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-700 truncate mt-0.5">
                    {row.account_name}
                    {row.detail ? ` • ${row.detail}` : ''}
                  </p>
                  <p className="text-[10px] text-neutral-500 font-mono mt-0.5">{formatDate(row.created_at)}</p>
                </div>
                {row.type !== 'ganti_nama' && row.type !== 'hapus_akun' && (
                  <div className="text-right flex-shrink-0">
                    <p className={`font-display text-sm ${meta.accent}`}>
                      {positive ? '+' : ''}{formatRupiah(row.amount)}
                    </p>
                    {row.balance_after != null && (
                      <p className="text-[10px] text-neutral-600 font-mono">
                        = Rp {formatRupiah(row.balance_after)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
