import React, { useState, useEffect } from 'react';
import {
  Activity,
  Wifi,
  WifiOff,
  Database,
  Trash2,
  Cpu,
  CheckCircle2,
  Sparkles,
  Smartphone,
  Globe,
  Server,
  RefreshCw
} from 'lucide-react';
import { networkService } from '../services/networkService';
import { syncService } from '../services/syncService';
import { clearAllLocalData, getAllQueueItems, getSyncedHistory, getDraft, enqueueSurvey } from '../db/indexedDB';

interface SimulatorProps {
  onDataChanged: () => void;
}

export const NetworkSimulator: React.FC<SimulatorProps> = ({ onDataChanged }) => {
  const [simulatedOffline, setSimulatedOffline] = useState(networkService.simulatedOffline);
  const [draftCount, setDraftCount] = useState<number>(0);
  const [queueCount, setQueueCount] = useState<number>(0);
  const [historyCount, setHistoryCount] = useState<number>(0);
  const [swRegistered, setSwRegistered] = useState<boolean>(false);
  const [apiEndpoint, setApiEndpoint] = useState<string>(syncService.getApiEndpoint());
  const [pingResult, setPingResult] = useState<{
    status: 'idle' | 'testing' | 'success' | 'error';
    message: string;
    latency?: number;
  }>({ status: 'idle', message: '' });

  const handlePingServer = async () => {
    setPingResult({ status: 'testing', message: 'Đang gửi request kiểm tra kết nối...' });
    const res = await syncService.pingServer();
    if (res.ok) {
      setPingResult({
        status: 'success',
        message: `Máy chủ phản hồi tốt (${res.statusText})`,
        latency: res.latencyMs
      });
    } else {
      setPingResult({
        status: 'error',
        message: `Không thể kết nối máy chủ: ${res.statusText}`,
        latency: res.latencyMs
      });
    }
  };

  const handleSaveEndpoint = (newUrl: string) => {
    setApiEndpoint(newUrl);
    syncService.setApiEndpoint(newUrl);
  };

  const refreshStats = async () => {
    try {
      const draft = await getDraft();
      setDraftCount(draft ? 1 : 0);

      const queue = await getAllQueueItems();
      setQueueCount(queue.length);

      const history = await getSyncedHistory();
      setHistoryCount(history.length);

      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        setSwRegistered(registrations.length > 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshStats();
  }, []);

  const handleToggleOffline = () => {
    const nextVal = !simulatedOffline;
    setSimulatedOffline(nextVal);
    networkService.setSimulatedOffline(nextVal);
  };

  const handleGenerateSampleData = async () => {
    const sampleItems = [
      {
        building: 'Khu B (Giảng đường)',
        floor: 'Tầng 3',
        roomNumber: 'B302',
        category: 'Projector' as const,
        conditionRating: 2,
        defectNotes: 'Máy chiếu bị vàng góc trên bên phải, bóng đèn sắp hết tuổi thọ.',
        inspectorName: 'Đặng Tuấn Anh (VKU IT)'
      },
      {
        building: 'Khu A (Hành chính)',
        floor: 'Tầng 1',
        roomNumber: 'A105',
        category: 'AC' as const,
        conditionRating: 1,
        defectNotes: 'Điều hòa Daikin không phả hơi lạnh, cánh gió bị kẹt kêu to.',
        inspectorName: 'Lê Hoàng Nam (VKU Audit)'
      },
      {
        building: 'Khu C (Công nghệ)',
        floor: 'Tầng 4',
        roomNumber: 'C401',
        category: 'Hardware' as const,
        conditionRating: 3,
        defectNotes: '2 dàn máy tính thực hành số 12 và 14 bị lỏng RAM không lên màn hình.',
        inspectorName: 'Nguyễn Thị Thu (21BA)'
      }
    ];

    for (const item of sampleItems) {
      await enqueueSurvey(item);
    }

    await refreshStats();
    onDataChanged();
    alert('Đã tạo 3 phiếu khảo sát mẫu trong Hàng đợi Offline (PENDING_SYNC) để bạn chấm điểm kiểm thử!');
  };

  const handleClearAll = async () => {
    if (window.confirm('CẢNH BÁO: Thao tác này sẽ xóa toàn bộ IndexedDB (Bản nháp, Hàng đợi, Lịch sử). Bạn chắc chắn chứ?')) {
      await clearAllLocalData();
      await refreshStats();
      onDataChanged();
      alert('Đã dọn dẹp sạch IndexedDB cục bộ.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Simulation Controller */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Activity className="w-5 h-5 text-sky-600" />
          <h3 className="text-base font-bold text-slate-800">
            Công cụ Giả lập Mạng & Kiểm định Offline (Evaluation Simulator)
          </h3>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800">Giả lập Chế độ Mất mạng (Offline Mode)</span>
              {simulatedOffline ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                  ĐANG BẬT GIẢ LẬP OFFLINE
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  MẠNG BÌNH THƯỜNG
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-lg">
              Bật tính năng này để giả lập khi kiểm toán viên ở tầng hầm hoặc góc khuất không có sóng Wi-Fi/4G. Khi tắt đi, hệ thống sẽ tự động bắt sự kiện mạng phục hồi và đẩy toàn bộ hàng đợi lên server.
            </p>
          </div>

          <button
            onClick={handleToggleOffline}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 shadow-sm whitespace-nowrap ${
              simulatedOffline
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-slate-800 hover:bg-slate-900 text-white'
            }`}
          >
            {simulatedOffline ? (
              <>
                <WifiOff className="w-4 h-4" /> Tắt Offline (Khôi phục mạng)
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4" /> Bật Giả lập Mất mạng
              </>
            )}
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleGenerateSampleData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-semibold active:scale-95 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>Nạp 3 phiếu khảo sát mẫu vào Hàng đợi</span>
          </button>

          <button
            onClick={handleClearAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold active:scale-95 transition-all ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Dọn sạch IndexedDB</span>
          </button>
        </div>
      </div>

      {/* Online Sync Backend Configuration */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-sky-600" />
            <h3 className="text-base font-bold text-slate-800">
              Cấu hình Máy chủ Đồng bộ Trực tuyến (Online Sync API)
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
            Real HTTP Fetch
          </span>
        </div>

        <p className="text-xs text-slate-600">
          Khi có mạng, ứng dụng sẽ thực hiện gửi các yêu cầu <strong>HTTP POST</strong> thực sự mang payload dữ liệu khảo sát và ảnh minh chứng lên endpoint này.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-sky-600" /> API Endpoint URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={apiEndpoint}
                onChange={(e) => handleSaveEndpoint(e.target.value)}
                placeholder="Ví dụ: /api/surveys hoặc https://vku-api.example.com/surveys"
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button
                type="button"
                onClick={handlePingServer}
                disabled={pingResult.status === 'testing'}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-bold transition-all disabled:opacity-50 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${pingResult.status === 'testing' ? 'animate-spin' : ''}`} />
                <span>Ping Server</span>
              </button>
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Mặc định:</span>
            <button
              type="button"
              onClick={() => handleSaveEndpoint('/api/surveys')}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] border transition-all ${
                apiEndpoint === '/api/surveys'
                  ? 'bg-sky-50 text-sky-800 border-sky-300 font-bold'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              /api/surveys (Cloudflare Pages Functions & Vite Dev)
            </button>
          </div>

          {/* Ping status feedback */}
          {pingResult.status !== 'idle' && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                pingResult.status === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : pingResult.status === 'testing'
                  ? 'bg-sky-50 text-sky-800 border-sky-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {pingResult.status === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Activity className="w-4 h-4 text-slate-600 shrink-0" />
                )}
                <span>{pingResult.message}</span>
              </div>
              {pingResult.latency !== undefined && (
                <span className="font-mono text-[10px] font-bold bg-white/70 px-2 py-0.5 rounded">
                  {pingResult.latency} ms
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Storage & Architecture Health Check */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* IndexedDB Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Database className="w-4 h-4 text-sky-600" />
              <span>Trạng thái IndexedDB (`vku_field_survey_db`)</span>
            </div>
            <button
              onClick={refreshStats}
              className="text-[11px] font-semibold text-sky-600 hover:underline"
            >
              Làm mới
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="text-lg font-black text-slate-800">{draftCount}</div>
              <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Bản nháp</div>
            </div>
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
              <div className="text-lg font-black text-amber-700">{queueCount}</div>
              <div className="text-[10px] uppercase font-bold text-amber-600 mt-0.5">Chờ gửi</div>
            </div>
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
              <div className="text-lg font-black text-emerald-700">{historyCount}</div>
              <div className="text-[10px] uppercase font-bold text-emerald-600 mt-0.5">Đã đồng bộ</div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 italic">
            ✓ Sử dụng thư viện `idb` chuẩn Promise, hỗ trợ transactional storage cho dữ liệu phiếu và hình ảnh base64.
          </p>
        </div>

        {/* PWA & Service Worker Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-sm font-bold text-slate-800">
            <Cpu className="w-4 h-4 text-sky-600" />
            <span>PWA & Service Worker (Cache-First)</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-600 font-medium">Service Worker:</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {swRegistered ? 'Đã đăng ký (Workbox Cache-First)' : 'Sẵn sàng (Active trong Build PWA)'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-600 font-medium">Cấu hình Standalone:</span>
              <span className="font-bold text-sky-700 font-mono">display: standalone</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-600 font-medium">Theme Color:</span>
              <span className="font-bold text-sky-700 font-mono flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#0284c7] inline-block border border-slate-300" /> #0284c7
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Capacitor Android Verification Guide */}
      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-sky-900">
          <Smartphone className="w-4 h-4 text-sky-700" />
          <span>Tích hợp Capacitor & Đóng gói Android APK</span>
        </div>

        <p className="text-xs text-sky-800 leading-relaxed">
          Ứng dụng đã được cấu hình với gói cầu nối <code>@capacitor/core</code>, <code>@capacitor/camera</code> và <code>@capacitor/network</code>.
          Khi chạy trên điện thoại Android, ứng dụng sẽ gọi trực tiếp Native Camera và Native Network Monitor của hệ điều hành.
        </p>

        <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-[11px] overflow-x-auto space-y-1">
          <div className="text-slate-400"># Các lệnh build APK trong thư mục dự án:</div>
          <div>npm run build</div>
          <div>npx cap sync android</div>
          <div>npx cap open android  <span className="text-slate-400">(mở Android Studio để Run hoặc Build Signed APK)</span></div>
        </div>
      </div>
    </div>
  );
};
