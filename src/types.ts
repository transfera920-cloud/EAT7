export interface Category {
  id: number;
  name: string;
  sort_order: number;
  is_active: number; // 1 or 0
  created_at?: string;
  updated_at?: string;
}

export interface SiteSettings {
  siteTitle: string;
  siteDescription: string;
  seoTitle: string;
  seoDescription: string;
  searchInterfaceText: string;
  buttonText: string;
  trailheadPlaceholder: string;
  canonicalUrl: string;
  defaultDriveTimes: number[];
}

export interface PlaceLocation {
  lat: number;
  lng: number;
}

export interface SearchPlaceResult {
  id: string;
  name: string;
  formattedAddress: string;
  location: PlaceLocation;
  rating?: number;
  userRatingCount?: number;
  driveDurationSeconds: number;
  driveDurationMinutes: number;
  driveDurationText: string;
  driveDistanceText: string;
  driveDistanceMeters: number;
  googleMapsUri: string;
  primaryType?: string;
  openNow?: boolean;
  priceLevel?: string;
}

export interface SearchOrigin {
  name: string;
  formattedAddress: string;
  location: PlaceLocation;
}

export interface SearchResponse {
  success: boolean;
  origin?: SearchOrigin;
  results?: SearchPlaceResult[];
  totalFound?: number;
  searchTimeMs?: number;
  query?: {
    trailhead: string;
    category: string;
    customKeyword?: string;
    maxDriveTimeMinutes: number;
  };
  error?: string;
  missingApiKey?: boolean;
}

export interface MapClientConfig {
  hasKey: boolean;
  apiKey?: string;
}

export interface AdminUser {
  id: number;
  username: string;
}
