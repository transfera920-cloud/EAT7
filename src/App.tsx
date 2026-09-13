import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { SearchCard } from './components/SearchCard.tsx';
import { GoogleMapView } from './components/GoogleMapView.tsx';
import { PlaceList } from './components/PlaceList.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { Footer } from './components/Footer.tsx';
import { SeoHead } from './components/SeoHead.tsx';
import { AlertTriangle, Key } from 'lucide-react';
import type {
  Category,
  SiteSettings,
  SearchPlaceResult,
  SearchOrigin,
  SearchResponse,
  MapClientConfig
} from './types.ts';
import { apiFetch } from './lib/api.ts';

export default function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({
    siteTitle: '下山慶功宴搜尋系統',
    siteDescription: '登山下山後，以登山口為起點，搜尋指定車程時間內的慶功宴美食店家',
    seoTitle: '下山慶功宴搜尋系統｜登山口附近餐廳火鍋美食推薦',
    seoDescription: '登山下山後，以登山口為起點，透過 Google Maps 依實際車程時間篩選火鍋、麵店、熱炒等慶功宴美食！',
    searchInterfaceText: '輸入登山口開始搜尋',
    buttonText: '開始搜尋慶功宴',
    trailheadPlaceholder: '例如：玉山登山口、合歡山松雪樓、奇萊登山口、向陽登山口...',
    canonicalUrl: 'https://mountain-feast-search.app',
    defaultDriveTimes: [10, 20, 30, 40, 60]
  });

  const [mapConfig, setMapConfig] = useState<MapClientConfig>({ hasKey: false });
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [missingApiKeyError, setMissingApiKeyError] = useState(false);

  // Search Results State
  const [origin, setOrigin] = useState<SearchOrigin | undefined>(undefined);
  const [places, setPlaces] = useState<SearchPlaceResult[]>([]);
  const [activePlaceId, setActivePlaceId] = useState<string | null>(null);
  const [currentDriveTime, setCurrentDriveTime] = useState<number>(30);
  const [hasSearched, setHasSearched] = useState(false);

  // Admin State
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);

  // Initial Data Fetching
  const fetchPublicData = async () => {
    try {
      // 1. Fetch Categories
      const { res: catRes, data: catData } = await apiFetch<{ success: boolean; categories: Category[] }>('/api/categories');
      if (catRes.ok && catData?.success && Array.isArray(catData.categories)) {
        setCategories(catData.categories);
      }

      // 2. Fetch Settings
      const { res: setRes, data: setData } = await apiFetch<{ success: boolean; settings: Partial<SiteSettings> }>('/api/settings');
      if (setRes.ok && setData?.success && setData.settings) {
        setSettings((prev) => ({ ...prev, ...setData.settings }));
      }

      // 3. Fetch Map Client Config
      const { res: mapRes, data: mapData } = await apiFetch<MapClientConfig>('/api/config/maps-config');
      if (mapRes.ok && mapData) {
        setMapConfig(mapData);
      }
    } catch (err) {
      console.error('Error fetching initial site data', err);
    }
  };

  useEffect(() => {
    fetchPublicData();

    // Check if admin session cookie exists
    apiFetch<{ success: boolean; user?: any }>('/api/admin/me')
      .then(({ res, data }) => {
        if (res.ok && data?.success && data.user) {
          setAdminToken('cookie-session');
        }
      })
      .catch(() => {});
  }, []);

  // Handle Search Submission
  const handleSearch = async (params: {
    trailhead: string;
    category: string;
    customKeyword: string;
    maxDriveTimeMinutes: number;
  }) => {
    setIsSearching(true);
    setSearchError(null);
    setMissingApiKeyError(false);
    setCurrentDriveTime(params.maxDriveTimeMinutes);
    setActivePlaceId(null);

    try {
      const { res, data, error } = await apiFetch<SearchResponse>('/api/search', {
        method: 'POST',
        body: JSON.stringify(params)
      });

      if (!res.ok || !data?.success) {
        if (data?.missingApiKey) {
          setMissingApiKeyError(true);
        }
        setSearchError(error || data?.error || '搜尋失敗，請確認後再試。');
      } else {
        setOrigin(data.origin);
        setPlaces(data.results || []);
        setHasSearched(true);
        if (data.results && data.results.length > 0) {
          setActivePlaceId(data.results[0].id);
        }
      }
    } catch (err: any) {
      setSearchError(err?.message || '伺服器連線異常，請稍後再試。');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await apiFetch('/api/admin/logout', {
        method: 'POST',
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {}
      });
    } catch {
      // ignore
    }
    setAdminToken(null);
    setIsAdminOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      <SeoHead settings={settings} />

      {/* Header */}
      <Header
        settings={settings}
        onOpenAdmin={() => setIsAdminOpen(true)}
        isAdminLoggedIn={Boolean(adminToken)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 py-4 md:py-6 space-y-6">
        {/* Step A: Search Card (Visual focal point) */}
        <section aria-label="慶功宴搜尋面板">
          <SearchCard
            categories={categories}
            settings={settings}
            onSearch={handleSearch}
            isLoading={isSearching}
          />
        </section>

        {/* Error notification banner */}
        {searchError && (
          <div
            id="search-error-banner"
            className="p-4 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-200 text-sm flex items-start gap-3 shadow-lg"
          >
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-100">搜尋未完成</p>
              <p className="text-xs text-rose-300 mt-0.5 leading-relaxed">{searchError}</p>
              {missingApiKeyError && (
                <div className="mt-2.5 p-2.5 bg-rose-900/40 rounded-lg border border-rose-800/60 text-xs text-rose-200">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <Key className="w-3.5 h-3.5" />
                    <span>Google Maps API 設定指引：</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-rose-300">
                    <li>請前往 Google Cloud Console 啟用 Geocoding API、Places API (New)、Routes API、Maps JavaScript API</li>
                    <li>在環境變數或 Settings 中加入 <code className="bg-slate-950 px-1 py-0.5 rounded text-emerald-400">GOOGLE_MAPS_API_KEY</code></li>
                    <li>儲存後即可直接執行即時精準車程與地圖搜尋</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step B: Google Maps Interactive View */}
        <section aria-label="Google Maps 地圖檢視" className="w-full">
          <GoogleMapView
            apiKey={mapConfig.apiKey || null}
            hasKey={mapConfig.hasKey}
            origin={origin}
            places={places}
            activePlaceId={activePlaceId}
            onSelectPlace={(id) => setActivePlaceId(id)}
          />
        </section>

        {/* Step C: Place Results List below the map */}
        {hasSearched && (
          <section aria-label="慶功宴店家結果清單" className="w-full pt-2">
            <PlaceList
              places={places}
              activePlaceId={activePlaceId}
              onSelectPlace={(id) => setActivePlaceId(id)}
              maxDriveTimeMinutes={currentDriveTime}
            />
          </section>
        )}
      </main>

      {/* Admin Management Modal */}
      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        token={adminToken}
        onLoginSuccess={(tok) => setAdminToken(tok)}
        onLogout={handleAdminLogout}
        categories={categories}
        settings={settings}
        onRefreshData={fetchPublicData}
      />

      {/* Footer */}
      <Footer
        onOpenAdmin={() => setIsAdminOpen(true)}
        isAdminLoggedIn={Boolean(adminToken)}
      />
    </div>
  );
}
