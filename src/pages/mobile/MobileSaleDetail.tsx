import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MobileApiService } from '@/services/MobileApiService';
import { MobilePageHeader, MobileList, MobileLoadingState, MobileSectionTitle } from '@/components/mobile/MobilePageHeader';
import { SaleCard } from '@/components/mobile/MobileCards';

const formatCurrency = (amount: number) => {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function MobileSaleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCached, setIsCached] = useState(false);

  const loadData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const res = await MobileApiService.getSaleById(id);
      if (res.success) {
        setSale(res.data);
        setIsCached(res.isCached || false);
      } else {
        setError(res.error || '加载失败');
      }
    } catch (e) {
      setError('连接 API 失败');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div>
        <MobilePageHeader title="销售详情" />
        <MobileLoadingState />
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div>
        <MobilePageHeader title="销售详情" />
        <div className="p-4 text-center text-red-500">{error || '未找到数据'}</div>
      </div>
    );
  }

  const remaining = (sale.totalAmount || 0) - (sale.paidAmount || 0);

  return (
    <div className="pb-20">
      <MobilePageHeader
        title="销售详情"
        subtitle={sale.invoiceNo || sale.id.substring(0, 8)}
        isCached={isCached}
        onRefresh={loadData}
      />

      <MobileList>
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold text-lg">{sale.buyer?.name || '散客'}</div>
                <div className="text-sm text-slate-500">
                  {new Date(sale.saleDate).toLocaleString('zh-CN')}
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
              {sale.isPrinted && (
                <Badge className="bg-blue-100 text-blue-700">已打印</Badge>
              )}
            </div>

            {sale.note && (
              <div className="text-sm text-slate-600 p-2 bg-slate-50 rounded">
                备注：{sale.note}
              </div>
            )}
          </CardContent>
        </Card>

        {sale.items && sale.items.length > 0 && (
          <>
            <MobileSectionTitle>商品明细</MobileSectionTitle>
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {sale.items.map((item: any, index: number) => (
                    <div key={item.id || index} className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium">{item.product?.name || '商品'}</div>
                        <div className="text-sm text-slate-500">
                          {item.quantity} × {formatCurrency(item.unitPrice || 0)}
                        </div>
                      </div>
                      <div className="font-bold text-orange-600">
                        {formatCurrency(item.subtotal || 0)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

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
      </MobileList>

      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t">
        <Button variant="outline" className="w-full" onClick={() => navigate(-1)}>
          返回列表
        </Button>
      </div>
    </div>
  );
}
