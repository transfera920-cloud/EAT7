// Source: Google Maps Platform Code Assist
import React, { useEffect, useState } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap
} from '@vis.gl/react-google-maps';
import { ExternalLink, Star, Mountain, Navigation, AlertCircle } from 'lucide-react';
import type { SearchOrigin, SearchPlaceResult } from '../types.ts';

interface GoogleMapViewProps {
  apiKey: string | null;
  hasKey: boolean;
  origin?: SearchOrigin;
  places: SearchPlaceResult[];
  activePlaceId: string | null;
  onSelectPlace: (placeId: string) => void;
}

// Sub-component to control map viewport smoothly
const MapController: React.FC<{
  origin?: SearchOrigin;
  places: SearchPlaceResult[];
  activePlace?: SearchPlaceResult;
}> = ({ origin, places, activePlace }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (activePlace) {
      map.panTo({ lat: activePlace.location.lat, lng: activePlace.location.lng });
      map.setZoom(15);
      return;
    }

    if (origin && places.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: origin.location.lat, lng: origin.location.lng });
      for (const place of places) {
        bounds.extend({ lat: place.location.lat, lng: place.location.lng });
      }
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    } else if (origin) {
      map.panTo({ lat: origin.location.lat, lng: origin.location.lng });
      map.setZoom(13);
    }
  }, [map, origin, places, activePlace]);

  return null;
};

export const GoogleMapView: React.FC<GoogleMapViewProps> = ({
  apiKey,
  hasKey,
  origin,
  places,
  activePlaceId,
  onSelectPlace
}) => {
  const [selectedPlace, setSelectedPlace] = useState<SearchPlaceResult | null>(null);

  // Sync selected place when activePlaceId changes from external list
  useEffect(() => {
    if (activePlaceId) {
      const found = places.find((p) => p.id === activePlaceId);
      if (found) {
        setSelectedPlace(found);
      }
    } else {
      setSelectedPlace(null);
    }
  }, [activePlaceId, places]);

  // Default center: Taiwan center or trailhead location
  const defaultCenter = origin
    ? { lat: origin.location.lat, lng: origin.location.lng }
    : { lat: 23.97565, lng: 120.97388 }; // Taiwan geographic center

  if (!hasKey || !apiKey) {
    return (
      <div className="w-full h-[400px] md:h-[480px] bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center justify-center p-6 text-center shadow-2xl relative overflow-hidden">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">需要設定 Google Maps Platform 金鑰</h3>
        <p className="text-sm text-slate-400 max-w-md mb-4 leading-relaxed">
          系統已使用官方 Maps JavaScript API、Places API (New) 與 Routes API 建構。請在環境變數或 Settings 中填入 <code className="text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">GOOGLE_MAPS_API_KEY</code> 以啟動即時地圖與路線計算。
        </p>
        <div className="text-xs text-slate-500 bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800">
          需於 Google Cloud Console 啟用：Maps JavaScript API、Geocoding API、Places API (New)、Routes API
        </div>
      </div>
    );
  }

  return (
    <div
      id="google-maps-view-wrapper"
      className="w-full h-[420px] md:h-[500px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative"
    >
      <APIProvider apiKey={apiKey} language="zh-TW" region="TW">
        <Map
          id="mountain-feast-map"
          defaultCenter={defaultCenter}
          defaultZoom={origin ? 12 : 8}
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          gestureHandling="greedy"
          disableDefaultUI={false}
          className="w-full h-full"
        >
          <MapController origin={origin} places={places} activePlace={selectedPlace || undefined} />

          {/* Trailhead Origin Marker */}
          {origin && (
            <AdvancedMarker
              position={{ lat: origin.location.lat, lng: origin.location.lng }}
              title={`起點登山口：${origin.name}`}
            >
              <div className="flex flex-col items-center group cursor-pointer">
                <div className="px-2.5 py-1 bg-emerald-600 border-2 border-emerald-400 text-white rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                  <Mountain className="w-3.5 h-3.5" />
                  <span>{origin.name}</span>
                </div>
                <div className="w-2.5 h-2.5 bg-emerald-500 rotate-45 -mt-1 shadow-sm" />
              </div>
            </AdvancedMarker>
          )}

          {/* Place Markers */}
          {places.map((place, index) => {
            const isActive = selectedPlace?.id === place.id;
            return (
              <AdvancedMarker
                key={place.id}
                position={{ lat: place.location.lat, lng: place.location.lng }}
                title={`${place.name} (${place.driveDurationText})`}
                onClick={() => {
                  setSelectedPlace(place);
                  onSelectPlace(place.id);
                }}
              >
                <div className="flex flex-col items-center cursor-pointer transform transition-transform hover:scale-110">
                  <div
                    className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-xl flex items-center gap-1 border-2 transition-all ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 border-white scale-110 z-30 ring-4 ring-amber-400/40'
                        : 'bg-slate-900 text-amber-400 border-amber-400/80 hover:bg-amber-500 hover:text-slate-950'
                    }`}
                  >
                    <span>#{index + 1}</span>
                    <span className="font-semibold">{place.driveDurationText}</span>
                  </div>
                  <div
                    className={`w-2 h-2 rotate-45 -mt-1 ${
                      isActive ? 'bg-amber-400' : 'bg-slate-900 border-b border-r border-amber-400'
                    }`}
                  />
                </div>
              </AdvancedMarker>
            );
          })}

          {/* Selected Place InfoWindow */}
          {selectedPlace && (
            <InfoWindow
              position={{
                lat: selectedPlace.location.lat,
                lng: selectedPlace.location.lng
              }}
              onCloseClick={() => setSelectedPlace(null)}
              maxWidth={320}
            >
              <div className="p-1 text-slate-900">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-bold text-base text-slate-900 leading-snug">
                    {selectedPlace.name}
                  </h4>
                  {selectedPlace.openNow !== undefined && (
                    <span
                      className={`text-[11px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                        selectedPlace.openNow
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {selectedPlace.openNow ? '營業中' : '休息中'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-2 text-xs text-slate-600">
                  {selectedPlace.rating ? (
                    <div className="flex items-center text-amber-500 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 mr-0.5" />
                      <span>{selectedPlace.rating.toFixed(1)}</span>
                      {selectedPlace.userRatingCount && (
                        <span className="text-slate-400 font-normal ml-0.5">
                          ({selectedPlace.userRatingCount})
                        </span>
                      )}
                    </div>
                  ) : null}

                  <div className="flex items-center text-emerald-700 font-medium">
                    <Navigation className="w-3 h-3 mr-0.5" />
                    <span>
                      {selectedPlace.driveDurationText}（{selectedPlace.driveDistanceText}）
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                  {selectedPlace.formattedAddress}
                </p>

                <a
                  href={selectedPlace.googleMapsUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow transition-colors"
                >
                  <span>在 Google Maps 中查看</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  );
};
