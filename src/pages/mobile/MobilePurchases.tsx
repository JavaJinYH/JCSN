import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MobileApiService } from '@/services/MobileApiService';
import { MobilePageHeader, MobileList, MobileLoadingState, MobileSectionTitle, MobileCardGrid, MobileCardItem, MobileEmptyState } from '@/components/mobile/MobilePageHeader';
import { PurchaseCard } from '@/components/mobile/MobileCards';

const formatCurrency = (amount: number) => {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function MobilePurchases() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCached, setIsCached] = useState(false);
  const apiUrl = MobileApiService.getBaseUrl();

  const loadData = async () => {
    if (!apiUrl) {
      setError('请先在"待拍照"页面设置 API 地址');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await MobileApiService.getPurchases();
      if (res.success) {
        setPurchases(res.data || []);
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
  }, []);

  const isOnline = MobileApiService.isOnline();
  const totalAmount = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);

  if (!apiUrl) {
    return (
      <div className="min-h-screen bg-slate-50">
        <MobilePageHeader title="进货记录" subtitle="查看进货记录（只读）" />
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
        title="进货记录"
        subtitle="查看进货记录（只读）"
        onRefresh={loadData}
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

      <MobileCardGrid className="px-4 pt-2">
        <MobileCardItem
          label="进货总额"
          value={formatCurrency(totalAmount)}
          gradient="bg-gradient-to-br from-blue-50 to-blue-100"
          icon="📥"
        />
        <MobileCardItem
          label="订单数量"
          value={purchases.length}
          gradient="bg-gradient-to-br from-purple-50 to-purple-100"
          icon="📋"
        />
      </MobileCardGrid>

      {loading ? (
        <MobileLoadingState />
      ) : purchases.length === 0 ? (
        <MobileEmptyState message="暂无进货记录" />
      ) : (
        <MobileList className="pt-4">
          <MobileSectionTitle>进货记录（点击查看详情）</MobileSectionTitle>
          {purchases.map((purchase) => (
            <PurchaseCard
              key={purchase.id}
              purchase={purchase}
              onClick={() => navigate(`/mobile/purchase/${purchase.id}`)}
            />
          ))}
        </MobileList>
      )}
    </div>
  );
}
