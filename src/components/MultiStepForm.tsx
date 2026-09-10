import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Layers,
  FileText,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Save,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Monitor,
  Projector,
  Wind,
  Zap,
  Armchair
} from 'lucide-react';
import type { SurveyCategory, SurveyFormData } from '../types/survey';
import { saveDraft, getDraft, clearDraft, enqueueSurvey } from '../db/indexedDB';
import { networkService } from '../services/networkService';
import { syncService } from '../services/syncService';
import { StarRating } from './StarRating';
import { CameraCapture } from './CameraCapture';

interface MultiStepFormProps {
  onSubmitted: () => void;
}

const CATEGORY_OPTIONS: { id: SurveyCategory; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'Hardware', label: 'Phần cứng PC', icon: <Monitor className="w-5 h-5" />, desc: 'Case, màn hình, chuột, phím' },
  { id: 'Projector', label: 'Máy chiếu', icon: <Projector className="w-5 h-5" />, desc: 'Máy chiếu, màn chiếu, cáp HDMI' },
  { id: 'AC', label: 'Điều hòa / Máy lạnh', icon: <Wind className="w-5 h-5" />, desc: 'Khối trong nhà, remote, quạt gió' },
  { id: 'Electrical', label: 'Hệ thống điện', icon: <Zap className="w-5 h-5" />, desc: 'Ổ cắm, bóng đèn, quạt trần, công tắc' },
  { id: 'Furniture', label: 'Bàn ghế & Nội thất', icon: <Armchair className="w-5 h-5" />, desc: 'Bàn học, ghế giáo viên, bục giảng, rèm' }
];

const BUILDINGS = ['Khu A (Hành chính)', 'Khu B (Giảng đường)', 'Khu C (Công nghệ)', 'Khu K (Ký túc xá)', 'Khu V (Việt - Hàn)'];
const FLOORS = ['Tầng 1', 'Tầng 2', 'Tầng 3', 'Tầng 4', 'Tầng 5'];

