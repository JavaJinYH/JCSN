import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  }, [apiUrl]);

  const handleSaveApiUrl = () => {
    MobileApiService.setBaseUrl(apiUrl);
    loadData();
  };

  const isOnline = MobileApiService.isOnline();
  const totalAmount = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);

  if (!apiUrl) {
    return (
      <div className="min-h-screen bg-slate-50">
        <MobilePageHeader title="进货记录" subtitle="查看进货记录（只读）" />
        <div className="p-4 space-y-3">
          <div className="text-sm text-slate-600">请输入主电脑的局域网地址</div>
          <input
            type="text"
            placeholder="例如: http://192.168.1.100:3456"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm"
          />
          <button
            onClick={handleSaveApiUrl}
            className="w-full py-2.5 bg-blue-500 text-white rounded-lg font-medium"
          >
            保存
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <MobilePageHeader
        title="进货记录"
        subtitle="查看进货记录（只读）"
        isOnline={isOnline}
        isCached={isCached}
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
