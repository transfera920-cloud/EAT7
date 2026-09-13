// Centralized API Client with VITE_API_BASE_URL and CORS support

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ res: Response; data: T | null; error?: string }> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${API_BASE_URL}${cleanEndpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include' // Allow cookies across origins if needed
  };

  try {
    const res = await fetch(fullUrl, config);
    const contentType = res.headers.get('content-type') || '';
    let data: T | null = null;

    if (contentType.includes('application/json')) {
      try {
        data = (await res.json()) as T;
      } catch {
        // failed to parse JSON
      }
    }

    if (!res.ok) {
      let errMsg = '';
      if (data && typeof data === 'object' && 'error' in (data as any)) {
        errMsg = (data as any).error;
      } else if (res.status === 404) {
        errMsg = `找不到 API 路由 (HTTP 404: ${cleanEndpoint})。如果您使用 Cloudflare Pages 等靜態託管，請設定 VITE_API_BASE_URL 或在後台部署 Node.js / Worker 後端服務。`;
      } else if (res.status === 401) {
        errMsg = '認證失敗：帳號或密碼錯誤，或登入過期 (HTTP 401)';
      } else if (res.status === 403) {
        errMsg = '存取權限不足 (HTTP 403)';
      } else if (res.status >= 500) {
        errMsg = `伺服器內部錯誤 (HTTP ${res.status})，請檢查後端日誌`;
      } else {
        errMsg = `請求失敗 (HTTP ${res.status})`;
      }
      return { res, data, error: errMsg };
    }

    return { res, data };
  } catch (err: any) {
    console.error(`[API Error on ${fullUrl}]:`, err);
    const isCorsOrOffline = err?.name === 'TypeError' || err?.message?.includes('fetch');
    const errorMsg = isCorsOrOffline
      ? `無法連線至伺服器 (${fullUrl})。請檢查後端服務是否已啟動、網路狀態或 CORS 跨域設定。`
      : (err?.message || '網路或伺服器連線失敗');

    // Create a mock Response object for catch block
    const mockRes = new Response(null, { status: 0, statusText: 'Network Error' });
    return { res: mockRes, data: null, error: errorMsg };
  }
}
