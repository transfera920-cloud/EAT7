import type { SearchPlaceResult, SearchOrigin } from '../src/types.ts';

interface GeocodeResponse {
  status: string;
  results: Array<{
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    place_id: string;
  }>;
  error_message?: string;
}

interface PlacesSearchResponse {
  places?: Array<{
    id: string;
    displayName?: {
      text: string;
      languageCode?: string;
    };
    formattedAddress?: string;
    location?: {
      latitude: number;
      longitude: number;
    };
    rating?: number;
    userRatingCount?: number;
    googleMapsUri?: string;
    types?: string[];
    primaryTypeDisplayName?: {
      text: string;
    };
    businessStatus?: string;
    currentOpeningHours?: {
      openNow?: boolean;
    };
    priceLevel?: string;
  }>;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

interface RouteMatrixElement {
  originIndex?: number;
  destinationIndex?: number;
  status?: {
    code?: number;
    message?: string;
  };
  condition?: string;
  distanceMeters?: number;
  duration?: string; // e.g. "1240s"
}

export async function searchTrailheadFeast(
  trailhead: string,
  category: string,
  customKeyword: string | undefined,
  maxDriveTimeMinutes: number,
  apiKey: string
): Promise<{ origin: SearchOrigin; results: SearchPlaceResult[] }> {
  if (!apiKey) {
    throw new Error('MISSING_API_KEY');
  }

  // 1. Geocode the trailhead using Google Geocoding API
  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    trailhead
  )}&language=zh-TW&region=tw&key=${apiKey}`;

  const geocodeRes = await fetch(geocodeUrl);
  if (!geocodeRes.ok) {
    throw new Error(`Google Geocoding API 請求失敗 (HTTP ${geocodeRes.status})`);
  }

  const geocodeData = (await geocodeRes.json()) as GeocodeResponse;

  if (geocodeData.status === 'ZERO_RESULTS' || !geocodeData.results || geocodeData.results.length === 0) {
    throw new Error(`找不到登山口「${trailhead}」的位置，請確認登山口名稱後重試。`);
  }

  if (geocodeData.status !== 'OK') {
    throw new Error(`Geocoding API 錯誤: ${geocodeData.error_message || geocodeData.status}`);
  }

  const firstResult = geocodeData.results[0];
  const origin: SearchOrigin = {
    name: trailhead,
    formattedAddress: firstResult.formatted_address,
    location: {
      lat: firstResult.geometry.location.lat,
      lng: firstResult.geometry.location.lng
    }
  };

  // 2. Determine search query string
  let queryText = '';
  if (customKeyword && customKeyword.trim()) {
    queryText = customKeyword.trim();
  } else if (category && category !== '自訂') {
    queryText = category.trim();
  } else {
    queryText = '餐廳';
  }

  // Calculate search radius in meters (max 50,000m for Places search)
  // Mountain driving is usually 30-50 km/h, so radius = driveTimeMinutes * 800m, min 10km, max 50km
  const searchRadius = Math.min(50000, Math.max(10000, maxDriveTimeMinutes * 1000));

  // 3. Search places nearby using Places API (New) Text Search
  const placesUrl = 'https://places.googleapis.com/v1/places:searchText';
  const placesBody = {
    textQuery: queryText,
    locationBias: {
      circle: {
        center: {
          latitude: origin.location.lat,
          longitude: origin.location.lng
        },
        radius: searchRadius
      }
    },
    languageCode: 'zh-TW',
    maxResultCount: 20
  };

  const placesRes = await fetch(placesUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.googleMapsUri,places.types,places.primaryTypeDisplayName,places.businessStatus,places.currentOpeningHours,places.priceLevel'
    },
    body: JSON.stringify(placesBody)
  });

  if (!placesRes.ok) {
    const errJson = await placesRes.json().catch(() => ({}));
    throw new Error(`Google Places API (New) 錯誤 (HTTP ${placesRes.status}): ${errJson?.error?.message || '未知錯誤'}`);
  }

  const placesData = (await placesRes.json()) as PlacesSearchResponse;

  if (!placesData.places || placesData.places.length === 0) {
    return { origin, results: [] };
  }

  // Filter out places with no valid coordinates
  const validPlaces = placesData.places.filter(
    (p) => p.location && typeof p.location.latitude === 'number' && typeof p.location.longitude === 'number'
  );

  if (validPlaces.length === 0) {
    return { origin, results: [] };
  }

  // 4. Calculate actual driving time using Routes API - Compute Route Matrix
  const routesMatrixUrl = 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix';
  const routesMatrixBody = {
    origins: [
      {
        waypoint: {
          location: {
            latLng: {
              latitude: origin.location.lat,
              longitude: origin.location.lng
            }
          }
        }
      }
    ],
    destinations: validPlaces.map((p) => ({
      waypoint: {
        location: {
          latLng: {
            latitude: p.location!.latitude,
            longitude: p.location!.longitude
          }
        }
      }
    })),
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE'
  };

  const routesRes = await fetch(routesMatrixUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'originIndex,destinationIndex,status,condition,distanceMeters,duration'
    },
    body: JSON.stringify(routesMatrixBody)
  });

  if (!routesRes.ok) {
    const errJson = await routesRes.json().catch(() => ({}));
    throw new Error(
      `Google Routes API 錯誤 (HTTP ${routesRes.status}): ${errJson?.error?.message || '無法計算實際車程時間'}`
    );
  }

  const routeMatrix = (await routesRes.json()) as RouteMatrixElement[];

  // 5. Match drive durations with places and filter by maxDriveTimeMinutes
  const durationMap = new Map<number, { seconds: number; distanceMeters: number }>();

  if (Array.isArray(routeMatrix)) {
    for (const elem of routeMatrix) {
      if (typeof elem.destinationIndex === 'number' && elem.duration) {
        // duration format is "1234s"
        const seconds = parseInt(elem.duration.replace('s', ''), 10);
        if (!isNaN(seconds)) {
          durationMap.set(elem.destinationIndex, {
            seconds,
            distanceMeters: elem.distanceMeters || 0
          });
        }
      }
    }
  }

  const maxDriveSeconds = maxDriveTimeMinutes * 60;
  const filteredResults: SearchPlaceResult[] = [];

  for (let i = 0; i < validPlaces.length; i++) {
    const place = validPlaces[i];
    const routeInfo = durationMap.get(i);

    // If route was computed, check whether it is within the user's max drive time
    if (routeInfo) {
      if (routeInfo.seconds <= maxDriveSeconds) {
        const driveMinutes = Math.max(1, Math.round(routeInfo.seconds / 60));
        const distanceKm = (routeInfo.distanceMeters / 1000).toFixed(1);

        filteredResults.push({
          id: place.id,
          name: place.displayName?.text || '未提供名稱',
          formattedAddress: place.formattedAddress || '未提供地址',
          location: {
            lat: place.location!.latitude,
            lng: place.location!.longitude
          },
          rating: place.rating,
          userRatingCount: place.userRatingCount,
          driveDurationSeconds: routeInfo.seconds,
          driveDurationMinutes: driveMinutes,
          driveDurationText: `約 ${driveMinutes} 分鐘`,
          driveDistanceText: `${distanceKm} 公里`,
          driveDistanceMeters: routeInfo.distanceMeters,
          googleMapsUri:
            place.googleMapsUri ||
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.displayName?.text || '')}&query_place_id=${place.id}`,
          primaryType: place.primaryTypeDisplayName?.text,
          openNow: place.currentOpeningHours?.openNow,
          priceLevel: place.priceLevel
        });
      }
    }
  }

  // Sort by driving duration ascending
  filteredResults.sort((a, b) => a.driveDurationSeconds - b.driveDurationSeconds);

  return {
    origin,
    results: filteredResults
  };
}
