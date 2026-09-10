import React, { useState } from 'react';
import { Camera, Image as ImageIcon, Trash2, RefreshCw } from 'lucide-react';
import { capturePhoto, pickImageViaWebFallback } from '../services/cameraService';

interface CameraCaptureProps {
  photoBase64?: string;
  onPhotoChange: (base64?: string) => void;
  readOnly?: boolean;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  photoBase64,
  onPhotoChange,
  readOnly = false
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCapture = async () => {
    if (readOnly) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const base64 = await capturePhoto();
      onPhotoChange(base64);
    } catch (err: any) {
      if (!err?.message?.includes('cancelled') && !err?.message?.includes('canceled')) {
        setErrorMsg('Không thể mở máy ảnh hoặc truy cập thư viện.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadWebFallback = async () => {
    if (readOnly) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const base64 = await pickImageViaWebFallback();
      onPhotoChange(base64);
    } catch (err: any) {
      if (!err?.message?.includes('Cancelled')) {
        setErrorMsg('Không thể tải tệp ảnh lên.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePhoto = () => {
    if (readOnly) return;
    if (window.confirm('Bạn có chắc muốn xóa ảnh này?')) {
      onPhotoChange(undefined);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {photoBase64 ? (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-md group">
          <img
            src={photoBase64}
            alt="Ảnh hiện trường kiểm định"
            className="w-full max-h-72 object-contain mx-auto bg-slate-950"
          />
          {!readOnly && (
            <div className="absolute top-2 right-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleCapture}
                className="p-2 rounded-xl bg-slate-900/80 text-white hover:bg-slate-900 shadow-sm backdrop-blur transition-all active:scale-95"
                title="Chụp lại ảnh khác"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="p-2 rounded-xl bg-rose-600/90 text-white hover:bg-rose-600 shadow-sm backdrop-blur transition-all active:scale-95"
                title="Xóa ảnh"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-slate-900/75 backdrop-blur text-white text-[11px] px-2.5 py-1 rounded-md font-medium">
            Ảnh minh chứng hiện trường
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-300 hover:border-sky-500 rounded-2xl p-6 bg-slate-50/70 text-center transition-all">
          <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Camera className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800 mb-1">
            Chụp ảnh hiện trường thiết bị
          </h4>
          <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4">
            Ảnh chụp sẽ tự động được nén và lưu trữ cục bộ vào IndexedDB phục vụ đồng bộ ngoại tuyến.
          </p>

          {!readOnly && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleCapture}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-semibold shadow-sm shadow-sky-600/20 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                <span>Mở Máy ảnh (Capacitor)</span>
              </button>

              <button
                type="button"
                onClick={handleUploadWebFallback}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 active:scale-95 text-slate-700 border border-slate-300 text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
              >
                <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>Chọn từ máy</span>
              </button>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs text-rose-600 mt-3 font-medium">{errorMsg}</p>
          )}
        </div>
      )}
    </div>
  );
};
