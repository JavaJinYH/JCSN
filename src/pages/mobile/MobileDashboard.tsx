import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MobileApiService, useMobileApi } from '@/services/MobileApiService';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';

const formatCurrency = (amount: number) => {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function MobileDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { apiUrl, setIsCached } = useMobileApi();

  const loadData = async () => {
    if (!apiUrl) {
      setError('请先在"待拍照"页面设置 API 地址');
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

  if (!apiUrl) {
    return (
      <div className="min-h-screen bg-slate-50">
        <MobilePageHeader title="首页" subtitle="查看今日销售、库存等概览（只读）" />
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
        title="首页"
        subtitle="查看今日销售、库存等概览（只读）"
        onRefresh={loadData}
      />
      
      <div className="p-4 space-y-4">
        {error && (
          <div className="text-sm p-2 rounded">
            <div className="text-amber-600 bg-amber-50 border border-amber-200">{error}</div>
          </div>
        )}

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
                <h3 className="font-semibold text-slate-800 mb-3 px-1">今日销售</h3>
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
                <h3 className="font-semibold text-slate-800 mb-3 px-1">今日催账</h3>
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
    </div>
  );
}
