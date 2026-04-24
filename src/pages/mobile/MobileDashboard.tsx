import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MobileApiService } from '@/services/MobileApiService';

const formatCurrency = (amount: number) => {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function MobileDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [apiUrl, setApiUrl] = useState(MobileApiService.getBaseUrl() || '');
  const [isCached, setIsCached] = useState(false);

  const loadData = async () => {
    if (!apiUrl) {
      setError('请先设置 API 地址');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await MobileApiService.getDashboard();
      if (res.success) {
        setData(res.data);
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

  if (!apiUrl) {
    return (
      <div className="space-y-6 p-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">首页</h2>
          <p className="text-slate-500 text-sm mt-1">查看今日销售、库存等概览（只读）</p>
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
          <h2 className="text-xl font-bold text-slate-800">首页</h2>
          <p className="text-slate-500 text-sm">查看今日销售、库存等概览（只读）</p>
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

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={loadData}>
          🔄 刷新
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-500">加载中...</div>
        </div>
      ) : !data ? null : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="pt-4">
                <div className="text-xs text-blue-600">今日销售笔数</div>
                <div className="text-2xl font-bold text-blue-800">{data.todaySales?.length || 0}</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100">
              <CardContent className="pt-4">
                <div className="text-xs text-amber-600">商品种类</div>
                <div className="text-2xl font-bold text-amber-800">{data.totalProducts || 0}</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="pt-4">
                <div className="text-xs text-green-600">今日进货笔数</div>
                <div className="text-2xl font-bold text-green-800">{data.todayPurchases?.length || 0}</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-50 to-red-100">
              <CardContent className="pt-4">
                <div className="text-xs text-red-600">待收款</div>
                <div className="text-2xl font-bold text-red-800">{formatCurrency(data.totalReceivable || 0)}</div>
              </CardContent>
            </Card>
          </div>

          {data.todaySales?.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-800 mb-3">今日销售</h3>
              <div className="space-y-2">
                {data.todaySales.map((sale: any) => (
                  <Card key={sale.id}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between">
                        <div>
                          <div className="font-medium">{sale.buyer?.name || '散客'}</div>
                          <div className="text-sm text-slate-500">{sale.invoiceNo || sale.id.substring(0, 8)}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-orange-600">{formatCurrency(sale.totalAmount || 0)}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {data.todayCollections?.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-800 mb-3">今日催账</h3>
              <div className="space-y-2">
                {data.todayCollections.map((collection: any) => (
                  <Card key={collection.id}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between">
                        <div>
                          <div className="font-medium">{collection.entity?.name || '未知'}</div>
                          <div className="text-sm text-slate-500">{collection.collectionResult || '无结果'}</div>
                        </div>
                        {collection.collectionAmount && (
                          <div className="font-bold text-green-600">
                            {formatCurrency(collection.collectionAmount)}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
