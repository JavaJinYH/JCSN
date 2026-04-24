import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MobileApiService } from '@/services/MobileApiService';
import { MobilePageHeader, MobileList, MobileLoadingState, MobileSectionTitle, MobileCardGrid, MobileCardItem, MobileEmptyState } from '@/components/mobile/MobilePageHeader';
import { SaleCard } from '@/components/mobile/MobileCards';

const formatCurrency = (amount: number) => {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function MobileSales() {
  const navigate = useNavigate();
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
      const res = await MobileApiService.getSales(pageNum, pageSize, search);
      if (res.success) {
        if (append) {
          setSales(prev => [...prev, ...(res.data || [])]);
        } else {
          setSales(res.data || []);
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
        <MobileLoadingState />
      ) : sales.length === 0 ? (
        <MobileEmptyState message={searchTerm ? '未找到匹配的销售记录' : '暂无销售记录'} />
      ) : (
        <>
          <MobileList className="pt-4">
            <MobileSectionTitle>销售记录（{sales.length}/{total}）</MobileSectionTitle>
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
