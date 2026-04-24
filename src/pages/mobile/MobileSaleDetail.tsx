import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MobileApiService } from '@/services/MobileApiService';
import { MobilePageHeader, MobileLoadingState, MobileEmptyState, MobileSectionTitle } from '@/components/mobile/MobilePageHeader';

const formatCurrency = (amount: number) => {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function MobileSaleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [apiUrl, setApiUrl] = useState(MobileApiService.getBaseUrl() || '');
  const [isCached, setIsCached] = useState(false);

  const loadData = async () => {
    if (!apiUrl || !id) {
      setError('请先设置 API 地址');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await MobileApiService.getSaleById(id);
      if (res.success) {
        setSale(res.data);
        setIsCached(res.isCached || false);
        if (res.isCached) {
          setError('显示缓存数据，请连接WiFi查看最新');
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
    if (apiUrl && id) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [apiUrl, id]);

  const handleSaveApiUrl = () => {
    MobileApiService.setBaseUrl(apiUrl);
    loadData();
  };

  const isOnline = MobileApiService.isOnline();

  if (!apiUrl) {
    return (
      <div className="space-y-6 p-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">销售详情</h2>
          <p className="text-slate-500 text-sm mt-1">查看销售记录（只读）</p>
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

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            ← 返回
          </Button>
        </div>
        <MobileLoadingState />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            ← 返回
          </Button>
        </div>
        <MobileEmptyState message="销售单不存在" />
      </div>
    );
  }

  const remaining = (sale.totalAmount || 0) - (sale.paidAmount || 0);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            ← 返回
          </Button>
          <h2 className="text-xl font-bold text-slate-800">销售详情</h2>
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

      {/* 基本信息卡片 */}
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold text-lg">{sale.buyer?.name || '散客'}</div>
                <div className="text-sm text-slate-500">
                  {new Date(sale.saleDate).toLocaleDateString('zh-CN')}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(sale.totalAmount || 0)}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {sale.paidAmount > 0 && (
                <Badge className="bg-green-100 text-green-700">
                  已付 {formatCurrency(sale.paidAmount)}
                </Badge>
              )}
              {remaining > 0 && (
                <Badge className="bg-amber-100 text-amber-700">
                  待收 {formatCurrency(remaining)}
                </Badge>
              )}
              {sale.projectName && (
                <Badge className="bg-blue-100 text-blue-700">
                  {sale.projectName}
                </Badge>
              )}
            </div>

            {sale.remark && (
              <div className="text-sm text-slate-600 p-2 bg-slate-50 rounded">
                备注：{sale.remark}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={loadData}>
          🔄 刷新
        </Button>
      </div>

      {/* 商品明细 */}
      <MobileSectionTitle>商品明细</MobileSectionTitle>
      <Card>
        <CardContent className="pt-4">
          {!sale.items || sale.items.length === 0 ? (
            <div className="text-center py-4 text-slate-500">
              暂无商品
            </div>
          ) : (
            <div className="space-y-3">
              {sale.items.map((item: any, index: number) => (
                <div key={item.id || index} className="flex justify-between items-start border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                  <div className="flex-1">
                    <div className="font-medium">{item.product?.name || '商品'}</div>
                    {item.product?.specification && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        规格：{item.product.specification}
                      </div>
                    )}
                    <div className="text-sm text-slate-500 mt-1">
                      {item.quantity} × {formatCurrency(item.unitPrice || 0)}
                    </div>
                  </div>
                  <div className="font-bold text-orange-600">
                    {formatCurrency(item.subtotal || 0)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 照片区域 */}
      {sale.photos && sale.photos.length > 0 && (
        <>
          <MobileSectionTitle>照片 ({sale.photos.length})</MobileSectionTitle>
          <div className="grid grid-cols-3 gap-2">
            {sale.photos.map((photo: any) => (
              <div key={photo.id} className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center text-2xl">
                📷
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
