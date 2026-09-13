import React, { useEffect, useRef } from 'react';
import { ExternalLink, Star, Car, MapPin, Tag, CheckCircle2 } from 'lucide-react';
import type { SearchPlaceResult } from '../types.ts';

interface PlaceListProps {
  places: SearchPlaceResult[];
  activePlaceId: string | null;
  onSelectPlace: (placeId: string) => void;
  maxDriveTimeMinutes: number;
}

export const PlaceList: React.FC<PlaceListProps> = ({
  places,
  activePlaceId,
  onSelectPlace,
  maxDriveTimeMinutes
}) => {
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Auto-scroll to active card when selected from map
  useEffect(() => {
    if (activePlaceId && itemRefs.current[activePlaceId]) {
      itemRefs.current[activePlaceId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [activePlaceId]);

  if (places.length === 0) {
    return (
      <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        <p className="text-base font-medium text-slate-300 mb-1">
          在車程 {maxDriveTimeMinutes} 分鐘以內未找到符合條件的店家
        </p>
        <p className="text-xs text-slate-500">
          建議增加可接受車程時間，或嘗試其他餐點類別或自訂關鍵字。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
            <span>慶功宴推薦清單</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              共 {places.length} 間店家
            </span>
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          已篩選：車程 {maxDriveTimeMinutes} 分鐘內 · 依車程由近至遠排序
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {places.map((place, index) => {
          const isActive = activePlaceId === place.id;
          return (
            <div
              key={place.id}
              ref={(el) => {
                itemRefs.current[place.id] = el;
              }}
              id={`place-card-${place.id}`}
              onClick={() => onSelectPlace(place.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer relative group ${
                isActive
                  ? 'bg-slate-850 border-amber-500/80 ring-2 ring-amber-400/30 shadow-xl'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-start gap-2.5">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <h4 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors leading-snug">
                      {place.name}
                    </h4>
                    {place.primaryType && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                        <Tag className="w-3 h-3 text-slate-500" />
                        {place.primaryType}
                      </span>
                    )}
                  </div>
                </div>

                {/* Drive duration badge */}
                <div className="flex flex-col items-end shrink-0">
                  <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1 text-xs font-bold shadow-sm">
                    <Car className="w-3.5 h-3.5" />
                    <span>{place.driveDurationText}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5">
                    距離 {place.driveDistanceText}
                  </span>
                </div>
              </div>

              {/* Rating and business status */}
              <div className="flex items-center flex-wrap gap-3 mb-2.5 text-xs">
                {place.rating ? (
                  <div className="flex items-center text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                    <Star className="w-3.5 h-3.5 fill-amber-400 mr-1" />
                    <span>{place.rating.toFixed(1)}</span>
                    {place.userRatingCount && (
                      <span className="text-slate-400 font-normal ml-1">
                        ({place.userRatingCount} 則評論)
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-500 text-xs">尚無評分</span>
                )}

                {place.openNow !== undefined && (
                  <div
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                      place.openNow
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{place.openNow ? '營業中' : '休息中'}</span>
                  </div>
                )}
              </div>

              {/* Address */}
              <div className="flex items-start gap-1.5 text-xs text-slate-400 mb-3 line-clamp-2">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span>{place.formattedAddress}</span>
              </div>

              {/* Action buttons */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  點擊定位地圖
                </span>

                <a
                  href={place.googleMapsUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 hover:border-emerald-500 transition-all shadow-sm"
                >
                  <span>在 Google Maps 中查看</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
