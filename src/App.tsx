import { useState } from 'react';
import { Bus, Zap, Shield, AlertTriangle, ListChecks } from 'lucide-react';
import { AccountPanel } from '@/components/AccountPanel';
import { AccountBadge } from '@/components/AccountBadge';
import { ActionPanel } from '@/components/ActionPanel';
import { TransactionHistory } from '@/components/TransactionHistory';
import { StatsBar } from '@/components/StatsBar';
import { QueueModal } from '@/components/QueueModal';
import { DeviceIdTutorial } from '@/components/DeviceIdTutorial';
import { ToastContainer, useToast } from '@/components/Toast';
import { supabase, callEdge, type AccountInfo } from '@/lib/supabase';
import { useQueueCooldown } from '@/hooks/useQueueCooldown';

export default function App() {
  const { toasts, toast } = useToast();
  const { isQueued, cooldownRemaining, startCooldown } = useQueueCooldown();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [deviceId, setDeviceId] = useState('');
  const [historyKey, setHistoryKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [queueModalOpen, setQueueModalOpen] = useState(false);

  const logTransaction = async (params: {
    type: string;
    amount: number;
    status: string;
    detail?: string;
    balanceBefore?: number;
    balanceAfter?: number;
  }) => {
    await supabase.from('transactions').insert({
      device_id: deviceId,
      account_name: account?.name || '[unknown]',
      amount: params.amount,
      balance_before: params.balanceBefore ?? null,
      balance_after: params.balanceAfter ?? null,
      type: params.type,
      status: params.status,
      detail: params.detail || null,
    });
    setHistoryKey((k) => k + 1);
  };

  const handleConnected = (info: AccountInfo, id: string) => {
    setAccount(info);
    setDeviceId(id);
    toast(`Terhubung: ${info.name} • Rp ${info.money.toLocaleString('id-ID')}`, 'success');
  };

  const handleDisconnect = () => {
    setAccount(null);
    setDeviceId('');
    toast('Koneksi diputus.', 'info');
  };

  const handleAccountUpdate = (info: AccountInfo) => {
    setAccount(info);
  };

  const handleRefresh = async () => {
    if (!account?.sessionTicket) return;
    setRefreshing(true);
    try {
      const { result: res } = await callEdge('getInfo', { authToken: account.sessionTicket });
      if (res.error) {
        toast(res.error, 'error');
      } else {
        setAccount({
          name: res.name || account.name,
          money: res.money ?? account.money,
          sessionTicket: res.sessionTicket || account.sessionTicket,
        });
        toast('Saldo diperbarui.', 'success');
      }
    } catch {
      toast('Gagal refresh. Coba lagi.', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenQueueModal = () => setQueueModalOpen(true);

  return (
    <div className="min-h-screen nb-grid-bg">
      <ToastContainer toasts={toasts} />
      <QueueModal
        isOpen={queueModalOpen && isQueued}
        cooldownRemaining={cooldownRemaining}
        cooldownTotal={60000}
        onClose={() => setQueueModalOpen(false)}
      />

      {/* Header */}
      <header className="bg-yellow-300 border-b-4 border-black sticky top-0 z-40 safe-top">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black flex items-center justify-center nb-shadow-sm flex-shrink-0">
              <Bus className="w-6 h-6 sm:w-7 sm:h-7 text-yellow-300" />
            </div>
            <div>
              <h1 className="font-display text-2xl leading-none">BUSSID TOPUP</h1>
              <p className="text-xs font-semibold uppercase tracking-wider mt-0.5">Gratis • Anti-Spam Queue</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white border-2 border-black px-3 py-1.5 nb-shadow-sm">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-bold">Server-Side</span>
          </div>
        </div>

        {/* Marquee */}
        <div className="bg-black text-yellow-300 overflow-hidden py-1">
          <div className="nb-marquee whitespace-nowrap flex">
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <span key={i} className="text-xs font-bold uppercase tracking-wide px-4 flex items-center gap-4">
                  <Zap className="w-3 h-3" /> Top-up uang Bussid gratis tanpa login
                  <span>•</span>
                  Maksimal 5x eksekusi per transaksi
                  <span>•</span>
                  Cooldown 60 detik anti-spam
                  <span>•</span>
                  Drain & kuras semua saldo tersedia
                  <span>•</span>
                  Ganti nama & hapus akun didukung
                  <span>•</span>
                </span>
              ))}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4">
        {/* Disclaimer banner */}
        <div className="bg-red-400 border-2 border-black nb-shadow p-2.5 sm:p-3 flex items-start gap-2 sm:gap-3 text-white">
          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0" />
          <p className="text-xs sm:text-sm font-semibold">
            Tools ini bersifat demo/edukasi. Penyalahgunaan dapat melanggar ketentuan game dan berakibat banned.
            Gunakan dengan tanggung jawab.
          </p>
        </div>

        {account ? (
          <>
            <AccountBadge
              info={account}
              deviceId={deviceId}
              onDisconnect={handleDisconnect}
              onRefresh={handleRefresh}
              refreshing={refreshing}
            />
            <StatsBar deviceId={deviceId} refreshKey={historyKey} />
            <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
              <ActionPanel
                info={account}
                deviceId={deviceId}
                onAccountUpdate={handleAccountUpdate}
                onToast={toast}
                onQueued={(ms) => { startCooldown(ms); setQueueModalOpen(true); }}
                isQueued={isQueued}
                cooldownRemaining={cooldownRemaining}
                onOpenQueueModal={handleOpenQueueModal}
                onLogTransaction={logTransaction}
              />
              <TransactionHistory deviceId={deviceId} refreshKey={historyKey} />
            </div>
          </>
        ) : (
          <div className="grid md:grid-cols-2 gap-3 sm:gap-4 items-start">
            <div className="space-y-3 sm:space-y-4">
              <AccountPanel onConnected={handleConnected} onError={(m) => toast(m, 'error')} />
              <DeviceIdTutorial />
            </div>
            <div className="bg-white border-2 border-black nb-shadow-lg p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-lime-300 border-2 border-black flex items-center justify-center nb-shadow-sm">
                  <ListChecks className="w-6 h-6" />
                </div>
                <h2 className="font-display text-xl leading-none">CARA PAKAI</h2>
              </div>
              <ol className="space-y-3 text-sm">
                {[
                  'Pilih metode (Device ID atau Session Ticket) lalu masukkan ID.',
                  'Klik "CEK AKUN" untuk memuat info akun & saldo.',
                  'Pilih tab Top-up / Drain / Ganti Nama / Hapus.',
                  'Atur jumlah uang dan jumlah eksekusi, lalu jalankan.',
                  'Sistem antrian mencegah spam — tunggu cooldown selesai.',
                  'Riwayat transaksi tersimpan otomatis di bawah.',
                ].map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-7 h-7 bg-lime-300 border-2 border-black flex items-center justify-center font-display text-sm flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="pt-1">{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-5 pt-4 border-t-2 border-black border-dashed">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-yellow-200 border-2 border-black p-2">
                    <Zap className="w-5 h-5 mx-auto mb-1" />
                    <p className="text-[9px] font-bold uppercase">Top-up</p>
                  </div>
                  <div className="bg-orange-200 border-2 border-black p-2">
                    <Shield className="w-5 h-5 mx-auto mb-1" />
                    <p className="text-[9px] font-bold uppercase">Drain</p>
                  </div>
                  <div className="bg-sky-200 border-2 border-black p-2">
                    <Bus className="w-5 h-5 mx-auto mb-1" />
                    <p className="text-[9px] font-bold uppercase">Ganti Nama</p>
                  </div>
                  <div className="bg-red-200 border-2 border-black p-2">
                    <AlertTriangle className="w-5 h-5 mx-auto mb-1" />
                    <p className="text-[9px] font-bold uppercase">Hapus</p>
                  </div>
                </div>
              </div>

              {/* Queue info */}
              <div className="mt-4 bg-black text-yellow-300 border-2 border-black p-3 flex items-center gap-2">
                <Shield className="w-4 h-4 flex-shrink-0" />
                <p className="text-xs font-semibold">
                  Sistem antrian anti-spam: cooldown 60 detik antar request, maksimal 5x eksekusi per transaksi.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-black bg-white mt-6 sm:mt-8 safe-bottom">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs font-semibold">
            BUSSID TOPUP FREE • React + Supabase Edge
          </p>
          <p className="text-[10px] text-neutral-500 uppercase tracking-wide">
            Neo Brutalism Edition
          </p>
        </div>
      </footer>
    </div>
  );
}
