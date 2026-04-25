import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE_URL_KEY = 'mobile_api_base_url';
const CACHE_PREFIX = 'mobile_api_cache_';
const CACHE_DURATION = 100 * 365 * 24 * 60 * 60 * 1000; // 100年（永久保存）
const HEALTH_CHECK_INTERVAL = 5000; // 5秒检测一次

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

// 催账记录类型
export interface CollectionRecord {
  id: string;
  entityId: string;
  entityName: string;
  collectionDate: string;
  collectionTime?: string;
  collectionMethod: string;
  collectionResult: string;
  attitude?: string;
  collectionAmount?: number;
  communication?: string;
  nextPlan?: string;
  followUpDate?: string;
  followUpTime?: string;
  remark?: string;
}

// 挂账主体类型
export interface SettlementEntity {
  id: string;
  name: string;
  entityType: string;
  contactName: string;
  contactPhone: string;
  totalReceivable: number;
  totalPaid: number;
  totalRemaining: number;
  orderCount: number;
  outstandingCount: number;
}

// 挂账主体详情类型
export interface SettlementEntityDetail {
  id: string;
  name: string;
  entityType: string;
  contactName: string;
  contactPhone: string;
  address?: string;
  totalReceivable: number;
  totalPaid: number;
  totalRemaining: number;
  orders: SettlementOrder[];
}

