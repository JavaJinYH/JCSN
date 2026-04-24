import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MobileApiService, useMobileApi, SettlementEntity } from '@/services/MobileApiService';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';

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
  const { apiUrl, setIsCached } = useMobileApi();

  const loadData = async () => {
    if (!apiUrl) {
      setError('请先在"待拍照"页面设置 API 地址');
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

  const handleViewDetail = (entityId: string) => {
    navigate(`/mobile/settlements/${entityId}`);
  };

  const totalReceivable = entities.reduce((sum, e) => sum + e.totalReceivable, 0);
  const totalRemaining = entities.reduce((sum, e) => sum + e.totalRemaining, 0);

  if (!apiUrl) {
    return (
      <div className="min-h-screen bg-slate-50">
        <MobilePageHeader title="挂账结算" subtitle="查看主体欠款情况（只读）" />
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
        title="挂账结算"
        subtitle="查看主体欠款情况（只读）"
        onRefresh={loadData}
      />
      
      <div className="p-4 space-y-4">
        {error && (
          <div className="text-sm p-2 rounded">
            <div className="text-amber-600 bg-amber-50 border border-amber-200">{error}</div>
          </div>
        )}

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

        <div className="text-sm text-slate-500 px-1">共 {entities.length} 个主体</div>

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
    </div>
  );
}
