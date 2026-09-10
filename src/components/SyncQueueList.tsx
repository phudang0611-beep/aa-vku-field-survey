import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Clock,
  MapPin,
  Trash2,
  AlertCircle,
  Inbox,
  Image as ImageIcon
} from 'lucide-react';
import type { SyncQueueItem } from '../types/survey';
import { getAllQueueItems, removeQueueItem } from '../db/indexedDB';
import { syncService, type SyncProgress } from '../services/syncService';
import { networkService } from '../services/networkService';

interface SyncQueueListProps {
  onQueueUpdated: () => void;
}

export const SyncQueueList: React.FC<SyncQueueListProps> = ({ onQueueUpdated }) => {
  const [items, setItems] = useState<SyncQueueItem[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(networkService.isOnline);
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    isSyncing: false,
    total: 0,
    completed: 0
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const loadItems = async () => {
    try {
      const queue = await getAllQueueItems();
      // Sort newest first
      queue.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setItems(queue);
    } catch (err) {
      console.error('Failed to load sync queue:', err);
    }
  };

  useEffect(() => {
    loadItems();

    const unsubNet = networkService.subscribe((online) => {
      setIsOnline(online);
    });

    const unsubSync = syncService.subscribe((progress) => {
      setSyncProgress(progress);
      if (!progress.isSyncing) {
        loadItems();
        onQueueUpdated();
      }
    });

    return () => {
      unsubNet();
      unsubSync();
    };
  }, []);

  const handleSyncAll = async () => {
    if (!isOnline) {
      alert('Thiết bị đang ở chế độ Ngoại tuyến. Vui lòng kết nối mạng hoặc tắt Giả lập Ngoại tuyến để đồng bộ!');
      return;
    }
    await syncService.processQueue();
    await loadItems();
    onQueueUpdated();
  };

  const handleDelete = async (id?: number) => {
    if (id === undefined) return;
    if (window.confirm('Bạn có chắc chắn muốn xóa bản ghi này khỏi hàng đợi?')) {
      await removeQueueItem(id);
      await loadItems();
      onQueueUpdated();
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Action */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-800">
              Hàng đợi khảo sát ngoại tuyến (Offline Sync Queue)
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800">
              {items.length} phiếu
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Các khảo sát được thực hiện tại tầng hầm / khu vực mất sóng được lưu trữ trong <strong>IndexedDB</strong> và sẽ tự động gửi tuần tự lên server khi có mạng.
          </p>
        </div>

        <button
          onClick={handleSyncAll}
          disabled={syncProgress.isSyncing || items.length === 0 || !isOnline}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncProgress.isSyncing ? 'animate-spin' : ''}`} />
          <span>{syncProgress.isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}</span>
        </button>
      </div>

      {/* Syncing Progress Bar */}
      {syncProgress.isSyncing && (
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 space-y-2 animate-fadeIn">
          <div className="flex justify-between text-xs font-semibold text-sky-900">
            <span>Đang gửi dữ liệu lên máy chủ tuần tự...</span>
            <span>
              {syncProgress.completed} / {syncProgress.total} hoàn thành
            </span>
          </div>
          <div className="w-full h-2 bg-sky-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-600 transition-all duration-300"
              style={{
                width: `${
                  syncProgress.total > 0
                    ? Math.round((syncProgress.completed / syncProgress.total) * 100)
                    : 0
                }%`
              }}
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Inbox className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-slate-700">Hàng đợi đang trống</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Không có khảo sát nào chờ đồng bộ. Tất cả dữ liệu đã được gửi an toàn lên máy chủ hoặc chưa có khảo sát mới lúc ngoại tuyến.
          </p>
        </div>
      ) : (
        /* Queue Item List */
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.uuid}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all space-y-3"
            >
              {/* Header of Item */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">
                      Phòng {item.data.roomNumber} - {item.data.floor}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        item.status === 'PENDING_SYNC'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : item.status === 'SYNCING'
                          ? 'bg-sky-100 text-sky-800 border border-sky-300 animate-pulse'
                          : item.status === 'FAILED'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{item.data.building}</span>
                    <span>•</span>
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{new Date(item.createdAt).toLocaleString('vi-VN')}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Xóa phiếu khỏi hàng đợi"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Body Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Hạng mục & Tình trạng:</span>
                  <div className="font-semibold text-slate-700 mt-0.5">
                    {item.data.category} ({item.data.conditionRating}/5 ★)
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-slate-400 block">Ghi chú sự cố:</span>
                  <div className="text-slate-700 mt-0.5 italic">
                    {item.data.defectNotes || 'Không có ghi chú thêm.'}
                  </div>
                </div>
              </div>

              {/* Photo & UUID tag */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[10px]">
                  <span>UUID:</span>
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 select-all">
                    {item.uuid}
                  </span>
                </div>

                {item.data.photoBase64 && (
                  <button
                    onClick={() => setSelectedImage(item.data.photoBase64 || null)}
                    className="flex items-center gap-1 text-sky-600 hover:text-sky-700 font-semibold"
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Xem ảnh đính kèm
                  </button>
                )}
              </div>

              {/* Last Error Message if Failed */}
              {item.lastError && (
                <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Lỗi thử gửi: {item.lastError} (Đã thử {item.retryCount} lần)</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image Preview Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-xl max-h-[85vh] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
            <img src={selectedImage} alt="Phóng to ảnh" className="max-w-full max-h-[80vh] object-contain" />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/60 text-white text-xs font-semibold hover:bg-black/90"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
