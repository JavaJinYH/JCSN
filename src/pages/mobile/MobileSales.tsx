import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MobileApiService } from '@/services/MobileApiService';
import { MobilePageHeader, MobileList, MobileSectionTitle, MobileCardGrid, MobileCardItem, MobileEmptyState } from '@/components/mobile/MobilePageHeader';
import { SaleCard } from '@/components/mobile/MobileCards';
import { NetworkStatus } from '@/components/mobile/NetworkStatus';
import { MobileSkeletonList, MobileSkeletonGrid } from '@/components/mobile/MobileSkeleton';

const formatCurrency = (amount: number) => {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function MobileSales() {
  const navigate = useNavigate();
  const [allSales, setAllSales] = useState<any[]>([]); // 保存所有数据，用于离线搜索
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [isCached, setIsCached] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [preloadingAll, setPreloadingAll] = useState(false);
  const [preloadingProgress, setPreloadingProgress] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const apiUrl = MobileApiService.getBaseUrl();

  const filterSalesOffline = (data: any[], search: string) => {
    if (!search.trim()) return data;
    const searchLower = search.toLowerCase();
    return data.filter(sale => {
      const buyerName = sale.buyer?.name?.toLowerCase() || '';
      const invoiceNo = sale.invoiceNo?.toLowerCase() || '';
      const id = sale.id?.toLowerCase() || '';
      const remark = sale.remark?.toLowerCase() || '';
      return buyerName.includes(searchLower) || invoiceNo.includes(searchLower) || id.includes(searchLower) || remark.includes(searchLower);
    });
  };

  const loadData = useCallback(async (pageNum = 1, append = false, search = '') => {
    if (!apiUrl) {
      setError('请先在"待拍照"页面设置 API 地址');
      setLoading(false);
      return;
    }

    // 如果离线，直接在本地数据中搜索
    const isOffline = !MobileApiService.isOnline();
    if (isOffline) {
      try {
        if (pageNum === 1) {
          setLoading(true);
        }
        
        // 如果是加载更多（append=true），直接返回，不做任何操作
        if (append) {
          setLoadingMore(false);
          return;
        }
        
        console.log('Offline mode - loading all data');
        
        // 优先使用本地保存的 allSales
        if (allSales.length > 0) {
          console.log('Using local allSales:', allSales.length);
          const filteredSales = filterSalesOffline(allSales, search);
          setSales(filteredSales);
          setTotal(filteredSales.length);
          setHasMore(false);
          setIsCached(true);
          setError('显示缓存数据，请连接 WiFi 查看最新');
        } else {
          // 否则从API获取所有数据（1000条/页）
          console.log('Fetching all from cache API');
          const res = await MobileApiService.getSales(1, 1000, search);
          if (res.success) {
            const newData = res.data || [];
            console.log('Got from cache:', newData.length);
            setSales(newData);
            setAllSales(newData);
            setPage(1);
            setTotal(res.total || newData.length);
            setHasMore(false);
            setIsCached(true);
            // 保存更新时间
            if (res.timestamp) {
              setLastUpdated(res.timestamp);
            } else {
              const cachedTimestamp = MobileApiService.getCacheTimestamp(`/api/sales?page=1&pageSize=1000`);
              if (cachedTimestamp) setLastUpdated(cachedTimestamp);
            }
          } else {
            setError(res.error || '加载失败');
          }
        }
      } catch (e) {
        console.error('Offline load error:', e);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
      return;
    }

    // 在线时的正常分页加载
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      const usePageSize = pageSize;
      const res = await MobileApiService.getSales(pageNum, usePageSize, search);
      if (res.success) {
        const newData = res.data || [];
        if (append) {
          setSales(prev => [...prev, ...newData]);
        } else {
          setSales(newData);
        }
        // 保存所有数据用于离线搜索（只在第一页且无搜索时）
        if (pageNum === 1 && !search.trim()) {
          setAllSales(newData);
        }
        setPage(res.page || pageNum);
        setTotal(res.total || 0);
        setHasMore((newData.length) >= usePageSize && newData.length > 0);
        setIsCached(res.isCached || false);
        // 保存更新时间
        if (res.timestamp) {
          setLastUpdated(res.timestamp);
        } else if (res.isCached && pageNum === 1) {
          const cachedTimestamp = MobileApiService.getCacheTimestamp(`/api/sales?page=${pageNum}&pageSize=${usePageSize}`);
          if (cachedTimestamp) setLastUpdated(cachedTimestamp);
        }
        if (!res.isCached) {
          setError('');
        }
        // 自动预加载前5条详情（如果在线且不是缓存数据）
        if (!res.isCached && MobileApiService.isOnline()) {
          const saleIds = newData.map(s => s.id);
          MobileApiService.preloadSaleDetails(saleIds, 5);
        }
      } else {
        setError(res.error || '加载失败');
      }
    } catch (e) {
      setError('连接 API 失败，请检查网络');
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [apiUrl, pageSize]); // 移除allSales依赖，避免无限循环

  useEffect(() => {
    if (apiUrl) {
      loadData(1, false, searchTerm);
    } else {
      setLoading(false);
    }
  }, [apiUrl, searchTerm, loadData]);

  // 监听网络恢复事件，自动刷新数据
  useEffect(() => {
    const handleNetworkRecovered = () => {
      console.log('[Mobile Sales] 检测到网络恢复，开始刷新数据...');
      if (apiUrl) {
        loadData(1, false, searchTerm);
      }
    };

    window.addEventListener('network-recovered', handleNetworkRecovered);

    return () => {
      window.removeEventListener('network-recovered', handleNetworkRecovered);
    };
  }, [apiUrl, searchTerm, loadData]);

  // 手动下载所有离线数据
  const handleDownloadAll = async () => {
    if (!MobileApiService.isOnline()) {
      return;
    }
    setPreloadingAll(true);
    setPreloadingProgress(0);
    try {
      // 1. 先加载所有页数据
      const allSales: any[] = [];
      let currentPage = 1;
      let hasMorePages = true;
      
      while (hasMorePages) {
        const res = await MobileApiService.getSales(currentPage, 100, searchTerm);
        if (res.success && res.data) {
          allSales.push(...res.data);
          hasMorePages = res.data.length >= 100;
          currentPage++;
        } else {
          hasMorePages = false;
        }
      }
      
      // 2. 更新列表显示所有数据
      setSales(allSales);
      setTotal(allSales.length);
      setHasMore(false);
      setPage(1);
      
      // 2. 更新列表显示所有数据，并保存到 allSales
      setSales(allSales);
      setAllSales(allSales);
      setTotal(allSales.length);
      setHasMore(false);
      setPage(1);

      // 3. 预加载所有详情
      const saleIds = allSales.map(s => s.id);
      const batchSize = 5;
      for (let i = 0; i < saleIds.length; i += batchSize) {
        const batch = saleIds.slice(i, i + batchSize);
        await MobileApiService.preloadAllSaleDetails(batch);
        setPreloadingProgress(Math.min(i + batchSize, saleIds.length));
      }
    } catch (e) {
      console.error('[Mobile Sales] Preload all error:', e);
    } finally {
      setPreloadingAll(false);
      setPreloadingProgress(0);
    }
  };

  const handleSearch = () => {
    setSearchTerm(searchInput);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadData(page + 1, true, searchTerm);
    }
  };

  const totalAmount = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

  if (!apiUrl) {
    return (
      <div className="min-h-screen bg-slate-50">
        <MobilePageHeader title="销售记录" subtitle="查看销售记录（只读）" />
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
    <div className="min-h-screen bg-slate-50 pb-24">
      <MobilePageHeader
        title="销售记录"
        subtitle="查看销售记录（只读）"
        onRefresh={() => loadData(1, false, searchTerm)}
      />
      
      <div className="px-4 pt-2">
        <NetworkStatus timestamp={lastUpdated || undefined} />
      </div>

      {error && !isCached && (
        <div className="px-4 -mt-2">
          <div className="text-red-500 text-sm p-2 bg-red-50 rounded">{error}</div>
        </div>
      )}
      {isCached && (
        <div className="px-4 -mt-2">
          <div className="text-amber-600 text-sm p-2 bg-amber-50 rounded">⚠️ {error}</div>
        </div>
      )}

      <div className="px-4 pt-2 space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="搜索销售记录..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button variant="outline" onClick={handleSearch}>搜索</Button>
        </div>

        <MobileCardGrid className="grid grid-cols-2 gap-3">
          <MobileCardItem
            label="销售总额"
            value={formatCurrency(totalAmount)}
            gradient="bg-gradient-to-br from-orange-50 to-orange-100"
            icon="💰"
          />
          <MobileCardItem
            label="订单数量"
            value={`${sales.length}/${total}`}
            gradient="bg-gradient-to-br from-blue-50 to-blue-100"
            icon="📋"
          />
        </MobileCardGrid>
      </div>

      {loading ? (
        <div className="px-4 pt-2 space-y-4">
          <MobileSkeletonGrid count={2} />
          <MobileSkeletonList count={5} />
        </div>
      ) : sales.length === 0 ? (
        <MobileEmptyState message={searchTerm ? '未找到匹配的销售记录' : '暂无销售记录'} />
      ) : (
        <>
          <MobileList className="pt-4">
            <div className="flex items-center justify-between mb-2 px-4">
              <MobileSectionTitle>销售记录（{sales.length}/{total}）</MobileSectionTitle>
              {MobileApiService.isOnline() && !isCached && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadAll}
                  disabled={preloadingAll}
                  className="text-xs h-8"
                >
                  {preloadingAll ? `下载中...${preloadingProgress}/${sales.length}` : '📥 下载离线数据'}
                </Button>
              )}
            </div>
            {sales.map((sale) => (
              <SaleCard
                key={sale.id}
                sale={sale}
                onClick={() => navigate(`/mobile/sale/${sale.id}`)}
              />
            ))}
          </MobileList>

          {hasMore && (
            <div className="p-4">
              <Button
                className="w-full"
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? '加载中...' : `加载更多（${sales.length}/${total}）`}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
