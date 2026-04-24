import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MobileApiService, SettlementEntityDetail } from '@/services/MobileApiService';

const formatCurrency = (amount: number) => {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getEntityTypeBadge = (type: string) => {
  switch (type) {
    case 'company':
      return <Badge className="bg-purple-500">装修/建材公司</Badge>;
    case 'contractor':
      return <Badge className="bg-orange-500">包工头/水电工</Badge>;
    case 'personal':
      return <Badge className="bg-blue-500">个人/业主</Badge>;
    case 'government':
      return <Badge className="bg-green-500">政府/单位</Badge>;
    default:
      return <Badge variant="secondary">{type}</Badge>;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case '已结清':
      return <Badge className="bg-green-500">已结清</Badge>;
    case '已逾期':
      return <Badge variant="destructive">已逾期</Badge>;
    case '部分还款':
      return <Badge variant="warning">部分还款</Badge>;
    default:
      return <Badge variant="secondary">待收款</Badge>;
  }
};

export function MobileSettlementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entity, setEntity] = useState<SettlementEntityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [apiUrl, setApiUrl] = useState(MobileApiService.getBaseUrl() || '');
  const [isCached, setIsCached] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const loadData = async () => {
    if (!apiUrl || !id) {
      setError('请先设置 API 地址');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await MobileApiService.getSettlementEntityDetail(id);
      if (data.success) {
        setEntity(data.data || null);
        setIsCached(data.isCached || false);
        if (data.isCached) {
          setError('显示缓存数据，请连接WiFi查看最新');
        } else {
          setError('');
        }
      } else {
        setError(data.error || '加载失败');
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
          <h2 className="text-xl font-bold text-slate-800">主体详情</h2>
          <p className="text-slate-500 text-sm mt-1">查看欠款明细（只读）</p>
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
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            ← 返回
          </Button>
        </div>
        <div className="text-center py-8 text-slate-500">
          主体不存在
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            ← 返回
          </Button>
          <h2 className="text-xl font-bold text-slate-800">主体详情</h2>
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

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-slate-500">应付总额</div>
            <div className="text-lg font-bold text-slate-900">{formatCurrency(entity.totalReceivable)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-slate-500">待收金额</div>
            <div className="text-lg font-bold text-orange-600">{formatCurrency(entity.totalRemaining)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-lg">{entity.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  {getEntityTypeBadge(entity.entityType)}
                </div>
              </div>
            </div>
            <div className="text-sm text-slate-600">
              {entity.contactName}
              {entity.contactPhone && ` ${entity.contactPhone}`}
            </div>
            {entity.address && (
              <div className="text-sm text-slate-500">
                地址: {entity.address}
              </div>
            )}
            <div className="text-sm text-slate-500">
              已付: {formatCurrency(entity.totalPaid)}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={loadData}>
          🔄 刷新
        </Button>
      </div>

      <div className="text-sm text-slate-500">订单列表 ({entity.orders.length})</div>

      {entity.orders.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-slate-500">
            暂无订单
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entity.orders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{order.invoiceNo}</div>
                      <div className="text-sm text-slate-500 mt-1">
                        {new Date(order.saleDate).toLocaleDateString('zh-CN')}
                      </div>
                      <div className="text-sm text-slate-500">
                        购货人: {order.buyerName}
                      </div>
                      {order.projectName && (
                        <div className="text-sm text-slate-500">
                          项目: {order.projectName}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      {getStatusBadge(order.status)}
                      <div className="text-xl font-bold text-orange-600 mt-1">
                        {formatCurrency(order.remaining)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-slate-500">
                      订单金额: {formatCurrency(order.totalAmount)}
                    </div>
                    {order.deliveryFee > 0 && (
                      <div className="text-slate-500">
                        配送费: {formatCurrency(order.deliveryFee)}
                      </div>
                    )}
                    {order.discount > 0 && (
                      <div className="text-slate-500">
                        优惠: -{formatCurrency(order.discount)}
                      </div>
                    )}
                    <div className="text-slate-500">
                      已付: {formatCurrency(order.paidAmount)}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  >
                    {expandedOrder === order.id ? '收起商品明细' : '查看商品明细'}
                  </Button>

                  {expandedOrder === order.id && order.items.length > 0 && (
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <div className="text-xs text-slate-500 mb-2">商品明细</div>
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm py-1 border-b border-slate-200 last:border-0">
                          <span>{item.productName}</span>
                          <span className="text-slate-500">
                            {item.quantity} × {formatCurrency(item.unitPrice)} = {formatCurrency(item.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
