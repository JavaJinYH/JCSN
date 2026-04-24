const API_BASE_URL_KEY = 'mobile_api_base_url';
const CACHE_PREFIX = 'mobile_api_cache_';
const CACHE_DURATION = 30 * 60 * 1000; // 30分钟

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// 待拍照单据类型
export interface PendingDocument {
  id: string;
  type: 'sale' | 'purchase';
  invoiceNo?: string | null;
  date: string;
  partyName: string;
  amount: number;
  hasPhotos: boolean;
  photoCount: number;
}

interface DocumentItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface DocumentDetail {
  id: string;
  type: 'sale' | 'purchase';
  invoiceNo?: string | null;
  date: string;
  partyName: string;
  amount: number;
  items: DocumentItem[];
}

export class MobileApiService {
  static getBaseUrl(): string | null {
    return localStorage.getItem(API_BASE_URL_KEY);
  }

  static setBaseUrl(url: string): void {
    localStorage.setItem(API_BASE_URL_KEY, url);
  }

  static clearBaseUrl(): void {
    localStorage.removeItem(API_BASE_URL_KEY);
  }

  // 检查是否在线
  static isOnline(): boolean {
    return navigator.onLine;
  }

  // 从缓存获取数据
  private static getFromCache<T>(key: string): { success: boolean; data?: T; error?: string; isCached: boolean } {
    try {
      const cached = localStorage.getItem(CACHE_PREFIX + key);
      if (cached) {
        const entry: CacheEntry<T> = JSON.parse(cached);
        // 检查是否过期
        if (Date.now() - entry.timestamp < CACHE_DURATION) {
          return { success: true, data: entry.data, isCached: true };
        } else {
          // 过期了，删除缓存
          localStorage.removeItem(CACHE_PREFIX + key);
        }
      }
    } catch (e) {
      console.warn('[Mobile API] Cache read error:', e);
    }
    return { success: false, isCached: false };
  }

  // 保存到缓存
  private static saveToCache<T>(key: string, data: T): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch (e) {
      console.warn('[Mobile API] Cache save error:', e);
    }
  }

  static async request<T>(
    endpoint: string,
    options: RequestInit = {},
    useCache = true
  ): Promise<{ success: boolean; data?: T; error?: string; isCached?: boolean }> {
    const baseUrl = this.getBaseUrl();
    if (!baseUrl) {
      return { success: false, error: '请先设置 API 地址' };
    }

    const isGet = (options.method || 'GET') === 'GET';
    const cacheKey = endpoint;

    // 如果是GET请求，先检查缓存（不管在线与否）
    if (useCache && isGet) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached.success) {
        if (!this.isOnline()) {
          // 离线时直接返回缓存
          return { ...cached, isCached: true };
        }
        // 在线时继续网络请求，但缓存可用作降级
      }
    }

    try {
      const url = `${baseUrl}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        // 如果请求失败，但有缓存，返回缓存
        if (useCache && isGet) {
          const cached = this.getFromCache<T>(cacheKey);
          if (cached.success) {
            return { ...cached, isCached: true };
          }
        }
        return {
          success: false,
          error: errorData?.error || `请求失败: ${response.status}`,
        };
      }

      const result = await response.json();

      // 缓存成功的GET响应
      if (useCache && isGet && result.success) {
        this.saveToCache(cacheKey, result.data);
      }

      return { ...result, isCached: false };
    } catch (error: any) {
      console.error('[Mobile API] Request error:', error);
      // 网络请求失败，尝试返回缓存
      if (useCache && isGet) {
        const cached = this.getFromCache<T>(cacheKey);
        if (cached.success) {
          return { ...cached, isCached: true };
        }
      }
      return {
        success: false,
        error: this.isOnline()
          ? (error?.message || '请求失败，请检查网络')
          : '网络不可用，请连接WiFi查看最新数据',
      };
    }
  }

  static async getPendingDocuments(useCache = true): Promise<{ success: boolean; data?: PendingDocument[]; error?: string; isCached?: boolean }> {
    return this.request<PendingDocument[]>('/api/pending-documents', {}, useCache);
  }

  static async getDocument(id: string, useCache = true): Promise<{ success: boolean; data?: DocumentDetail; error?: string; isCached?: boolean }> {
    return this.request<DocumentDetail>(`/api/document/${id}`, {}, useCache);
  }

  static async uploadPhoto(id: string, dataUrl: string, photoType = 'receipt', remark = ''): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.request(`/api/document/${id}/upload-photo`, {
      method: 'POST',
      body: JSON.stringify({ dataUrl, photoType, remark }),
    }, false); // 上传照片不缓存
  }

  static async getInventory(useCache = true): Promise<{ success: boolean; data?: any; error?: string; isCached?: boolean }> {
    return this.request('/api/inventory', {}, useCache);
  }

  static async getSales(useCache = true): Promise<{ success: boolean; data?: any; error?: string; isCached?: boolean }> {
    return this.request('/api/sales', {}, useCache);
  }

  static async checkHealth(): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.request('/api/health', {}, false); // 健康检查不缓存
  }

  // 清除所有缓存
  static clearCache(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn('[Mobile API] Clear cache error:', e);
    }
  }
}
