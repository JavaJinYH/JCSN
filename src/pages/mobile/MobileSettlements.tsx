import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MobileApiService, SettlementEntity } from '@/services/MobileApiService';

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

export function MobileSettlements() {
  const navigate = useNavigate();
  const [entities, setEntities] = useState<SettlementEntity[]>([]);
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
      const data = await MobileApiService.getSettlements();
      if (data.success) {
        setEntities(data.data || []);
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

  const handleViewDetail = (entityId: string) => {
    navigate(`/mobile/settlements/${entityId}`);
  };

  const isOnline = MobileApiService.isOnline();

  const totalReceivable = entities.reduce((sum, e) => sum + e.totalReceivable, 0);
  const totalRemaining = entities.reduce((sum, e) => sum + e.totalRemaining, 0);

  if (!apiUrl) {
    return (
      <div className="space-y-6 p-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">挂账结算</h2>
          <p className="text-slate-500 text-sm mt-1">查看主体欠款情况（只读）</p>
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

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">挂账结算</h2>
          <p className="text-slate-500 text-sm">查看主体欠款情况（只读）</p>
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
            <div className="text-xs text-slate-500">应收账款总额</div>
            <div className="text-lg font-bold text-slate-900">{formatCurrency(totalReceivable)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-slate-500">待回收金额</div>
            <div className="text-lg font-bold text-orange-600">{formatCurrency(totalRemaining)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={loadData}>
          🔄 刷新
        </Button>
      </div>

      <div className="text-sm text-slate-500">共 {entities.length} 个主体</div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-500">加载中...</div>
        </div>
      ) : entities.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-slate-500">
            暂无挂账主体
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entities.map((entity) => (
            <Card key={entity.id} className="overflow-hidden">
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-lg">{entity.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {getEntityTypeBadge(entity.entityType)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-500">待收</div>
                      <div className="text-xl font-bold text-orange-600">
                        {formatCurrency(entity.totalRemaining)}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-slate-600">
                    {entity.contactName}
                    {entity.contactPhone && ` ${entity.contactPhone}`}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="bg-slate-50 p-2 rounded">
                      <div className="text-xs text-slate-500">应付总额</div>
                      <div className="font-mono">{formatCurrency(entity.totalReceivable)}</div>
                    </div>
                    <div className="bg-green-50 p-2 rounded">
                      <div className="text-xs text-slate-500">已付金额</div>
                      <div className="font-mono text-green-600">{formatCurrency(entity.totalPaid)}</div>
                    </div>
                    <div className="bg-orange-50 p-2 rounded">
                      <div className="text-xs text-slate-500">欠款笔数</div>
                      <div className="font-mono">{entity.outstandingCount}</div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleViewDetail(entity.id)}
                  >
                    查看详情
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
