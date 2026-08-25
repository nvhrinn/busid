import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, Activity } from 'lucide-react';
import { supabase, type TransactionRow } from '@/lib/supabase';
import { formatRupiah } from '@/lib/format';

interface Props {
  deviceId: string;
  refreshKey: number;
}

interface Stats {
  totalTopup: number;
  totalDrain: number;
  totalTransactions: number;
  currentBalance: number;
}

export function StatsBar({ deviceId, refreshKey }: Props) {
  const [stats, setStats] = useState<Stats>({
    totalTopup: 0,
    totalDrain: 0,
    totalTransactions: 0,
    currentBalance: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('device_id', deviceId)
        .eq('status', 'success')
        .order('created_at', { ascending: false });

      if (!active || !data) return;
      const rows = data as TransactionRow[];
      let topup = 0;
      let drain = 0;
      rows.forEach((r) => {
        if (r.type === 'topup') topup += r.amount;
        else if (r.type === 'drain' || r.type === 'kuras_semua') drain += Math.abs(r.amount);
      });
      const latest = rows.find((r) => r.balance_after != null);
      setStats({
        totalTopup: topup,
        totalDrain: drain,
        totalTransactions: rows.length,
        currentBalance: latest?.balance_after ?? 0,
      });
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [deviceId, refreshKey]);

  const cards = [
    { label: 'Total Top-up', value: stats.totalTopup, icon: TrendingUp, color: 'bg-lime-300', textColor: 'text-green-800' },
    { label: 'Total Drain', value: stats.totalDrain, icon: TrendingDown, color: 'bg-orange-300', textColor: 'text-red-800' },
    { label: 'Transaksi', value: stats.totalTransactions, icon: Activity, color: 'bg-sky-300', textColor: 'text-blue-900', isCount: true },
    { label: 'Saldo Akhir', value: stats.currentBalance, icon: Wallet, color: 'bg-yellow-300', textColor: 'text-neutral-900' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className={`bg-white border-2 border-black nb-shadow p-3 ${loading ? 'opacity-50' : ''}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-7 h-7 ${c.color} border-2 border-black flex items-center justify-center`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-600">{c.label}</span>
            </div>
            <p className={`font-display text-lg leading-none ${c.textColor}`}>
              {c.isCount ? c.value : `Rp ${formatRupiah(c.value)}`}
            </p>
          </div>
        );
      })}
    </div>
  );
}