export interface SettlementOrder {
  id: string;
  invoiceNo: string;
  saleDate: string;
  buyerName: string;
  projectName?: string;
  totalAmount: number;
  deliveryFee?: number;
  discount?: number;
  paidAmount: number;
  remaining: number;
  status: string;
  items: {
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
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
  private static getFromCache<T>(key: string): { success: boolean; data?: T; error?: string; isCached: boolean; timestamp?: number } {
    try {
      const cached = localStorage.getItem(CACHE_PREFIX + key);
      if (cached) {
        const entry: CacheEntry<T> = JSON.parse(cached);
        // 检查是否过期
        if (Date.now() - entry.timestamp < CACHE_DURATION) {
          return { success: true, data: entry.data, isCached: true, timestamp: entry.timestamp };
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

  // 获取缓存的时间戳
  static getCacheTimestamp(key: string): number | null {
    try {
      const cached = localStorage.getItem(CACHE_PREFIX + key);
      if (cached) {
        const entry: CacheEntry<any> = JSON.parse(cached);
        return entry.timestamp;
      }
    } catch (e) {
      console.warn('[Mobile API] Get cache timestamp error:', e);
    }
    return null;
  }

  // 格式化时间戳
  static formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;
    
    // 小于1分钟
    if (diff < 60 * 1000) {
      return '刚刚';
    }
    // 小于1小时
    if (diff < 60 * 60 * 1000) {
      return `${Math.floor(diff / (60 * 1000))}分钟前`;
    }
    // 小于24小时
    if (diff < 24 * 60 * 60 * 1000) {
      return `${Math.floor(diff / (60 * 60 * 1000))}小时前`;
    }
    // 显示日期
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  // 计算缓存大小
  static getCacheSize(): number {
    try {
      let size = 0;
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          size += (localStorage.getItem(key)?.length || 0) * 2; // 每个字符占2字节
        }
      });
      return size;
    } catch (e) {
      console.warn('[Mobile API] Get cache size error:', e);
      return 0;
    }
  }

  // 格式化文件大小
  static formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
  ): Promise<{ success: boolean; data?: T; error?: string; isCached?: boolean; timestamp?: number }> {
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

      return { ...result, isCached: false, timestamp: Date.now() };
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

  static async getPendingDocuments(useCache = true): Promise<{ success: boolean; data?: PendingDocument[]; error?: string; isCached?: boolean; timestamp?: number }> {
    return this.request<PendingDocument[]>('/api/pending-documents', {}, useCache);
  }

  static async getDocument(id: string, useCache = true): Promise<{ success: boolean; data?: DocumentDetail; error?: string; isCached?: boolean; timestamp?: number }> {
    return this.request<DocumentDetail>(`/api/document/${id}`, {}, useCache);
  }

  static async uploadPhoto(id: string, dataUrl: string, photoType = 'receipt', remark = ''): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.request(`/api/document/${id}/upload-photo`, {
      method: 'POST',
      body: JSON.stringify({ dataUrl, photoType, remark }),
    }, false); // 上传照片不缓存
  }

  static getPhotoUrl(relativePath: string): string {
    const baseUrl = this.getBaseUrl();
    return `${baseUrl}/api/photo/${relativePath}`;
  }

  static async getDashboard(useCache = true): Promise<{ success: boolean; data?: any; error?: string; isCached?: boolean; timestamp?: number }> {
    return this.request('/api/dashboard', {}, useCache);
  }

  static async getInventory(useCache = true): Promise<{ success: boolean; data?: any; error?: string; isCached?: boolean; timestamp?: number }> {
    return this.request('/api/inventory', {}, useCache);
  }

  static async getSales(page = 1, pageSize = 5, search = '', useCache = true): Promise<{ success: boolean; data?: any[]; error?: string; isCached?: boolean; page?: number; pageSize?: number; total?: number; timestamp?: number }> {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.append('search', search);
    return this.request(`/api/sales?${params}`, {}, useCache);
  }

  static async getSaleById(id: string, useCache = true): Promise<{ success: boolean; data?: any; error?: string; isCached?: boolean; timestamp?: number }> {
    return this.request(`/api/sale/${id}`, {}, useCache);
  }

  static async getPurchaseById(id: string, useCache = true): Promise<{ success: boolean; data?: any; error?: string; isCached?: boolean; timestamp?: number }> {
    return this.request(`/api/purchase/${id}`, {}, useCache);
  }

  static async getPurchases(page = 1, pageSize = 5, search = '', useCache = true): Promise<{ success: boolean; data?: any[]; error?: string; isCached?: boolean; page?: number; pageSize?: number; total?: number; timestamp?: number }> {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.append('search', search);
    return this.request(`/api/purchases?${params}`, {}, useCache);
  }

  static async getCollections(page = 1, pageSize = 5, search = '', useCache = true): Promise<{ success: boolean; data?: CollectionRecord[]; error?: string; isCached?: boolean; page?: number; pageSize?: number; total?: number; timestamp?: number }> {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.append('search', search);
    return this.request<CollectionRecord[]>(`/api/collections?${params}`, {}, useCache);
  }

  static async getSettlements(page = 1, pageSize = 5, search = '', useCache = true): Promise<{ success: boolean; data?: SettlementEntity[]; error?: string; isCached?: boolean; page?: number; pageSize?: number; total?: number; timestamp?: number }> {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.append('search', search);
    return this.request<SettlementEntity[]>(`/api/settlements?${params}`, {}, useCache);
  }

  static async getSettlementEntityDetail(id: string, useCache = true): Promise<{ success: boolean; data?: SettlementEntityDetail; error?: string; isCached?: boolean; timestamp?: number }> {
    return this.request<SettlementEntityDetail>(`/api/settlements/entity/${id}`, {}, useCache);
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

  // 预加载销售详情（自动预加载前N条）
  static async preloadSaleDetails(saleIds: string[], limit = 5): Promise<void> {
    try {
      const idsToPreload = saleIds.slice(0, limit);
      const promises = idsToPreload.map(id => this.getSaleById(id, true));
      await Promise.all(promises);
    } catch (e) {
      console.warn('[Mobile API] Preload sale details error:', e);
    }
  }

  // 预加载所有销售详情（手动下载）
  static async preloadAllSaleDetails(saleIds: string[]): Promise<void> {
    try {
      const promises = saleIds.map(id => this.getSaleById(id, true));
      await Promise.all(promises);
    } catch (e) {
      console.warn('[Mobile API] Preload all sale details error:', e);
    }
  }

  // 预加载进货详情（自动预加载前N条）
  static async preloadPurchaseDetails(purchaseIds: string[], limit = 5): Promise<void> {
    try {
      const idsToPreload = purchaseIds.slice(0, limit);
      const promises = idsToPreload.map(id => this.getPurchaseById(id, true));
      await Promise.all(promises);
    } catch (e) {
      console.warn('[Mobile API] Preload purchase details error:', e);
    }
  }

  // 预加载所有进货详情（手动下载）
  static async preloadAllPurchaseDetails(purchaseIds: string[]): Promise<void> {
    try {
      const promises = purchaseIds.map(id => this.getPurchaseById(id, true));
      await Promise.all(promises);
    } catch (e) {
      console.warn('[Mobile API] Preload all purchase details error:', e);
    }
  }

  // 预加载挂账详情（自动预加载前N条）
  static async preloadSettlementDetails(settlementIds: string[], limit = 5): Promise<void> {
    try {
      const idsToPreload = settlementIds.slice(0, limit);
      const promises = idsToPreload.map(id => this.getSettlementEntityDetail(id, true));
      await Promise.all(promises);
    } catch (e) {
      console.warn('[Mobile API] Preload settlement details error:', e);
    }
  }

  // 预加载所有挂账详情（手动下载）
  static async preloadAllSettlementDetails(settlementIds: string[]): Promise<void> {
    try {
      const promises = settlementIds.map(id => this.getSettlementEntityDetail(id, true));
      await Promise.all(promises);
    } catch (e) {
      console.warn('[Mobile API] Preload all settlement details error:', e);
    }
  }
}

export function useMobileApi() {
  // 设备是否联网（WiFi）
  const [deviceOnline, setDeviceOnline] = useState(MobileApiService.isOnline());
  // API 服务是否可用
  const [apiAvailable, setApiAvailable] = useState(false);
  // 缓存标记
  const [isCached, setIsCached] = useState(false);
  // API 地址
  const [apiUrl, setApiUrlState] = useState<string | null>(MobileApiService.getBaseUrl());
  // 是否正在检测
  const [isChecking, setIsChecking] = useState(false);
  // 定时器引用
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // 上一次的网络状态
  const prevDeviceOnlineRef = useRef(deviceOnline);

  // 单独的健康检测函数
  const checkApiHealth = useCallback(async () => {
    if (!apiUrl) {
      setApiAvailable(false);
      return;
    }

    try {
      const result = await MobileApiService.checkHealth();
      const available = result.success;
      setApiAvailable(available);
    } catch (error) {
      setApiAvailable(false);
    }
  }, [apiUrl]);

  // 监听设备网络状态
  useEffect(() => {
    const handleOnline = () => {
      console.log('[useMobileApi] 网络恢复在线');
      setDeviceOnline(true);
    };
    const handleOffline = () => {
      console.log('[useMobileApi] 网络离线');
      setDeviceOnline(false);
      setApiAvailable(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 监听deviceOnline变化，触发网络恢复事件
  useEffect(() => {
    if (deviceOnline && !prevDeviceOnlineRef.current) {
      console.log('[useMobileApi] 网络从离线恢复为在线！');
      // 触发网络恢复事件
      const event = new CustomEvent('network-recovered');
      window.dispatchEvent(event);
    }
    prevDeviceOnlineRef.current = deviceOnline;
  }, [deviceOnline]);

  // 当有 API 地址时，开始定期检测
  useEffect(() => {
    if (apiUrl && deviceOnline) {
      // 立即检测一次
      checkApiHealth();

      // 设置定时器定期检测
      healthCheckIntervalRef.current = setInterval(() => {
        checkApiHealth();
      }, HEALTH_CHECK_INTERVAL);
    } else {
      setApiAvailable(false);
      // 清理定时器
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }
    }

    // 清理函数
    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }
    };
  }, [apiUrl, deviceOnline, checkApiHealth]);

  const setApiUrl = useCallback((url: string) => {
    if (url) {
      MobileApiService.setBaseUrl(url);
      setApiUrlState(url);
    } else {
      MobileApiService.clearBaseUrl();
      setApiUrlState(null);
      setApiAvailable(false);
    }
  }, []);

  // 手动触发一次检测
  const refreshStatus = useCallback(() => {
    if (apiUrl) {
      checkApiHealth();
    }
  }, [apiUrl, checkApiHealth]);

  return {
    // 总的连接状态：设备在线 + API 可用
    isOnline: deviceOnline && apiAvailable,
    // 分开的状态
    deviceOnline,
    apiAvailable,
    isCached,
    setIsCached,
    apiUrl,
    setApiUrl,
    refreshStatus,
    isChecking
  };
}
