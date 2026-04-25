import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MobileApiService } from '@/services/MobileApiService';
import { MobilePageHeader, MobileSectionTitle, MobileEmptyState } from '@/components/mobile/MobilePageHeader';
import { NetworkStatus } from '@/components/mobile/NetworkStatus';
import { MobileSkeletonList, MobileSkeletonGrid } from '@/components/mobile/MobileSkeleton';

const formatCurrency = (amount: number | null | undefined) => {
  if (amount == null) return '¥--';
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getEntityTypeLabel = (type: string) => {
  switch (type) {
    case 'company': return '装修/建材公司';
    case 'contractor': return '包工头/水电工';
    case 'personal': return '个人/业主';
    case 'government': return '政府/单位';
    default: return type;
  }
};

export function MobileSettlements() {
  const navigate = useNavigate();
  const [allSettlements, setAllSettlements] = useState<any[]>([]); // 保存所有数据，用于离线搜索
  const [settlements, setSettlements] = useState<any[]>([]);
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

  const filterSettlementsOffline = (data: any[], search: string) => {
    if (!search.trim()) return data;
    const searchLower = search.toLowerCase();
    return data.filter(settlement => {
      const name = settlement.name?.toLowerCase() || '';
      const contactName = settlement.contactName?.toLowerCase() || '';
      const contactPhone = settlement.contactPhone?.toLowerCase() || '';
      const id = settlement.id?.toLowerCase() || '';
      return name.includes(searchLower) || contactName.includes(searchLower) || contactPhone.includes(searchLower) || id.includes(searchLower);
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
        
        // 优先使用本地保存的 allSettlements
        if (allSettlements.length > 0) {
          console.log('Using local allSettlements:', allSettlements.length);
          const filteredSettlements = filterSettlementsOffline(allSettlements, search);
          setSettlements(filteredSettlements);
          setTotal(filteredSettlements.length);
          setHasMore(false);
          setIsCached(true);
          setError('显示缓存数据，请连接 WiFi 查看最新');
        } else {
          // 否则从API获取所有数据（1000条/页）
          console.log('Fetching all from cache API');
          const res = await MobileApiService.getSettlements(1, 1000, search);
          if (res.success) {
            const newData = res.data || [];
            console.log('Got from cache:', newData.length);
            setSettlements(newData);
            setAllSettlements(newData);
            setPage(1);
            setTotal(res.total || newData.length);
            setHasMore(false);
            setIsCached(true);
            // 保存更新时间
            if (res.timestamp) {
              setLastUpdated(res.timestamp);
            } else {
              const cachedTimestamp = MobileApiService.getCacheTimestamp(`/api/settlements?page=1&pageSize=1000`);
              if (cachedTimestamp) setLastUpdated(cachedTimestamp);
            }
            setError('显示缓存数据，请连接 WiFi 查看最新');
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
      const res = await MobileApiService.getSettlements(pageNum, usePageSize, search);
      if (res.success) {
        const newData = res.data || [];
        if (append) {
          setSettlements(prev => [...prev, ...newData]);
        } else {
          setSettlements(newData);
        }
        // 保存所有数据用于离线搜索（只在第一页且无搜索时）
        if (pageNum === 1 && !search.trim()) {
          setAllSettlements(newData);
        }
        setPage(res.page || pageNum);
        setTotal(res.total || 0);
        setHasMore((newData.length) >= usePageSize && newData.length > 0);
        setIsCached(res.isCached || false);
        // 保存更新时间
        if (res.timestamp) {
          setLastUpdated(res.timestamp);
        } else if (res.isCached && pageNum === 1) {
          const cachedTimestamp = MobileApiService.getCacheTimestamp(`/api/settlements?page=${pageNum}&pageSize=${usePageSize}`);
          if (cachedTimestamp) setLastUpdated(cachedTimestamp);
        }
        if (res.isCached) {
          setError('显示缓存数据，请连接 WiFi 查看最新');
        } else {
          setError('');
        }
        // 自动预加载前5条详情（如果在线且不是缓存数据）
        if (!res.isCached && MobileApiService.isOnline()) {
          const settlementIds = newData.map(s => s.id);
          MobileApiService.preloadSettlementDetails(settlementIds, 5);
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
  }, [apiUrl, pageSize]); // 移除allSettlements依赖，避免无限循环

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
      console.log('[Mobile Settlements] 检测到网络恢复，开始刷新数据...');
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
      const allSettlements: any[] = [];
      let currentPage = 1;
      let hasMorePages = true;
      
      while (hasMorePages) {
        const res = await MobileApiService.getSettlements(currentPage, 100, searchTerm);
        if (res.success && res.data) {
          allSettlements.push(...res.data);
          hasMorePages = res.data.length >= 100;
          currentPage++;
        } else {
          hasMorePages = false;
        }
      }
      
      // 2. 更新列表显示所有数据
      setSettlements(allSettlements);
      setTotal(allSettlements.length);
      setHasMore(false);
      setPage(1);
      
      // 2. 更新列表显示所有数据，并保存到 allSettlements
      setSettlements(allSettlements);
      setAllSettlements(allSettlements);
      setTotal(allSettlements.length);
      setHasMore(false);
      setPage(1);

      // 3. 预加载所有详情
      const settlementIds = allSettlements.map(s => s.id);
      const batchSize = 5;
      for (let i = 0; i < settlementIds.length; i += batchSize) {
        const batch = settlementIds.slice(i, i + batchSize);
        await MobileApiService.preloadAllSettlementDetails(batch);
        setPreloadingProgress(Math.min(i + batchSize, settlementIds.length));
      }
    } catch (e) {
      console.error('[Mobile Settlements] Preload all error:', e);
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

  const totalAmount = settlements.reduce((sum, s) => sum + (s.totalRemaining || 0), 0);

  if (!apiUrl) {
    return (
      <div className="min-h-screen bg-slate-50">
        <MobilePageHeader title="挂账管理" subtitle="查看挂账主体（只读）" />
        <div className="p-4 space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-3">📱 请先设置 API</h3>
            <p className="text-xs text-blue-700 mb-3">请先在"待拍照"页面设置 API 地址，才能查看数据</p>
            <Button className="w-full" onClick={() => navigate('/mobile/pending-documents')}>
              去设置
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <MobilePageHeader
        title="挂账管理"
        subtitle="查看挂账主体（只读）"
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
            placeholder="搜索挂账主体..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button variant="outline" onClick={handleSearch}>搜索</Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-slate-50">
            <CardContent className="pt-4">
              <div className="text-xs text-slate-500">挂账主体</div>
              <div className="text-xl font-bold text-slate-800">{settlements.length}/{total}</div>
            </CardContent>
          </Card>
          <Card className="bg-orange-50">
            <CardContent className="pt-4">
              <div className="text-xs text-orange-600">总欠款</div>
              <div className="text-xl font-bold text-orange-700">{formatCurrency(totalAmount)}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {loading ? (
        <div className="px-4 pt-2 space-y-4">
          <MobileSkeletonGrid count={2} />
          <MobileSkeletonList count={5} />
        </div>
      ) : settlements.length === 0 ? (
        <MobileEmptyState message={searchTerm ? '未找到匹配的挂账主体' : '暂无挂账记录'} />
      ) : (
        <>
          <div className="px-4 pt-4">
            <div className="flex items-center justify-between mb-2">
              <MobileSectionTitle>挂账主体（{settlements.length}/{total}）</MobileSectionTitle>
              {MobileApiService.isOnline() && !isCached && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadAll}
                  disabled={preloadingAll}
                  className="text-xs h-8"
                >
                  {preloadingAll ? `下载中...${preloadingProgress}/${settlements.length}` : '📥 下载离线数据'}
                </Button>
              )}
            </div>
          </div>

          <div className="px-4 space-y-3">
            {settlements.map((settlement) => (
              <Card
            key={settlement.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/mobile/settlements/${settlement.id}`)}
          >
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-lg">{settlement.name}</div>
                        <div className="text-sm text-slate-500">
                          {settlement.contactName} · {settlement.contactPhone}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-orange-600">
                          {formatCurrency(settlement.totalRemaining)}
                        </div>
                        <div className="text-xs text-slate-400">欠款</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-slate-100 text-slate-700">
                        {settlement.orderCount} 笔订单
                      </Badge>
                      {settlement.outstandingCount > 0 && (
                        <Badge className="bg-red-100 text-red-700">
                          {settlement.outstandingCount} 笔未结
                        </Badge>
                      )}
                      {settlement.entityType && (
                        <Badge variant="outline">{getEntityTypeLabel(settlement.entityType)}</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {hasMore && (
            <div className="p-4">
              <Button
                className="w-full"
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? '加载中...' : `加载更多（${settlements.length}/${total}）`}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
