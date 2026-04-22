import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatProductName } from '@/lib/utils';
import { PurchaseService } from '@/services/PurchaseService';
import type { Product } from '@/lib/types';
import { toast } from '@/components/Toast';

interface PurchaseReturnProps {
  purchase: {
    id: string;
    orderId: string | null;
    productId: string;
    quantity: number;
    unitPrice: number;
    supplierId: string | null;
    supplierName: string | null;
    pendingReturnQty: number;
    product: Product;
  } | null;
  orderStatus: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PurchaseReturn({
  purchase,
  orderStatus,
  open,
  onOpenChange,
  onSuccess,
}: PurchaseReturnProps) {
  const [returnQuantity, setReturnQuantity] = useState('');
  const [marketPrice, setMarketPrice] = useState('');
  const [showMarketPriceDialog, setShowMarketPriceDialog] = useState(false);
  const [refundToSupplier, setRefundToSupplier] = useState(false);
  const [creating, setCreating] = useState(false);

  const availableQty = purchase ? purchase.quantity - purchase.pendingReturnQty : 0;
  const isCompleted = orderStatus === 'completed';

  const handleConfirm = async () => {
    if (!purchase || !returnQuantity) {
      toast('请填写退货数量', 'warning');
      return;
    }

    const qty = parseFloat(returnQuantity);
    if (qty <= 0 || qty > availableQty) {
      toast(`退货数量必须大于0且不超过可退数量（${availableQty}）`, 'warning');
      return;
    }

    const unitPrice = purchase.product.isPriceVolatile
      ? (marketPrice ? parseFloat(marketPrice) : null)
      : purchase.unitPrice;

    if (purchase.product.isPriceVolatile && !marketPrice) {
      setShowMarketPriceDialog(true);
      return;
    }

    await createReturn(qty, unitPrice!);
  };

  const createReturn = async (qty: number, unitPrice: number) => {
    setCreating(true);
    try {
      const result = await PurchaseService.confirmReturn(
        purchase!.id,
        purchase!.orderId,
        qty,
        unitPrice,
        purchase!.product.isPriceVolatile,
        isCompleted
      );

      toast(
        isCompleted
          ? `退货成功，已冲抵应付账款 ${formatCurrency(result.totalRefund)}元`
          : `退货成功，供应商送货人已带回货物`,
        'success'
      );

      onOpenChange(false);
      setReturnQuantity('');
      setMarketPrice('');
      onSuccess();
    } catch (error) {
      console.error('Failed to create return:', error);
      toast('操作失败，请重试', 'error');
    } finally {
      setCreating(false);
    }
  };

  if (!open || !purchase) return null;

  return (
    <div className="space-y-4 py-4">
      <div className="bg-slate-50 p-3 rounded-lg">
        <div className="text-sm text-slate-500">商品名称</div>
        <div className="font-bold">{formatProductName(purchase.product)}</div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="text-sm text-slate-500">原进货数量</div>
          <div className="font-bold">{purchase.quantity}</div>
        </div>
        <div>
          <div className="text-sm text-slate-500">已标记待退</div>
          <div className="font-bold text-orange-600">{purchase.pendingReturnQty}</div>
        </div>
        <div>
          <div className="text-sm text-slate-500">可退数量</div>
          <div className="font-bold text-green-600">{availableQty}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-slate-500">原进货单价</div>
          <div className="font-bold font-mono">{formatCurrency(purchase.unitPrice)}</div>
        </div>
        {purchase.product.isPriceVolatile && (
          <div className="bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
            <div className="text-xs text-yellow-700">⚠️ 价格波动商品</div>
          </div>
        )}
      </div>

      <div className={`border rounded-lg p-3 ${isCompleted ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
        <div className="text-sm">
          {isCompleted ? (
            <>
              <span className="font-bold text-green-700">✅ 已入库订单退货</span>
              <p className="text-green-600 mt-1">退货后：库存减少，应付账款冲账</p>
            </>
          ) : (
            <>
              <span className="font-bold text-blue-700">📦 未入库订单退货</span>
              <p className="text-blue-600 mt-1">退货后：库存不变（货物退回给送货人），应付不变</p>
            </>
          )}
        </div>
      </div>

      {purchase.product.isPriceVolatile && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-sm">
          <span className="text-yellow-700">⚠️ 这是价格波动商品，退货时需要输入当日市场价格</span>
        </div>
      )}

      {isCompleted && purchase.supplierId && (
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-sm">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id="refundToSupplier"
              checked={refundToSupplier}
              onChange={(e) => setRefundToSupplier(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="refundToSupplier" className="text-slate-700">
              供应商已付款，需要退款给我
            </label>
          </div>
          <p className="text-xs text-slate-500">
            {refundToSupplier
              ? '将生成「退货退款」记录，供应商应退金额'
              : '将生成「退货冲账」记录，冲抵应付账款'}
          </p>
        </div>
      )}

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
          max={availableQty}
        />
        <div className="text-xs text-slate-500 mt-1">
          最大可退: {availableQty} {purchase.product.unit}
        </div>
      </div>

      {returnQuantity && (
        <div className="bg-orange-50 p-3 rounded-lg">
          <div className="text-sm text-slate-500">退货金额</div>
          <div className="text-xl font-bold text-orange-600">
            {purchase.product.isPriceVolatile
              ? marketPrice
                ? formatCurrency(parseFloat(returnQuantity) * parseFloat(marketPrice))
                : '需输入市场价'
              : formatCurrency(parseFloat(returnQuantity) * purchase.unitPrice)}
          </div>
        </div>
      )}

      {purchase.product.isPriceVolatile && (
        <div>
          <label className="text-sm font-medium mb-2 block">
            今日市场价 (元) <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            value={marketPrice}
            onChange={(e) => setMarketPrice(e.target.value)}
            placeholder="请输入今日市场价格"
            min="0"
            step="0.01"
          />
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
          取消
        </Button>
        <Button onClick={handleConfirm} disabled={creating || !returnQuantity}>
          {creating ? '处理中...' : '确认退货'}
        </Button>
      </div>

      {showMarketPriceDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">输入今日市场价格</h3>
            <p className="text-slate-600 mb-4">
              <span className="font-bold">{formatProductName(purchase.product)}</span> 是价格波动商品，请输入今日的市场价格：
            </p>
            <Input
              type="number"
              value={marketPrice}
              onChange={(e) => setMarketPrice(e.target.value)}
              placeholder="今日市场价格"
              min="0"
              step="0.01"
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowMarketPriceDialog(false)}>取消</Button>
              <Button
                onClick={() => {
                  setShowMarketPriceDialog(false);
                  if (purchase && returnQuantity && marketPrice) {
                    createReturn(parseFloat(returnQuantity), parseFloat(marketPrice));
                  }
                }}
              >
                确认市场价
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
