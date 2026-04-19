import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatProductName } from '@/lib/utils';
import { db } from '@/lib/db';
import type { Product } from '@/lib/types';
import { toast } from '@/components/Toast';

interface PurchaseReturnProps {
  purchase: {
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    product: Product;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PurchaseReturn({
  purchase,
  open,
  onOpenChange,
  onSuccess,
}: PurchaseReturnProps) {
  const [returnQuantity, setReturnQuantity] = useState('');
  const [marketPrice, setMarketPrice] = useState('');
  const [showMarketPriceDialog, setShowMarketPriceDialog] = useState(false);

  const handleConfirm = async () => {
    if (!purchase || !returnQuantity) {
      toast('请填写退货数量', 'warning');
      return;
    }

    const qty = parseFloat(returnQuantity);
    if (qty <= 0 || qty > purchase.quantity) {
      toast('退货数量必须大于0且不超过原进货数量', 'warning');
      return;
    }

    if (purchase.product.isPriceVolatile && !marketPrice) {
      setShowMarketPriceDialog(true);
      return;
    }

    await createReturn(qty, purchase.product.isPriceVolatile ? parseFloat(marketPrice) : purchase.unitPrice);
  };

  const createReturn = async (qty: number, unitPrice: number) => {
    try {
      await db.purchaseReturn.create({
        data: {
          purchaseId: purchase!.id,
          totalAmount: qty * unitPrice,
          items: {
            create: {
              productId: purchase!.productId,
              returnQuantity: qty,
              unitPrice: unitPrice,
              amount: qty * unitPrice,
              marketPrice: purchase!.product.isPriceVolatile ? unitPrice : null,
            },
          },
        },
      });

      await db.product.update({
        where: { id: purchase!.productId },
        data: { stock: { decrement: qty } },
      });

      onOpenChange(false);
      setReturnQuantity('');
      setMarketPrice('');
      onSuccess();
      toast('退货记录创建成功！', 'success');
    } catch (error) {
      console.error('Failed to create return:', error);
      toast('退货失败，请重试', 'error');
    }
  };

  if (!open || !purchase) return null;

  return (
    <div className="space-y-4 py-4">
      <div className="bg-slate-50 p-3 rounded-lg">
        <div className="text-sm text-slate-500">商品名称</div>
        <div className="font-bold">{formatProductName(purchase.product)}</div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-slate-500">原进货数量</div>
          <div className="font-bold">{purchase.quantity}</div>
        </div>
        <div>
          <div className="text-sm text-slate-500">原进货单价</div>
          <div className="font-bold font-mono">{formatCurrency(purchase.unitPrice)}</div>
        </div>
      </div>

      {purchase.product.isPriceVolatile && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-sm">
          <span className="text-yellow-700">⚠️ 这是价格波动商品，退货时需要输入当日市场价格</span>
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
          max={purchase.quantity}
        />
        <div className="text-xs text-slate-500 mt-1">
          最多可退: {purchase.quantity} {purchase.product.unit}
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
          {purchase.product.isPriceVolatile && !marketPrice && (
            <div className="text-xs text-orange-600 mt-1">请在下方输入今日的市场价</div>
          )}
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
        <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
        <Button onClick={handleConfirm}>确认退货</Button>
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