export const MultiStepForm: React.FC<MultiStepFormProps> = ({ onSubmitted }) => {
  const [step, setStep] = useState<number>(1);
  const [isOnline, setIsOnline] = useState<boolean>(networkService.isOnline);
  const [hasRestoredDraft, setHasRestoredDraft] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<SurveyFormData>({
    building: 'Khu B (Giảng đường)',
    floor: 'Tầng 2',
    roomNumber: '',
    category: 'Projector',
    conditionRating: 4,
    defectNotes: '',
    photoBase64: undefined,
    inspectorName: ''
  });

  // 1. Subscribe to network status
  useEffect(() => {
    return networkService.subscribe((online) => {
      setIsOnline(online);
    });
  }, []);

  // 2. Load draft from IndexedDB on initial mount
  useEffect(() => {
    async function loadSavedDraft() {
      try {
        const savedDraft = await getDraft();
        if (savedDraft && savedDraft.data) {
          setFormData((prev) => ({
            ...prev,
            ...savedDraft.data
          }));
          if (savedDraft.currentStep) {
            setStep(savedDraft.currentStep);
          }
          setHasRestoredDraft(true);
        }
      } catch (err) {
        console.error('Failed to load draft from IndexedDB:', err);
      }
    }
    loadSavedDraft();
  }, []);

  // 3. Real-time auto-save to IndexedDB whenever formData or step changes
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only save if user has filled at least something
      if (formData.roomNumber || formData.defectNotes || formData.photoBase64) {
        saveDraft(formData, step).catch((e) => console.error('Auto-save draft failed:', e));
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [formData, step]);

  const handleFieldChange = (field: keyof SurveyFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleResetDraft = async () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bản nháp và điền lại từ đầu?')) {
      await clearDraft();
      setFormData({
        building: 'Khu B (Giảng đường)',
        floor: 'Tầng 2',
        roomNumber: '',
        category: 'Projector',
        conditionRating: 4,
        defectNotes: '',
        photoBase64: undefined,
        inspectorName: ''
      });
      setStep(1);
      setHasRestoredDraft(false);
    }
  };

  const validateStep = (currentStep: number): boolean => {
    if (currentStep === 1) {
      if (!formData.roomNumber.trim()) {
        alert('Vui lòng nhập số phòng kiểm tra (ví dụ: B204, A101)!');
        return false;
      }
    }
    if (currentStep === 2) {
      if (!formData.conditionRating || formData.conditionRating < 1) {
        alert('Vui lòng chọn số sao đánh giá tình trạng thiết bị!');
        return false;
      }
    }
    if (currentStep === 3) {
      if (formData.conditionRating <= 3 && !formData.defectNotes.trim()) {
        alert('Với tình trạng thiết bị từ 3 sao trở xuống, vui lòng ghi rõ mô tả hư hỏng!');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

    setIsSubmitting(true);
    try {
      // 1. Tag offline submission with UUID, timestamp, and save as PENDING_SYNC in IndexedDB
      const queuedItem = await enqueueSurvey(formData);

      // 2. Clear real-time draft from IndexedDB
      await clearDraft();

      // 3. If online, trigger immediate background sync dispatch
      if (isOnline) {
        syncService.processQueue().catch((e) => console.error(e));
        setSuccessMessage(`Đã gửi khảo sát phòng ${formData.roomNumber} thành công!`);
      } else {
        setSuccessMessage(
          `Bạn đang ngoại tuyến. Khảo sát phòng ${formData.roomNumber} đã được lưu vào Hàng đợi (UUID: ${queuedItem.uuid.slice(
            0,
            8
          )}...) và sẽ tự động gửi khi có mạng!`
        );
      }

      // Reset form
      setFormData({
        building: 'Khu B (Giảng đường)',
        floor: 'Tầng 2',
        roomNumber: '',
        category: 'Projector',
        conditionRating: 4,
        defectNotes: '',
        photoBase64: undefined,
        inspectorName: formData.inspectorName // keep inspector name for convenience
      });
      setStep(1);
      setHasRestoredDraft(false);

      setTimeout(() => {
        setSuccessMessage(null);
        onSubmitted();
      }, 2500);
    } catch (err: any) {
      console.error('Submit failed:', err);
      alert('Đã xảy ra lỗi khi lưu khảo sát: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Draft Notification Banner */}
      {hasRestoredDraft && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Đã tự động khôi phục dữ liệu bản nháp từ <strong>IndexedDB</strong>.</span>
          </div>
          <button
            type="button"
            onClick={handleResetDraft}
            className="flex items-center gap-1 font-semibold text-rose-700 hover:text-rose-800 underline ml-2 shrink-0"
          >
            <RotateCcw className="w-3 h-3" /> Xóa bản nháp
          </button>
        </div>
      )}

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="bg-emerald-50 border-b border-emerald-200 p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-emerald-900">Ghi nhận thành công!</h4>
            <p className="text-xs text-emerald-700 mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Multi-step Header Indicator */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-xs font-bold text-sky-600 uppercase tracking-wider">
              Bước {step} / 4
            </span>
            <h3 className="text-base font-bold text-slate-800">
              {step === 1 && 'Vị trí phòng học kiểm định'}
              {step === 2 && 'Hạng mục & Đánh giá tình trạng'}
              {step === 3 && 'Chi tiết sự cố & Chụp ảnh'}
              {step === 4 && 'Xác nhận & Gửi phiếu'}
            </h3>
          </div>

          <button
            type="button"
            onClick={handleResetDraft}
            className="text-xs text-slate-400 hover:text-rose-600 flex items-center gap-1 p-1 rounded transition-colors"
            title="Nhập lại từ đầu"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Làm mới
          </button>
        </div>

        {/* Progress Bar Steps */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { num: 1, label: 'Vị trí' },
            { num: 2, label: 'Thiết bị' },
            { num: 3, label: 'Ảnh & Lỗi' },
            { num: 4, label: 'Xác nhận' }
          ].map((item) => (
            <div key={item.num} className="flex flex-col gap-1">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step >= item.num ? 'bg-sky-600' : 'bg-slate-200'
                }`}
              />
              <span
                className={`text-[10px] font-medium hidden sm:block ${
                  step === item.num ? 'text-sky-700 font-bold' : 'text-slate-400'
                }`}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
        {/* STEP 1: LOCATION */}
        {step === 1 && (
          <div className="space-y-4 animate-fadeIn">
            {/* Building */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-sky-600" /> Tòa nhà kiểm tra (Building)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {BUILDINGS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => handleFieldChange('building', b)}
                    className={`text-left p-3 rounded-xl border text-xs font-semibold transition-all ${
                      formData.building === b
                        ? 'border-sky-600 bg-sky-50/70 text-sky-800 shadow-xs ring-1 ring-sky-600'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Floor & Room Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-600" /> Tầng (Floor)
                </label>
                <select
                  value={formData.floor}
                  onChange={(e) => handleFieldChange('floor', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  {FLOORS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-sky-600" /> Số phòng (Room #) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: B204, A102, C305..."
                  value={formData.roomNumber}
                  onChange={(e) => handleFieldChange('roomNumber', e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  required
                />
              </div>
            </div>

            {/* Inspector Name (Optional) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Cán bộ / Sinh viên kiểm định (MSSV)
              </label>
              <input
                type="text"
                placeholder="Họ tên hoặc MSSV kiểm tra viên (ví dụ: Nguyễn Văn A - 22GIT...)"
                value={formData.inspectorName}
                onChange={(e) => handleFieldChange('inspectorName', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
          </div>
        )}

        {/* STEP 2: CATEGORY & STAR RATING */}
        {step === 2 && (
          <div className="space-y-5 animate-fadeIn">
            {/* Category Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Hạng mục cơ sở vật chất (Category) <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {CATEGORY_OPTIONS.map((cat) => {
                  const isSelected = formData.category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleFieldChange('category', cat.id)}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-sky-600 bg-sky-50/80 text-sky-900 shadow-xs ring-1 ring-sky-600'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg shrink-0 ${
                          isSelected ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {cat.icon}
                      </div>
                      <div>
                        <div className="text-sm font-bold">{cat.label}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{cat.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Condition Rating (1-5 Star) */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Đánh giá tình trạng hoạt động (1–5 Sao) <span className="text-rose-500">*</span>
              </label>
              <StarRating
                value={formData.conditionRating}
                onChange={(val) => handleFieldChange('conditionRating', val)}
                size="lg"
              />
            </div>
          </div>
        )}

        {/* STEP 3: DEFECT NOTES & CAMERA PHOTO */}
        {step === 3 && (
          <div className="space-y-5 animate-fadeIn">
            {/* Defect Notes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center justify-between">
                <span>Ghi chú lỗi / Hư hỏng thực tế (Defect Notes)</span>
                {formData.conditionRating <= 3 && (
                  <span className="text-rose-500 text-[11px] font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Bắt buộc với đánh giá ≤ 3 sao
                  </span>
                )}
              </label>
              <textarea
                rows={3}
                placeholder="Mô tả cụ thể: Máy chiếu mờ hình, điều hòa chảy nước, mất kết nối mạng, bàn gãy chân..."
                value={formData.defectNotes}
                onChange={(e) => handleFieldChange('defectNotes', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none"
              />
            </div>

            {/* Camera Photo Capture */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Ảnh chụp thực tế hiện trường (Camera Photo)
              </label>
              <CameraCapture
                photoBase64={formData.photoBase64}
                onPhotoChange={(base64) => handleFieldChange('photoBase64', base64)}
              />
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW & SUBMIT */}
        {step === 4 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">
                Tổng quan phiếu kiểm định
              </h4>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block">Vị trí:</span>
                  <strong className="text-slate-800">
                    Phòng {formData.roomNumber}, {formData.floor}, {formData.building}
                  </strong>
                </div>

                <div>
                  <span className="text-slate-400 block">Hạng mục:</span>
                  <strong className="text-slate-800">
                    {CATEGORY_OPTIONS.find((c) => c.id === formData.category)?.label}
                  </strong>
                </div>

                <div>
                  <span className="text-slate-400 block">Tình trạng:</span>
                  <strong className="text-slate-800">{formData.conditionRating} / 5 Sao</strong>
                </div>

                <div>
                  <span className="text-slate-400 block">Người kiểm định:</span>
                  <strong className="text-slate-800">{formData.inspectorName || 'Không điền'}</strong>
                </div>
              </div>

              {formData.defectNotes && (
                <div className="text-xs pt-2 border-t border-slate-200/60">
                  <span className="text-slate-400 block">Ghi chú hư hỏng:</span>
                  <p className="text-slate-700 mt-0.5 italic bg-white p-2 rounded border border-slate-100">
                    "{formData.defectNotes}"
                  </p>
                </div>
              )}

              {formData.photoBase64 && (
                <div className="text-xs pt-2 border-t border-slate-200/60 flex items-center gap-3">
                  <img
                    src={formData.photoBase64}
                    alt="Xem trước"
                    className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                  />
                  <span className="text-emerald-700 font-medium">✓ Đã đính kèm ảnh hiện trường</span>
                </div>
              )}
            </div>

            {/* Network condition guidance */}
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              <Save className="w-4 h-4 shrink-0" />
              <span>
                {isOnline
                  ? 'Thiết bị đang Trực tuyến. Phiếu sẽ được lưu và đồng bộ ngay lên hệ thống.'
                  : 'Thiết bị đang Ngoại tuyến (Offline). Phiếu sẽ được gắn UUID và lưu an toàn vào Hàng đợi PENDING_SYNC trên IndexedDB.'}
              </span>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all ml-auto"
            >
              Tiếp tục <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-sky-600/25 transition-all ml-auto disabled:opacity-50"
            >
              {isSubmitting ? (
                <>Đang xử lý...</>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" /> {isOnline ? 'Nộp phiếu khảo sát' : 'Lưu vào Hàng đợi Offline'}
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
