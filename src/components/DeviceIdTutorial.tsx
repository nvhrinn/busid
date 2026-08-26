import { useState } from 'react';
import { Youtube, Joystick, Download, Smartphone, ChevronDown, ChevronUp, Video, FileText, ExternalLink, HelpCircle } from 'lucide-react';

const TUTORIAL_STEPS = [
  'Unduh bahan aplikasi Bussid versi lama & Http Canary.',
  'Install aplikasi bussid & http canary tersebut.',
  'Buka aplikasi http canary dan klik tanda panah untuk memulai capture',
  'Buka aplikasi bussid versi lama dan pastikan sudah login di akunya.',
  'Jika sudah login di bussid tutup aplikasi dan kembali di aplikasi http canary.',
  'Pilih icon aplikasi bussid dan opsi request. setelah itu pilih opsi text.',
  'Nah ditext ini cari endpoint "AndroidDeviceId" dan salin kode id dibelakangnya.',
  'Device id sudah dapat tinggal kamu paste ke web ini & selesai kamu bisa topup uang bussid sepuasmu!',
];

const VIDEO_LINKS = [
  {
    title: 'Cara Mendapatkan Device ID Bussid',
    url: 'https://www.youtube.com/results?search_query=cara+mendapatkan+device+id+bussid',
    icon: Video,
    color: 'bg-red-500 text-white',
    desc: 'Video tutorial lengkap di YouTube',
  },
  {
    title: 'Alternatif: Device ID via Pengaturan HP',
    url: 'https://www.youtube.com/results?search_query=cara+mengetahui+device+id+android',
    icon: Video,
    color: 'bg-sky-400 text-white',
    desc: 'Cek Device ID langsung dari HP',
  },
];

const DOWNLOAD_LINKS = [
  {
    title: 'Http Canary',
    url: 'https://play.google.com/store/search?q=device+id&c=apps',
    icon: Download,
    color: 'bg-green-500 text-white',
    desc: 'Aplikasi untuk melihat Device ID Android',
  },
  {
    title: 'Bussid Versi 3.4.3',
    url: 'https://play.google.com/store/apps/details?id=com.mbs.bussid',
    icon: Joystick,
    color: 'bg-lime-300',
    desc: 'Download game Bus Simulator Indonesia',
  },
];

export function DeviceIdTutorial() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border-2 border-black nb-shadow-lg overflow-hidden">
      {/* Header - clickable */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-4 hover:bg-yellow-50 transition-colors"
      >
        <div className="w-10 h-10 bg-yellow-300 border-2 border-black flex items-center justify-center nb-shadow-sm flex-shrink-0">
          <HelpCircle className="w-6 h-6" />
        </div>
        <div className="text-left flex-1">
          <h2 className="font-display text-lg leading-none">TUTORIAL: DAPATKAN DEVICE ID</h2>
          <p className="text-xs text-neutral-600 mt-1">
            Klik untuk {expanded ? 'menyembunyikan' : 'melihat'} panduan & link download
          </p>
        </div>
        <div className="flex-shrink-0">
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div
          className="px-4 pb-4 space-y-4"
          style={{ animation: 'nb-slide-down 0.3s ease both' }}
        >
          {/* Steps */}
          <div className="bg-yellow-50 border-2 border-black p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4" />
              <h3 className="font-display text-sm uppercase">Langkah-langkah</h3>
            </div>
            <ol className="space-y-2.5">
              {TUTORIAL_STEPS.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="w-6 h-6 bg-yellow-300 border-2 border-black flex items-center justify-center font-display text-xs flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Video tutorials */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Youtube className="w-4 h-4" />
              <h3 className="font-display text-sm uppercase">Video Tutorial</h3>
            </div>
            <div className="space-y-2">
              {VIDEO_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-3 border-2 border-black nb-shadow-sm nb-press p-3 ${link.color}`}
                  >
                    <Icon className="w-6 h-6 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm leading-tight">{link.title}</p>
                      <p className="text-xs opacity-80 mt-0.5">{link.desc}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Download apps */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Download className="w-4 h-4" />
              <h3 className="font-display text-sm uppercase">Aplikasi yang Dibutuhkan</h3>
            </div>
            <div className="space-y-2">
              {DOWNLOAD_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-3 border-2 border-black nb-shadow-sm nb-press p-3 ${link.color}`}
                  >
                    <Icon className="w-6 h-6 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm leading-tight">{link.title}</p>
                      <p className="text-xs opacity-80 mt-0.5">{link.desc}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Tip */}
          <div className="bg-black text-yellow-300 border-2 border-black p-3 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="text-xs font-semibold">
              Tips: Sebelum install apk Bussid versi lama harap hapus versi barunya agar berhasil Diinstall.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
