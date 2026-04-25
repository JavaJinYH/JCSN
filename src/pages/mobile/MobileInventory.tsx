import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MobileApiService, useMobileApi } from '@/services/MobileApiService';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';

const formatCurrency = (amount: number) => {
  if (!amount && amount !== 0) return '¥--';
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function MobileInventory() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { apiUrl, setIsCached } = useMobileApi();

  const loadData = async () => {
    if (!apiUrl) {
      setError('请先在"待拍照"页面设置 API 地址');
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

  // 监听网络恢复事件，自动刷新数据
  useEffect(() => {
    const handleNetworkRecovered = () => {
      console.log('[Mobile Inventory] 检测到网络恢复，开始刷新数据...');
      if (apiUrl) {
        loadData();
      }
    };

    window.addEventListener('network-recovered', handleNetworkRecovered);

    return () => {
      window.removeEventListener('network-recovered', handleNetworkRecovered);
    };
  }, [apiUrl]);

  const filteredProducts = products.filter(p => {
    if (!searchTerm) return true;
    return (
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.specification && p.specification.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const lowStockCount = products.filter(p => {
    const qty = p.stock || 0;
    const min = p.minStock || 10;
    return qty > 0 && qty < min;
  }).length;

  const outOfStockCount = products.filter(p => (p.stock || 0) <= 0).length;

  if (!apiUrl) {
    return (
      <div className="min-h-screen bg-slate-50">
        <MobilePageHeader title="库存" subtitle="查看商品库存（只读）" />
        <div className="p-4 space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-3">📱 请先设置 API</h3>
            <p className="text-xs text-blue-700 mb-3">请先在"待拍照"页面设置 API 地址，才能查看数据</p>
            <Link to="/mobile/pending-documents">
              <Button className="w-full">去设置</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <MobilePageHeader
        title="库存"
        subtitle="查看商品库存（只读）"
        onRefresh={loadData}
      />

      <div className="p-4 space-y-4">
        {error && (
          <div className="text-sm p-2 rounded">
            <div className="text-amber-600 bg-amber-50 border border-amber-200">{error}</div>
          </div>
        )}

        <Input
          placeholder="搜索商品..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className="grid grid-cols-3 gap-2">
          <Card className="bg-slate-50">
            <CardContent className="pt-3 pb-3">
              <div className="text-xs text-slate-500">商品种类</div>
              <div className="text-lg font-bold text-slate-800">{products.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-amber-50">
            <CardContent className="pt-3 pb-3">
              <div className="text-xs text-amber-600">库存不足</div>
              <div className="text-lg font-bold text-amber-700">{lowStockCount}</div>
            </CardContent>
          </Card>
          <Card className="bg-red-50">
            <CardContent className="pt-3 pb-3">
              <div className="text-xs text-red-600">已缺货</div>
              <div className="text-lg font-bold text-red-700">{outOfStockCount}</div>
            </CardContent>
          </Card>
        </div>

        <div className="text-sm text-slate-500 px-1">显示 {filteredProducts.length} 个商品</div>

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
              const quantity = product.stock || 0;
              const minStock = product.minStock || 10;
              const isOutOfStock = quantity <= 0;
              const isLowStock = quantity > 0 && quantity < minStock;
              const isNormalStock = quantity >= minStock;
              const lastPurchasePrice = product.lastPurchasePrice || 0;
              const referencePrice = product.referencePrice || 0;

              return (
                <Card key={product.id} className={
                  isOutOfStock ? 'border-red-300 bg-red-50' :
                  isLowStock ? 'border-amber-300 bg-amber-50' : ''
                }>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {/* 商品基本信息 */}
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-lg leading-tight">{product.name}</div>
                          <div className="text-sm text-slate-500 mt-1">
                            {product.category?.name || '未分类'}
                            {product.brand && ` · ${product.brand}`}
                          </div>
                          {product.specification && (
                            <div className="text-xs text-slate-400 mt-1">
                              规格：{product.specification}
                            </div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <div className={`font-bold ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-green-600'}`}>
                            {quantity}
                          </div>
                          <div className="text-xs text-slate-400">{product.unit || '个'}</div>
                        </div>
                      </div>

                      {/* 价格信息 */}
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex gap-4">
                          <div>
                            <span className="text-slate-400">成本价：</span>
                            <span className="font-medium">{formatCurrency(lastPurchasePrice)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">参考价：</span>
                            <span className="font-medium">{formatCurrency(referencePrice)}</span>
                          </div>
                        </div>
                      </div>

                      {/* 库存状态和标签 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isOutOfStock && (
                            <Badge className="bg-red-100 text-red-700">已缺货</Badge>
                          )}
                          {isLowStock && !isOutOfStock && (
                            <Badge className="bg-amber-100 text-amber-700">库存不足</Badge>
                          )}
                          {isNormalStock && (
                            <Badge className="bg-green-100 text-green-700">库存充足</Badge>
                          )}
                          {product.isPriceVolatile && (
                            <Badge className="bg-orange-100 text-orange-700">价格波动</Badge>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">
                          最低库存: {minStock}
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
    </div>
  );
}
