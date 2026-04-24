import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MobileApiService } from '@/services/MobileApiService';
import { MobilePageHeader, MobileLoadingState, MobileSectionTitle, MobileEmptyState } from '@/components/mobile/MobilePageHeader';

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
  const apiUrl = MobileApiService.getBaseUrl();

  const loadData = useCallback(async (pageNum = 1, append = false, search = '') => {
    if (!apiUrl) {
      setError('请先在"待拍照"页面设置 API 地址');
      setLoading(false);
      return;
    }

    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      const res = await MobileApiService.getSettlements(pageNum, pageSize, search);
      if (res.success) {
        if (append) {
          setSettlements(prev => [...prev, ...(res.data || [])]);
        } else {
          setSettlements(res.data || []);
        }
        setPage(res.page || pageNum);
        setTotal(res.total || 0);
        setHasMore((res.data?.length || 0) >= pageSize && (res.data?.length || 0) > 0);
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
      setLoadingMore(false);
    }
  }, [apiUrl, pageSize]);

  useEffect(() => {
    if (apiUrl) {
      loadData(1, false, searchTerm);
    } else {
      setLoading(false);
    }
  }, [apiUrl, searchTerm, loadData]);

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
        <MobileLoadingState />
      ) : settlements.length === 0 ? (
        <MobileEmptyState message={searchTerm ? '未找到匹配的挂账主体' : '暂无挂账记录'} />
      ) : (
        <>
          <div className="px-4 pt-4">
            <MobileSectionTitle>挂账主体（{settlements.length}/{total}）</MobileSectionTitle>
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
