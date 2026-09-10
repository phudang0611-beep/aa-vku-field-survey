import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Calendar,
  MapPin,
  Search,
  Download,
  Trash2,
  Image as ImageIcon,
  Star
} from 'lucide-react';
import type { SyncQueueItem } from '../types/survey';
import { getSyncedHistory, deleteHistoryItem } from '../db/indexedDB';

export const SurveyHistory: React.FC = () => {
  const [historyItems, setHistoryItems] = useState<SyncQueueItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const loadHistory = async () => {
    try {
      const items = await getSyncedHistory();
      items.sort((a, b) => new Date(b.syncedAt || b.createdAt).getTime() - new Date(a.syncedAt || a.createdAt).getTime());
      setHistoryItems(items);
    } catch (err) {
      console.error('Failed to load synced history:', err);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (uuid: string) => {
    if (window.confirm('Bạn có chắc muốn xóa bản ghi này khỏi lịch sử thiết bị?')) {
      await deleteHistoryItem(uuid);
      await loadHistory();
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(historyItems, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `vku_survey_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredItems = historyItems.filter((item) => {
    const matchesCategory = selectedCategory === 'ALL' || item.data.category === selectedCategory;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      item.data.roomNumber.toLowerCase().includes(query) ||
      item.data.building.toLowerCase().includes(query) ||
      (item.data.defectNotes && item.data.defectNotes.toLowerCase().includes(query)) ||
      (item.data.inspectorName && item.data.inspectorName.toLowerCase().includes(query));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Search, Filter & Export Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Tìm theo phòng, tòa nhà, sự cố..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Export Button */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleExportJSON}
              disabled={historyItems.length === 0}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-semibold transition-all disabled:opacity-50"
              title="Xuất dữ liệu khảo sát ra file JSON"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Xuất dữ liệu JSON</span>
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {['ALL', 'Hardware', 'Projector', 'AC', 'Electrical', 'Furniture'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'ALL' && 'Tất cả'}
              {cat === 'Hardware' && 'Phần cứng'}
              {cat === 'Projector' && 'Máy chiếu'}
              {cat === 'AC' && 'Điều hòa'}
              {cat === 'Electrical' && 'Hệ thống điện'}
              {cat === 'Furniture' && 'Nội thất'}
            </button>
          ))}
        </div>
      </div>

      {/* History Items List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h4 className="text-base font-bold text-slate-700">Chưa có lịch sử khảo sát</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Các phiếu khảo sát sau khi đồng bộ thành công sẽ được lưu trữ tại đây để tra cứu và xuất báo cáo.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div
              key={item.uuid}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all space-y-3"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">
                      Phòng {item.data.roomNumber} - {item.data.floor}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ĐÃ ĐỒNG BỘ
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" /> {item.data.building}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {new Date(item.syncedAt || item.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(item.uuid)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Xóa khỏi lịch sử máy này"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Grid content */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Hạng mục:</span>
                  <div className="font-semibold text-slate-800 mt-0.5">{item.data.category}</div>
                </div>

                <div>
                  <span className="text-slate-400 block">Đánh giá:</span>
                  <div className="flex items-center gap-1 mt-0.5 font-bold text-amber-600">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{item.data.conditionRating} / 5 Sao</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block">Người kiểm định:</span>
                  <div className="text-slate-700 mt-0.5 font-medium">
                    {item.data.inspectorName || 'Không điền'}
                  </div>
                </div>
              </div>

              {item.data.defectNotes && (
                <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                    Ghi chú sự cố:
                  </span>
                  <p className="text-slate-700 mt-0.5 italic">"{item.data.defectNotes}"</p>
                </div>
              )}

              {/* Photo & UUID footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
                <span className="font-mono text-[10px] text-slate-400">UUID: {item.uuid}</span>

                {item.data.photoBase64 && (
                  <button
                    onClick={() => setSelectedImage(item.data.photoBase64 || null)}
                    className="flex items-center gap-1 text-sky-600 hover:text-sky-700 font-semibold"
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Xem ảnh chụp
                  </button>
                )}
              </div>
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
