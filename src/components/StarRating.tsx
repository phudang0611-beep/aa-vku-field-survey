import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange: (rating: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const RATING_LABELS: Record<number, { text: string; color: string; bg: string }> = {
  1: { text: '1 Sao - Rất kém / Hư hỏng', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
  2: { text: '2 Sao - Kém / Cần bảo trì', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  3: { text: '3 Sao - Trung bình / Dùng tạm', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  4: { text: '4 Sao - Tốt / Ít khuyết điểm', color: 'text-sky-600', bg: 'bg-sky-50 border-sky-200' },
  5: { text: '5 Sao - Rất tốt / Hoàn hảo', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' }
};

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  readOnly = false,
  size = 'md'
}) => {
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-7 h-7',
    lg: 'w-9 h-9'
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= value;
          return (
            <button
              key={star}
              type="button"
              disabled={readOnly}
              onClick={() => onChange(star)}
              className={`transition-all duration-150 p-1 rounded-lg ${
                readOnly
                  ? 'cursor-default'
                  : 'hover:scale-115 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-400'
              }`}
            >
              <Star
                className={`${iconSizes[size]} transition-colors ${
                  filled
                    ? 'text-amber-400 fill-amber-400 drop-shadow-sm'
                    : 'text-slate-300 fill-slate-100 hover:text-amber-200'
                }`}
              />
            </button>
          );
        })}
      </div>

      {value > 0 && RATING_LABELS[value] && (
        <div
          className={`text-xs font-semibold px-2.5 py-1 rounded-md border w-fit transition-all ${
            RATING_LABELS[value].bg
          } ${RATING_LABELS[value].color}`}
        >
          {RATING_LABELS[value].text}
        </div>
      )}
    </div>
  );
};
