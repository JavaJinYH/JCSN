import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { PhotoThumbnail } from '@/components/PhotoThumbnail';
import { PrintPreviewDialog } from '@/components/PrintPreviewDialog';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { SaleService } from '@/services/SaleService';
import { toast } from '@/components/Toast';

interface SaleDetailProps {
  saleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface SaleData {
  id: string;
  invoiceNo: string | null;
  writtenInvoiceNo: string | null;
  saleDate: Date;
  totalAmount: number;
  discount: number;
  paidAmount: number;
  remark: string | null;
  items: any[];
  payments: any[];
  photos?: any[];
  receivables?: any[];
  project?: { name: string };
  buyer?: { name: string; primaryPhone: string };
  payer?: { name: string; primaryPhone: string };
  introducer?: { name: string; primaryPhone: string };
  picker?: { name: string; primaryPhone: string };
  pickerName?: string | null;
  pickerPhone?: string | null;
  paymentEntity?: { name: string; entityType: string; contact?: { name: string } };
}

export function SaleDetail({
  saleId,
  open,
  onOpenChange,
  onSuccess,
}: SaleDetailProps) {
  const [sale, setSale] = useState<SaleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);

  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnItemIndex, setReturnItemIndex] = useState(0);
  const [returnQuantity, setReturnQuantity] = useState('');
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [loadedPhotos, setLoadedPhotos] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && saleId) {
      loadSale();
    } else if (!open) {
      setSale(null);
    }
  }, [open, saleId]);

  const loadSale = async () => {
    if (!saleId) return;
    setLoading(true);
    try {
      const saleData = await SaleService.getSaleOrderById(saleId);

      if (saleData) {
        setSale(saleData);
      }
    } catch (error: any) {
      console.error('[SaleDetail] 加载失败:', error);
      toast(`加载销售详情失败: ${error?.message || '未知错误'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sale?.photos || sale.photos.length === 0) return;

    const loadPhotos = async () => {
      const newLoadedPhotos: Record<string, string> = {};
      for (const photo of sale.photos) {
        if (!loadedPhotos[photo.photoPath]) {
          try {
            const result = await (window as any).electronAPI.photo.read(photo.photoPath);
            if (result.success && result.data?.dataUrl) {
              newLoadedPhotos[photo.photoPath] = result.data.dataUrl;
            }
          } catch (error) {
            console.error('[SaleDetail] 加载照片失败:', photo.photoPath, error);
          }
        }
      }
      if (Object.keys(newLoadedPhotos).length > 0) {
        setLoadedPhotos(prev => ({ ...prev, ...newLoadedPhotos }));
      }
    };

    loadPhotos();
  }, [sale?.photos]);

  const handleOpenReturnDialog = (itemIndex: number) => {
    setReturnItemIndex(itemIndex);
    setReturnQuantity('');
    setReturnDialogOpen(true);
  };

  const handleReturnConfirm = async () => {
    if (!sale || !returnQuantity) {
      toast('请填写退货数量', 'warning');
      return;
    }

    const item = sale.items[returnItemIndex];
    if (!item) return;

    const qty = parseFloat(returnQuantity);
    if (qty <= 0 || qty > item.quantity) {
      toast('退货数量必须大于0且不超过购买数量', 'warning');
      return;
    }

    try {
      await SaleService.createSaleReturn(sale.id, [
        { productId: item.productId, quantity: qty, unitPrice: item.unitPrice }
      ]);

      setReturnDialogOpen(false);
      onOpenChange(false);
      onSuccess();
      toast('退货记录创建成功！', 'success');
    } catch (error) {
      console.error('[SaleDetail] 创建退货失败:', error);
      toast('退货失败，请重试', 'error');
    }
  };

  if (!open) return null;

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-slate-500">加载中...</div>
        </div>
      ) : sale ? (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">销售详情</h2>
            <Button onClick={() => setPrintDialogOpen(true)} variant="outline">
              🖨️ 打印销售单
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-slate-500">单据号</div>
              <div className="font-mono font-bold">{sale.invoiceNo || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">手写单号</div>
              <div className="font-mono">{sale.writtenInvoiceNo || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">销售日期</div>
              <div>{formatDateTime(sale.saleDate)}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">关联项目</div>
              <div>{sale.project?.name || '-'}</div>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-bold text-slate-700 mb-3">四角色信息（联系人）</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-slate-500 mb-1">购货人（业主）</div>
                <div className="font-medium">
                  {sale.buyer?.name || '散客'}
                </div>
                <div className="text-xs text-slate-500">
                  {sale.buyer?.primaryPhone || '-'}
                </div>
              </div>

              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-sm text-slate-500 mb-1">挂靠主体（付款人）</div>
                {sale.paymentEntity ? (
                  <>
                    <div className="font-medium">{sale.paymentEntity.name}</div>
                    {sale.paymentEntity.entityType && (
                      <div className="text-xs text-slate-500">{sale.paymentEntity.entityType}</div>
                    )}
                  </>
                ) : (
                  <div className="text-slate-400">无</div>
                )}
              </div>

              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-sm text-slate-500 mb-1">介绍人（水电工）</div>
                {sale.introducer ? (
                  <>
                    <div className="font-medium">{sale.introducer.name}</div>
                    <div className="text-xs text-slate-500">{sale.introducer.primaryPhone}</div>
                  </>
                ) : (
                  <div className="text-slate-400">无</div>
                )}
              </div>

              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="text-sm text-slate-500 mb-1">提货人</div>
                {sale.picker ? (
                  <>
                    <div className="font-medium">{sale.picker.name}</div>
                    <div className="text-xs text-slate-500">{sale.picker.primaryPhone}</div>
                  </>
                ) : (
                  <div className="text-slate-400">无</div>
                )}
              </div>
            </div>
          </div>

          {sale.paymentEntity && (
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
              <h3 className="font-bold text-indigo-700 mb-2">挂靠主体信息</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-indigo-600">主体名称</div>
                  <div className="font-medium">{sale.paymentEntity.name}</div>
                </div>
                <div>
                  <div className="text-sm text-indigo-600">主体类型</div>
                  <div className="font-medium">
                    {sale.paymentEntity.entityType === 'personal' ? '个人' :
                     sale.paymentEntity.entityType === 'company' ? '公司' : '政府'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-indigo-600">关联人员</div>
                  <div className="font-medium">{sale.paymentEntity.contact?.name || '-'}</div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 p-3 rounded-lg">
              <div className="text-sm text-slate-500">商品金额</div>
              <div className="text-lg font-bold font-mono">{formatCurrency(sale.totalAmount)}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-sm text-slate-500">优惠</div>
              <div className="text-lg font-bold font-mono text-green-600">{formatCurrency(sale.discount)}</div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="text-sm text-slate-500">实付金额</div>
              <div className="text-lg font-bold font-mono text-orange-600">{formatCurrency(sale.paidAmount)}</div>
            </div>
          </div>

          {sale.receivables && sale.receivables.length > 0 && (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h3 className="font-bold text-red-700 mb-2">欠款状态</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {sale.receivables.map((ar: any) => (
                  <div key={ar.id}>
                    <div className="text-sm text-red-600">欠款金额</div>
                    <div className="text-lg font-bold text-red-700">{formatCurrency(ar.remainingAmount)}</div>
                    <div className="text-xs text-red-600">
                      {ar.isOverdue ? `已逾期${ar.overdueDays}天` : '正常'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="font-bold text-slate-700 mb-2">商品明细</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>商品名称</TableHead>
                  <TableHead className="text-right">规格</TableHead>
                  <TableHead className="text-right">单位</TableHead>
                  <TableHead className="text-right">单价</TableHead>
                  <TableHead className="text-right">数量</TableHead>
                  <TableHead className="text-right">小计</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.items?.map((item: any, index: number) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.product?.name || '-'}</TableCell>
                    <TableCell className="text-right">{item.product?.specification || '-'}</TableCell>
                    <TableCell className="text-right">{item.product?.unit || '-'}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(item.subtotal)}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleOpenReturnDialog(index)}>
                        退货
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {sale.payments?.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-700 mb-2">付款记录</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>付款方式</TableHead>
                    <TableHead className="text-right">付款人</TableHead>
                    <TableHead className="text-right">金额</TableHead>
                    <TableHead className="text-right">付款时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sale.payments.map((payment: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell><Badge variant="outline">{payment.method}</Badge></TableCell>
                      <TableCell className="text-right">
                        {payment.payerName || payment.thirdPartyName || '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {payment.paidAt ? formatDateTime(payment.paidAt) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {sale.remark && (
            <div>
              <h3 className="font-bold text-slate-700 mb-2">备注</h3>
              <div className="bg-slate-50 p-3 rounded-lg text-slate-600">{sale.remark}</div>
            </div>
          )}

          {sale.photos && sale.photos.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-700 mb-2">单据照片 ({sale.photos.length})</h3>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {sale.photos.map((photo: any, index: number) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square cursor-pointer overflow-hidden rounded-lg border border-slate-200 hover:border-slate-400 transition-colors"
                    onClick={() => {
                      setPhotoViewerIndex(index);
                      setPhotoViewerOpen(true);
                    }}
                  >
                    <img
                      src={loadedPhotos[photo.photoPath] || photo.photoPath}
                      alt={`照片 ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f0f0f0" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999">图片加载失败</text></svg>';
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}

      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>销售退货</DialogTitle>
          </DialogHeader>
          {sale && sale.items[returnItemIndex] && (
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                <div className="text-sm text-slate-500">商品名称</div>
                <div className="font-bold">{sale.items[returnItemIndex].product?.name}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-500">原购买数量</div>
                  <div className="font-bold">{sale.items[returnItemIndex].quantity}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">购买单价</div>
                  <div className="font-bold font-mono">
                    {formatCurrency(sale.items[returnItemIndex].unitPrice)}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  退货数量 <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  value={returnQuantity}
                  onChange={(e) => setReturnQuantity(e.target.value)}
                  placeholder="0"
                  min="1"
                  max={sale.items[returnItemIndex].quantity}
                />
                <div className="text-xs text-slate-500 mt-1">
                  最多可退: {sale.items[returnItemIndex].quantity}
                </div>
              </div>

              {returnQuantity && (
                <div className="bg-orange-50 p-3 rounded-lg">
                  <div className="text-sm text-slate-500">退货金额</div>
                  <div className="text-xl font-bold text-orange-600">
                    {formatCurrency(parseFloat(returnQuantity) * sale.items[returnItemIndex].unitPrice)}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>取消</Button>
            <Button onClick={handleReturnConfirm}>确认退货</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PrintPreviewDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        slipData={sale}
        slipType="sale"
      />
    </div>
  );
}
