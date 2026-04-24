import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MobileApiService } from '@/services/MobileApiService';

const formatCurrency = (amount: number) => {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function MobileInventory() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [apiUrl, setApiUrl] = useState(MobileApiService.getBaseUrl() || '');
  const [isCached, setIsCached] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    if (!apiUrl) {
      setError('请先设置 API 地址');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await MobileApiService.getInventory();
      if (res.success) {
        setProducts(res.data || []);
        setIsCached(res.isCached || false);
        if (res.isCached) {
          setError('显示缓存数据，请连接 WiFi 查看最新');
        } else {
          setError('');
        }
      } else {
        setError(res.error || '加载失败');
      }
    } catch (e) {
      setError('连接 API 失败，请检查网络');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (apiUrl) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [apiUrl]);

  const handleSaveApiUrl = () => {
    MobileApiService.setBaseUrl(apiUrl);
    loadData();
  };

  const isOnline = MobileApiService.isOnline();

  const filteredProducts = products.filter(p => {
    if (!searchTerm) return true;
    return (
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const lowStockCount = products.filter(p => (p.quantity || 0) < 10).length;

  if (!apiUrl) {
    return (
      <div className="space-y-6 p-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">库存</h2>
          <p className="text-slate-500 text-sm mt-1">查看商品库存（只读）</p>
        </div>
        <div className="space-y-2">
          <div className="text-sm text-slate-600 mb-2">请输入主电脑的局域网地址</div>
          <input
            type="text"
            placeholder="例如: http://192.168.1.100:3456"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <Button onClick={handleSaveApiUrl} className="w-full">保存</Button>
        </div>
        {error && <div className="text-red-500 text-sm">{error}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">库存</h2>
          <p className="text-slate-500 text-sm">查看商品库存（只读）</p>
        </div>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <Badge className="bg-amber-100 text-amber-700">📴 离线</Badge>
          )}
          {isCached && (
            <Badge className="bg-blue-100 text-blue-700">💾 缓存</Badge>
          )}
        </div>
      </div>

      {error && !isCached && <div className="text-red-500 text-sm">{error}</div>}
      {isCached && <div className="text-amber-600 text-sm">⚠️ {error}</div>}

      <input
        type="text"
        placeholder="搜索商品..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
      />

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-slate-50">
          <CardContent className="pt-4">
            <div className="text-xs text-slate-600">商品总数</div>
            <div className="text-xl font-bold text-slate-800">{products.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50">
          <CardContent className="pt-4">
            <div className="text-xs text-amber-700">库存不足</div>
            <div className="text-xl font-bold text-amber-800">{lowStockCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={loadData}>
          🔄 刷新
        </Button>
      </div>

      <div className="text-sm text-slate-500">显示 {filteredProducts.length} 个商品</div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-500">加载中...</div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-slate-500">
            暂无商品
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((product) => {
            const quantity = product.quantity || 0;
            const isLowStock = quantity < 10;
            const isOutOfStock = quantity <= 0;

            return (
              <Card key={product.id} className={isOutOfStock ? 'border-red-200' : isLowStock ? 'border-amber-200' : ''}>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-slate-500">
                          {product.category?.name || '未分类'}
                          {product.brand?.name && ` · ${product.brand.name}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-orange-600">{formatCurrency(product.price || 0)}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`text-sm font-semibold px-2 py-1 rounded ${
                          isOutOfStock ? 'bg-red-100 text-red-700' :
                          isLowStock ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {quantity}
                        </div>
                        {product.spec && (
                          <span className="text-xs text-slate-500">{product.spec}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
