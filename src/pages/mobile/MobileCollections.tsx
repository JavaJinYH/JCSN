import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MobileApiService, useMobileApi, CollectionRecord } from '@/services/MobileApiService';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';

const methodTranslations: Record<string, string> = {
  'phone': '电话',
  'wechat': '微信',
  'sms': '短信',
  'visit': '上门',
  'meeting': '面谈',
  'other': '其他',
};

const resultTranslations: Record<string, string> = {
  'promised': '已承诺付款',
  'partial': '部分付款',
  'refused': '拒绝付款',
  'unreachable': '无法联系',
  'negotiating': '协商中',
};

const translateMethod = (method: string) => methodTranslations[method] || method;
const translateResult = (result: string) => resultTranslations[result] || result;

const formatCurrency = (amount: number) => {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function MobileCollections() {
  const [records, setRecords] = useState<CollectionRecord[]>([]);
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
      const data = await MobileApiService.getCollections();
      if (data.success) {
        setRecords(data.data || []);
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

  const getResultBadge = (result: string) => {
    const translated = translateResult(result);
    switch (translated) {
      case '已承诺付款':
        return <Badge className="bg-green-100 text-green-700">已承诺付款</Badge>;
      case '部分付款':
        return <Badge className="bg-blue-100 text-blue-700">部分付款</Badge>;
      case '拒绝付款':
        return <Badge className="bg-red-100 text-red-700">拒绝付款</Badge>;
      case '无法联系':
        return <Badge className="bg-slate-100 text-slate-700">无法联系</Badge>;
      default:
        return <Badge variant="outline">{translated}</Badge>;
    }
  };

  if (!apiUrl) {
    return (
      <div className="min-h-screen bg-slate-50">
        <MobilePageHeader title="催账记录" subtitle="查看催账历史（只读）" />
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
        title="催账记录"
        subtitle="查看催账历史（只读）"
        onRefresh={loadData}
      />
      
      <div className="p-4 space-y-4">
        {error && (
          <div className="text-sm p-2 rounded">
            <div className="text-amber-600 bg-amber-50 border border-amber-200">{error}</div>
          </div>
        )}

        <div className="text-sm text-slate-500 px-1">共 {records.length} 条记录</div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-500">加载中...</div>
          </div>
        ) : records.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-slate-500">
              暂无催账记录
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {records.map((record) => (
              <Card key={record.id} className="overflow-hidden">
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-lg">{record.entityName}</div>
                        <div className="text-sm text-slate-500 mt-1">
                          {new Date(record.collectionDate).toLocaleDateString('zh-CN')}
                          {record.collectionTime && ` ${record.collectionTime}`}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {getResultBadge(record.collectionResult)}
                        {record.collectionAmount && (
                          <span className="text-orange-600 font-bold text-sm">
                            {formatCurrency(record.collectionAmount)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{translateMethod(record.collectionMethod)}</Badge>
                      {record.attitude && (
                        <Badge variant="secondary">{record.attitude}</Badge>
                      )}
                    </div>

                    {record.communication && (
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <div className="text-xs text-slate-500 mb-1">沟通内容</div>
                        <div className="text-sm text-slate-700">{record.communication}</div>
                      </div>
                    )}

                    {record.nextPlan && (
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <div className="text-xs text-slate-500 mb-1">后续计划</div>
                        <div className="text-sm text-slate-700">{record.nextPlan}</div>
                      </div>
                    )}

                    {record.followUpDate && (
                      <div className="text-sm text-slate-500">
                        下次跟进: {new Date(record.followUpDate).toLocaleDateString('zh-CN')}
                        {record.followUpTime && ` ${record.followUpTime}`}
                      </div>
                    )}

                    {record.remark && (
                      <div className="text-sm text-slate-500">
                        备注: {record.remark}
                      </div>
                    )}
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
