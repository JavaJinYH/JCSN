import { useState, useEffect, useCallback } from 'react';
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

export function MobileCollections() {
  const [collections, setCollections] = useState<any[]>([]);
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
      const res = await MobileApiService.getCollections(pageNum, pageSize, search);
      if (res.success) {
        if (append) {
          setCollections(prev => [...prev, ...(res.data || [])]);
        } else {
          setCollections(res.data || []);
        }
        setPage(res.page || pageNum);
        setTotal(res.total || 0);
        setHasMore((res.data?.length || 0) >= pageSize && (res.data?.length || 0) > 0);
        setIsCached(res.isCached || false);
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

  const totalAmount = collections.reduce((sum, c) => sum + (c.collectionAmount || 0), 0);

  if (!apiUrl) {
    return (
      <div className="min-h-screen bg-slate-50">
        <MobilePageHeader title="催账记录" subtitle="查看催账记录（只读）" />
        <div className="p-4 space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-3">📱 请先设置 API</h3>
            <p className="text-xs text-blue-700 mb-3">请先在"待拍照"页面设置 API 地址，才能查看数据</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <MobilePageHeader
        title="催账记录"
        subtitle="查看催账记录（只读）"
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
            placeholder="搜索催账记录..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button variant="outline" onClick={handleSearch}>搜索</Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-slate-50">
            <CardContent className="pt-4">
              <div className="text-xs text-slate-500">催账记录</div>
              <div className="text-xl font-bold text-slate-800">{collections.length}/{total}</div>
            </CardContent>
          </Card>
          <Card className="bg-green-50">
            <CardContent className="pt-4">
              <div className="text-xs text-green-600">催回金额</div>
              <div className="text-xl font-bold text-green-700">{formatCurrency(totalAmount)}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {loading ? (
        <MobileLoadingState />
      ) : collections.length === 0 ? (
        <MobileEmptyState message={searchTerm ? '未找到匹配的催账记录' : '暂无催账记录'} />
      ) : (
        <>
          <div className="px-4 pt-4">
            <MobileSectionTitle>催账记录（{collections.length}/{total}）</MobileSectionTitle>
          </div>

          <div className="px-4 space-y-3">
            {collections.map((record) => (
              <Card key={record.id}>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold">{record.entityName}</div>
                        <div className="text-sm text-slate-500">
                          {record.collectionDate ? new Date(record.collectionDate).toLocaleDateString('zh-CN') : '-'}
                          {record.collectionTime && ` ${record.collectionTime}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          {record.collectionAmount != null ? formatCurrency(record.collectionAmount) : '-'}
                        </div>
                        {record.collectionMethod && (
                          <Badge variant="outline" className="text-xs">{record.collectionMethod}</Badge>
                        )}
                      </div>
                    </div>

                    {record.communication && (
                      <div className="text-sm text-slate-600 bg-slate-50 p-2 rounded">
                        沟通内容：{record.communication}
                      </div>
                    )}

                    {record.nextPlan && (
                      <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                        下一步计划：{record.nextPlan}
                        {record.followUpDate && (
                          <span className="ml-2">（{new Date(record.followUpDate).toLocaleDateString('zh-CN')}）</span>
                        )}
                      </div>
                    )}

                    {record.remark && (
                      <div className="text-sm text-slate-500">
                        备注：{record.remark}
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {record.collectionResult && (
                        <Badge className="bg-green-100 text-green-700">{record.collectionResult}</Badge>
                      )}
                      {record.attitude && (
                        <Badge variant="outline">{record.attitude}</Badge>
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
                {loadingMore ? '加载中...' : `加载更多（${collections.length}/${total}）`}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
