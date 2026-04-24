const API_BASE_URL_KEY = 'mobile_api_base_url';

export class MobileApiService {
  private static getBaseUrl(): string | null {
    return localStorage.getItem(API_BASE_URL_KEY);
  }

  static setBaseUrl(url: string) {
    localStorage.setItem(API_BASE_URL_KEY, url);
  }

  static clearBaseUrl() {
    localStorage.removeItem(API_BASE_URL_KEY);
  }

  static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    const baseUrl = this.getBaseUrl();
    if (!baseUrl) {
      return { success: false, error: '请先设置 API 地址' };
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
        return {
          success: false,
          error: errorData?.error || `请求失败: ${response.status}`,
        };
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('[Mobile API] Request error:', error);
      return {
        success: false,
        error: error?.message || '网络请求失败，请检查连接',
      };
    }
  }

  static async getPendingDocuments() {
    return this.request('/api/pending-documents');
  }

  static async getDocument(id: string) {
    return this.request(`/api/document/${id}`);
  }

  static async uploadPhoto(id: string, dataUrl: string, photoType = 'receipt', remark = '') {
    return this.request(`/api/document/${id}/upload-photo`, {
      method: 'POST',
      body: JSON.stringify({ dataUrl, photoType, remark }),
    });
  }

  static async getInventory() {
    return this.request('/api/inventory');
  }

  static async getSales() {
    return this.request('/api/sales');
  }

  static async checkHealth() {
    return this.request('/api/health');
  }
}
