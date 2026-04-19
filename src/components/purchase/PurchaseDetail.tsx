import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PhotoThumbnail } from '@/components/PhotoThumbnail';
import { formatCurrency, formatDateTime, formatProductName } from '@/lib/utils';
import { db } from '@/lib/db';
import type { Purchase, Product, Category } from '@/lib/types';
import { toast } from '@/components/Toast';

interface PurchaseWithDetails extends Purchase {
  product: Product & { category: Category };
  photos: any[];
}

interface PurchaseDetailProps {
  purchaseId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenReturn: (purchase: PurchaseWithDetails) => void;
}

export function PurchaseDetail({
  purchaseId,
  open,
  onOpenChange,
  onOpenReturn,
}: PurchaseDetailProps) {
  const [purchase, setPurchase] = useState<PurchaseWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);

  useEffect(() => {
    if (open && purchaseId) {
      loadPurchase();
    } else {
      setPurchase(null);
    }
  }, [open, purchaseId]);

  const loadPurchase = async () => {
    if (!purchaseId) return;
    setLoading(true);
    try {
      const data = await db.purchase.findUnique({
        where: { id: purchaseId },
        include: {
          product: { include: { category: true } },
          photos: true,
        },
      });
      if (data) {
        setPurchase(data as PurchaseWithDetails);
      }
    } catch (error) {
      console.error('[PurchaseDetail] 加载失败:', error);
      toast('加载进货详情失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-slate-500">加载中...</div>
        </div>
      ) : purchase ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-slate-500">进货日期</div>
              <div>{formatDateTime(purchase.purchaseDate)}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">商品名称</div>
              <div className="font-bold">{purchase.product?.name || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">商品分类</div>
              <div><Badge variant="secondary">{purchase.product?.category?.name || '-'}</Badge></div>
            </div>
            <div>
              <div className="text-sm text-slate-500">批次号</div>
              <div className="font-mono">{purchase.batchNo || '-'}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-slate-500">供应商</div>
              <div>{purchase.supplier?.name || purchase.supplierName || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">进货数量</div>
              <div className="text-lg font-bold">{purchase.quantity}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">进货单价</div>
              <div className="text-lg font-bold font-mono">{formatCurrency(purchase.unitPrice)}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-sm text-slate-500">进货总额</div>
              <div className="text-xl font-bold font-mono text-green-600">{formatCurrency(purchase.totalAmount)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-slate-500">商品规格</div>
              <div>{purchase.product?.specification || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">单位</div>
              <div>{purchase.product?.unit || '-'}</div>
            </div>
          </div>

          {purchase.photos && purchase.photos.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-700 mb-2">单据照片 ({purchase.photos.length})</h3>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {purchase.photos.map((photo: any, index: number) => (
                  <PhotoThumbnail
                    key={photo.id}
                    photo={photo}
                    onClick={() => {
                      setPhotoViewerIndex(index);
                      setPhotoViewerOpen(true);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {purchase.remark && (
            <div>
              <h3 className="font-bold text-slate-700 mb-2">备注</h3>
              <div className="bg-slate-50 p-3 rounded-lg text-slate-600">{purchase.remark}</div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                onOpenReturn(purchase);
              }}
            >
              退货
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
