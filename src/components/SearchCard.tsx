import React, { useState } from 'react';
import { Search, MapPin, Utensils, Clock, Sparkles } from 'lucide-react';
import type { Category, SiteSettings } from '../types.ts';

interface SearchCardProps {
  categories: Category[];
  settings: SiteSettings;
  onSearch: (params: {
    trailhead: string;
    category: string;
    customKeyword: string;
    maxDriveTimeMinutes: number;
  }) => void;
  isLoading: boolean;
}

export const SearchCard: React.FC<SearchCardProps> = ({
  categories,
  settings,
  onSearch,
  isLoading
}) => {
  const [trailhead, setTrailhead] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('火鍋');
  const [customKeyword, setCustomKeyword] = useState('');
  const [driveTimePreset, setDriveTimePreset] = useState<number>(30);
  const [customDriveTime, setCustomDriveTime] = useState<string>('');
  const [isCustomDriveTime, setIsCustomDriveTime] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  const driveTimeOptions = settings.defaultDriveTimes && settings.defaultDriveTimes.length > 0
    ? settings.defaultDriveTimes
    : [10, 20, 30, 40, 60];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trailhead.trim()) {
      setInputError('請輸入登山口名稱作為搜尋起點');
      return;
    }
    setInputError(null);

    let finalDriveTime = driveTimePreset;
    if (isCustomDriveTime) {
      const parsed = parseInt(customDriveTime, 10);
      if (isNaN(parsed) || parsed <= 0) {
        setInputError('請輸入大於 0 的自訂車程時間（分鐘）');
        return;
      }
      finalDriveTime = parsed;
    }

    onSearch({
      trailhead: trailhead.trim(),
      category: selectedCategory,
      customKeyword: customKeyword.trim(),
      maxDriveTimeMinutes: finalDriveTime
    });
  };

  return (
    <div id="search-card-container" className="w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 md:p-6 text-slate-200">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step 1: 登山口 (手動手打輸入，無下拉選單，無推薦庫) */}
        <div>
          <label htmlFor="input-trailhead" className="block text-sm font-semibold text-slate-200 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>登山口（搜尋起點）</span>
              <span className="text-xs font-normal text-rose-400">*必填</span>
            </span>
            <span className="text-xs text-slate-400 font-normal">
              請手動輸入實際登山口名稱
            </span>
          </label>
          <div className="relative">
            <input
              id="input-trailhead"
              type="text"
              value={trailhead}
              onChange={(e) => {
                setTrailhead(e.target.value);
                if (inputError) setInputError(null);
              }}
              placeholder={settings.trailheadPlaceholder || '例如：玉山登山口、合歡山松雪樓、奇萊登山口、向陽登山口...'}
              className="w-full bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3.5 text-base text-white placeholder:text-slate-500 transition-all outline-none"
              autoComplete="off"
            />
          </div>
          {inputError && (
            <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
              <span>⚠️</span> {inputError}
            </p>
          )}
        </div>

        {/* Step 2: 搜尋類別 (下拉選單與手動輸入並存) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5">
            <label htmlFor="select-category" className="block text-sm font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
              <Utensils className="w-4 h-4 text-amber-400" />
              <span>搜尋類別</span>
            </label>
            <div className="relative">
              <select
                id="select-category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full appearance-none bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3 text-sm text-white transition-all outline-none cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name} className="bg-slate-900 text-white">
                    {cat.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                ▼
              </div>
            </div>
          </div>

          <div className="md:col-span-7">
            <label htmlFor="input-custom-keyword" className="block text-sm font-semibold text-slate-200 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span>自訂搜尋欄位</span>
              </span>
              <span className="text-xs text-slate-400 font-normal">
                可與類別搭配或自由輸入
              </span>
            </label>
            <input
              id="input-custom-keyword"
              type="text"
              value={customKeyword}
              onChange={(e) => setCustomKeyword(e.target.value)}
              placeholder="例如：牛肉麵、熱炒、燒肉、小吃、早餐、咖啡、土雞城..."
              className="w-full bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 transition-all outline-none"
            />
          </div>
        </div>

        {/* Step 3: 車程時間設定 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>可接受車程時間（由 Google Maps 實際行車計算）</span>
            </label>
            <span className="text-xs text-emerald-400 font-medium">
              只顯示 {isCustomDriveTime ? (customDriveTime || '自訂') : driveTimePreset} 分鐘以內
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {driveTimeOptions.map((minutes) => {
              const active = !isCustomDriveTime && driveTimePreset === minutes;
              return (
                <button
                  key={minutes}
                  id={`btn-drive-time-${minutes}`}
                  type="button"
                  onClick={() => {
                    setIsCustomDriveTime(false);
                    setDriveTimePreset(minutes);
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  {minutes} 分鐘
                </button>
              );
            })}

            {/* Custom drive time button & input */}
            <div className="flex items-center gap-1.5">
              <button
                id="btn-drive-time-custom"
                type="button"
                onClick={() => setIsCustomDriveTime(true)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  isCustomDriveTime
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                自訂
              </button>
              {isCustomDriveTime && (
                <div className="flex items-center gap-1 bg-slate-950 border border-emerald-500/60 rounded-xl px-2 py-1">
                  <input
                    id="input-custom-minutes"
                    type="number"
                    min="1"
                    max="180"
                    value={customDriveTime}
                    onChange={(e) => setCustomDriveTime(e.target.value)}
                    placeholder="分鐘"
                    className="w-16 bg-transparent text-white text-sm outline-none px-1 text-center"
                    autoFocus
                  />
                  <span className="text-xs text-slate-400 pr-1">分鐘</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            id="btn-start-search"
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-base shadow-xl shadow-emerald-950/50 hover:shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Google Maps 即時路線計算中...</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span>{settings.buttonText || '開始搜尋慶功宴'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
