import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Download, CheckCircle2 } from 'lucide-react';
import { networkService } from '../services/networkService';
import { syncService, type SyncProgress } from '../services/syncService';

interface HeaderProps {
  pendingCount: number;
  onSyncTriggered?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ pendingCount, onSyncTriggered }) => {
  const [isOnline, setIsOnline] = useState<boolean>(networkService.isOnline);
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    isSyncing: false,
    total: 0,
    completed: 0
  });
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    const unsubNet = networkService.subscribe((online) => {
      setIsOnline(online);
    });

    const unsubSync = syncService.subscribe((progress) => {
      setSyncProgress(progress);
    });

    // PWA Install prompt listener
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      unsubNet();
      unsubSync();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleManualSync = async () => {
    if (!isOnline) {
      alert('Thiết bị đang ở chế độ ngoại tuyến (Offline). Vui lòng kết nối mạng để đồng bộ!');
      return;
    }
    await syncService.processQueue();
    if (onSyncTriggered) onSyncTriggered();
  };

  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      alert('Ứng dụng đã được cài đặt hoặc trình duyệt không hỗ trợ nhắc cài đặt tự động.');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm transition-all">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* VKU Brand Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-600 to-sky-800 flex items-center justify-center text-white shadow-md shadow-sky-600/20 font-black text-lg tracking-wider">
            VKU
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold text-slate-800 leading-tight">VKU Field Survey</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">PWA</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Khảo sát CSVC Ngoại tuyến</p>
          </div>
        </div>

        {/* Status Badges & Quick Action */}
        <div className="flex items-center gap-2">
          {/* Network Status Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Trực tuyến</span>
                <span className="sm:hidden">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden sm:inline">Ngoại tuyến</span>
                <span className="sm:hidden">Offline</span>
              </>
            )}
          </div>

          {/* Sync status / Manual Sync Button */}
          {pendingCount > 0 && (
            <button
              onClick={handleManualSync}
              disabled={syncProgress.isSyncing || !isOnline}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                syncProgress.isSyncing
                  ? 'bg-amber-50 text-amber-700 border-amber-200 cursor-wait'
                  : isOnline
                  ? 'bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100 active:scale-95'
                  : 'bg-slate-100 text-slate-500 border-slate-200 opacity-80'
              }`}
              title="Nhấn để đồng bộ dữ liệu ngay"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncProgress.isSyncing ? 'animate-spin text-amber-600' : 'text-sky-600'}`} />
              <span>
                {syncProgress.isSyncing
                  ? `Đang gửi ${syncProgress.completed}/${syncProgress.total}`
                  : `Chờ gửi (${pendingCount})`}
              </span>
            </button>
          )}

          {/* Install PWA Prompt button */}
          {deferredPrompt && !isInstalled && (
            <button
              onClick={handleInstallPWA}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 shadow-sm active:scale-95 transition-all"
              title="Cài đặt PWA lên màn hình chính"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Cài đặt App</span>
            </button>
          )}

          {isInstalled && (
            <span className="hidden md:flex items-center gap-1 text-xs text-emerald-600 font-medium px-2">
              <CheckCircle2 className="w-3.5 h-3.5" /> Đã cài đặt
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
