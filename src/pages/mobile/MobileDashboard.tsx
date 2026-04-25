import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MobileApiService, useMobileApi } from '@/services/MobileApiService';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';
import { NetworkStatus } from '@/components/mobile/NetworkStatus';
import { MobileSkeletonGrid, MobileSkeletonList } from '@/components/mobile/MobileSkeleton';

const formatCurrency = (amount: number) => {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function MobileDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
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
        // 保存更新时间
        if (res.timestamp) {
          setLastUpdated(res.timestamp);
        } else if (res.isCached) {
          // 如果是缓存但没有timestamp，尝试从缓存获取
          const cachedTimestamp = MobileApiService.getCacheTimestamp('/api/dashboard');
          if (cachedTimestamp) setLastUpdated(cachedTimestamp);
        }
        if (!res.isCached) {
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

  const handleDownloadAll = async () => {
    if (!MobileApiService.isOnline() || !apiUrl) {
      return;
    }
    setDownloadingAll(true);
    setDownloadProgress('准备下载...');
    try {
      // 1. 下载所有销售数据 + 详情
      setDownloadProgress('正在下载销售数据...');
      const allSales: any[] = [];
      let currentPage = 1;
      let hasMorePages = true;
      while (hasMorePages) {
        const res = await MobileApiService.getSales(currentPage, 100, '');
        if (res.success && res.data) {
          allSales.push(...res.data);
          hasMorePages = res.data.length >= 100;
          currentPage++;
        } else {
          hasMorePages = false;
        }
      }
      // 预加载销售详情
      const saleIds = allSales.map(s => s.id);
      const batchSize = 5;
      for (let i = 0; i < saleIds.length; i += batchSize) {
        const batch = saleIds.slice(i, i + batchSize);
        await MobileApiService.preloadAllSaleDetails(batch);
        setDownloadProgress(`销售详情: ${Math.min(i + batchSize, saleIds.length)}/${saleIds.length}`);
      }

      // 2. 下载所有进货数据 + 详情
      setDownloadProgress('正在下载进货数据...');
      const allPurchases: any[] = [];
      currentPage = 1;
      hasMorePages = true;
      while (hasMorePages) {
        const res = await MobileApiService.getPurchases(currentPage, 100, '');
        if (res.success && res.data) {
          allPurchases.push(...res.data);
          hasMorePages = res.data.length >= 100;
          currentPage++;
        } else {
          hasMorePages = false;
        }
      }
      // 预加载进货详情
      const purchaseIds = allPurchases.map(p => p.id);
      for (let i = 0; i < purchaseIds.length; i += batchSize) {
        const batch = purchaseIds.slice(i, i + batchSize);
        await MobileApiService.preloadAllPurchaseDetails(batch);
        setDownloadProgress(`进货详情: ${Math.min(i + batchSize, purchaseIds.length)}/${purchaseIds.length}`);
      }

      // 3. 下载所有挂账数据 + 详情
      setDownloadProgress('正在下载挂账数据...');
      const allSettlements: any[] = [];
      currentPage = 1;
      hasMorePages = true;
      while (hasMorePages) {
        const res = await MobileApiService.getSettlements(currentPage, 100, '');
        if (res.success && res.data) {
          allSettlements.push(...res.data);
          hasMorePages = res.data.length >= 100;
          currentPage++;
        } else {
          hasMorePages = false;
        }
      }
      // 预加载挂账详情
      const settlementIds = allSettlements.map(s => s.id);
      for (let i = 0; i < settlementIds.length; i += batchSize) {
        const batch = settlementIds.slice(i, i + batchSize);
        await MobileApiService.preloadAllSettlementDetails(batch);
        setDownloadProgress(`挂账详情: ${Math.min(i + batchSize, settlementIds.length)}/${settlementIds.length}`);
      }

      // 4. 下载首页和库存数据
      setDownloadProgress('正在下载首页和库存数据...');
      await MobileApiService.getDashboard();
      await MobileApiService.getInventory();

      setDownloadProgress('下载完成！');
      setTimeout(() => setDownloadProgress(''), 2000);
    } catch (e) {
      console.error('[Mobile Dashboard] Download all error:', e);
      setDownloadProgress('下载失败，请重试');
      setTimeout(() => setDownloadProgress(''), 2000);
    } finally {
      setDownloadingAll(false);
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
      console.log('[Mobile Dashboard] 检测到网络恢复，开始刷新数据...');
      if (apiUrl) {
        loadData();
      }
    };

    window.addEventListener('network-recovered', handleNetworkRecovered);

    return () => {
      window.removeEventListener('network-recovered', handleNetworkRecovered);
    };
  }, [apiUrl, loadData]);

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
      
      <div className="px-4 pt-2 space-y-2">
        <NetworkStatus timestamp={lastUpdated || undefined} />
        <Link to="/mobile/settings">
          <Button variant="outline" className="w-full justify-start">
            ⚙️ 设置
          </Button>
        </Link>
      </div>
      
      <div className="p-4 space-y-4">
        {error && (
          <div className="text-sm p-2 rounded">
            <div className="text-amber-600 bg-amber-50 border border-amber-200">{error}</div>
          </div>
        )}

        {/* 统一下载所有离线数据按钮 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-800 mb-3">📥 离线数据管理</h3>
          <p className="text-xs text-blue-700 mb-3">一键下载所有销售、进货、挂账数据，离线后也能正常使用</p>
          
          {/* 缓存状态概览 */}
          <div className="mb-4 space-y-2">
            <div className="bg-white rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">当前缓存大小</span>
                <span className="text-sm font-medium">
                  {MobileApiService.formatFileSize(MobileApiService.getCacheSize())}
                </span>
              </div>
            </div>
            {lastUpdated && (
              <div className="bg-white rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-600">最后更新时间</span>
                  <span className="text-sm font-medium">
                    {MobileApiService.formatTimestamp(lastUpdated)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {downloadProgress && (
            <div className="text-sm text-blue-600 mb-2">{downloadProgress}</div>
          )}
          <Button
            className="w-full"
            onClick={handleDownloadAll}
            disabled={downloadingAll || !MobileApiService.isOnline()}
          >
            {downloadingAll ? '下载中...' : '下载所有离线数据'}
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            <MobileSkeletonGrid count={4} />
            <div className="pt-4">
              <MobileSkeletonList count={3} />
            </div>
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
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
                <CardContent className="pt-4">
                  <div className="text-xs text-orange-600">今日销售额</div>
                  <div className="text-2xl font-bold text-orange-800">{formatCurrency(data.todaySalesTotal || 0)}</div>
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
