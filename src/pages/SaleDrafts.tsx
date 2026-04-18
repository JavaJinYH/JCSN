import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { db } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/Toast';
import type { SaleSlip } from '@/lib/types';

export function SaleDrafts() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<SaleSlip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    try {
      const draftsData = await db.saleSlip.findMany({
        where: { status: 'draft' },
        include: {
          items: true,
          customer: true,
        },
        orderBy: { updatedAt: 'desc' },
      });
      setDrafts(draftsData);
    } catch (error) {
      console.error('Failed to load drafts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueEdit = (slipId: string) => {
    navigate(`/sales/draft/${slipId}`);
  };

  const handleDeleteDraft = async (slipId: string) => {
    try {
      await db.saleSlip.delete({ where: { id: slipId } });
      loadDrafts();
      toast('删除成功', 'success');
    } catch (error) {
      console.error('Failed to delete draft:', error);
      toast('删除失败，请重试', 'error');
    }
  };

  const handleSubmitDraft = async (slip: SaleSlip) => {
    try {
      setLoading(true);

      const payments = slip.payments ? JSON.parse(slip.payments) : [];
      const sale = await db.sale.create({
        data: {
          invoiceNo: `S${Date.now()}`,
          customerId: slip.customerId,
          projectId: slip.projectId,
          buyerCustomerId: slip.buyerCustomerId,
          payerCustomerId: slip.payerCustomerId,
          introducerCustomerId: slip.introducerCustomerId,
          pickerCustomerId: slip.pickerCustomerId,
          pickerName: slip.pickerName,
          pickerPhone: slip.pickerPhone,
          pickerType: slip.pickerType,
          writtenInvoiceNo: slip.writtenInvoiceNo,
          totalAmount: slip.totalAmount,
          discount: slip.discount,
          paidAmount: slip.paidAmount,
          remark: slip.remark,
          status: 'completed',
          items: {
            create: slip.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              costPriceSnapshot: 0,
              sellingPriceSnapshot: item.unitPrice,
              subtotal: item.subtotal,
            })),
          },
          payments: {
            create: payments
              .filter((p: any) => p.amount > 0)
              .map((p: any) => ({
                amount: p.amount,
                method: p.method,
                payerName: p.payerName || null,
                thirdPartyName: p.thirdPartyName || null,
                paidAt: new Date(),
              })),
          },
        },
      });

      await db.product.updateMany({
        where: {
          id: { in: slip.items.map((item) => item.productId) },
        },
        data: {
          stock: {
            decrement: 1,
          },
        },
      });

      await db.saleSlip.update({
        where: { id: slip.id },
        data: { status: 'completed' },
      });

      toast('提交成功', 'success');
      navigate('/sales');
    } catch (error) {
      console.error('Failed to submit draft:', error);
      toast('提交失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">暂存单列表</h2>
          <p className="text-slate-500 mt-1">共 {drafts.length} 个暂存单</p>
        </div>
        <Link to="/sales/new">
          <Button className="bg-orange-500 hover:bg-orange-600">+ 新增销售</Button>
        </Link>
      </div>

      {drafts.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-slate-500">
              <div className="text-4xl mb-4">📝</div>
              <div className="text-lg">暂无暂存单</div>
              <div className="text-sm mt-2">在新增销售页面可以暂存未完成的订单</div>
              <Link to="/sales/new" className="inline-block mt-4">
                <Button variant="outline">去新增销售</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>暂存时间</TableHead>
                  <TableHead>客户</TableHead>
                  <TableHead>商品数量</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drafts.map((slip) => (
                  <TableRow key={slip.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(slip.updatedAt).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>{slip.customer?.name || '散客'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{slip.items.length} 种</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-orange-600">
                      {formatCurrency(slip.totalAmount)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-slate-500">
                      {slip.remark || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleContinueEdit(slip.id)}
                        >
                          继续编辑
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleSubmitDraft(slip)}
                        >
                          提交
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteDraft(slip.id)}
                        >
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
