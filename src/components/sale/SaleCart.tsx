import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/Combobox';
import { formatCurrency, formatProductName } from '@/lib/utils';
import { sortByFrequency, recordFrequency } from '@/lib/frequency';
import type { Product } from '@/lib/types';

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  salePrice: number;
  purchaseUnit: string | null;
  saleUnit: string;
  unitRatio: number;
}

interface SaleCartProps {
  cart: CartItem[];
  products: Product[];
  historicalPrices: Map<string, number>;
  discount: number;
  discountRate: number;
  manualFinalAmount: number | null;
  onAddToCart: (product: Product) => void;
  onUpdateCartQuantity: (productId: string, quantity: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onUpdateCartItem: (productId: string, updates: Partial<CartItem>) => void;
  onSetDiscount: (value: number) => void;
  onSetDiscountRate: (value: number) => void;
  onSetManualFinalAmount: (value: number | null) => void;
  onHandleMoli: () => void;
}

export function SaleCart({
  cart,
  products,
  historicalPrices,
  discount,
  discountRate,
  manualFinalAmount,
  onAddToCart,
  onUpdateCartQuantity,
  onRemoveFromCart,
  onUpdateCartItem,
  onSetDiscount,
  onSetDiscountRate,
  onSetManualFinalAmount,
  onHandleMoli,
}: SaleCartProps) {
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const costTotal = cart.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);
  const rateDiscount = subtotal * (100 - discountRate) / 100;
  const totalDiscount = discount + rateDiscount;
  const totalPaid = 0;
  const calculatedFinalAmount = subtotal - totalDiscount;
  const finalAmount = manualFinalAmount !== null ? manualFinalAmount : calculatedFinalAmount;
  const paidAmount = Math.min(totalPaid, finalAmount);
  const remainingAmount = Math.max(0, finalAmount - totalPaid);
  const isManualFinalAmount = manualFinalAmount !== null;
  const lossAmount = costTotal - finalAmount;
  const profitRate = finalAmount > 0 ? ((finalAmount - costTotal) / finalAmount) * 100 : 0;
  const showLowProfitWarning = profitRate < 10 && profitRate >= 0 && finalAmount > 0;
  const showLossWarning = finalAmount < costTotal && finalAmount > 0;
  const totalProfit = finalAmount - costTotal;

  const filteredProducts = sortByFrequency(
    products.filter((p) => {
      const matchesSearch = !products.length || true;
      return matchesSearch;
    }),
    'product'
  );

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      onAddToCart(product);
    }
  };

  const productOptions = products.map(p => ({
    value: p.id,
    label: `${p.name} ${p.specification || ''} ${p.brand ? `(${p.brand})` : ''}`.trim(),
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">添加商品</CardTitle>
          <div className="mt-2">
            <Combobox
              value=""
              onValueChange={handleProductSelect}
              options={productOptions}
              placeholder="搜索并选择商品..."
              emptyText="没有找到商品"
            />
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">当前订单</CardTitle>
        </CardHeader>
        <CardContent>
          {cart.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              购物车为空
              <br />
              请从上方选择商品
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex flex-col gap-2 p-2 bg-slate-50 rounded-lg relative"
                >
                  {item.product.brand && (
                    <span className="absolute top-1 right-12 text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                      {item.product.brand}
                    </span>
                  )}
                  <div className="flex items-center justify-between pr-16">
                    <div className="font-medium text-sm">
                      {formatProductName(item.product)}
                    </div>
                    <button
                      onClick={() => onRemoveFromCart(item.product.id)}
                      className="w-6 h-6 rounded bg-red-100 hover:bg-red-200 text-red-600"
                    >
                      ×
                    </button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onUpdateCartQuantity(item.product.id, item.quantity - 1)}
                        className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-600"
                      >
                        -
                      </button>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          onUpdateCartQuantity(item.product.id, parseInt(e.target.value) || 1)
                        }
                        className="w-16 h-7 text-center text-sm"
                        min="1"
                      />
                      <button
                        onClick={() => onUpdateCartQuantity(item.product.id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                        className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-600 disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>

                    <Select
                      value={item.saleUnit}
                      onValueChange={(v) => {
                        const newSaleUnit = v;
                        const newUnitRatio = item.purchaseUnit && newSaleUnit === item.purchaseUnit ? item.unitRatio : 1;
                        let newUnitPrice = item.salePrice;
                        if (item.purchaseUnit && newSaleUnit === item.purchaseUnit) {
                          newUnitPrice = item.salePrice * item.unitRatio;
                        } else if (item.purchaseUnit && newSaleUnit === item.product.unit) {
                          newUnitPrice = item.salePrice / item.unitRatio;
                        }
                        onUpdateCartItem(item.product.id, {
                          saleUnit: newSaleUnit,
                          unitRatio: newUnitRatio,
                          unitPrice: newUnitPrice,
                        });
                      }}
                    >
                      <SelectTrigger className="w-20 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={item.product.unit}>{item.product.unit}</SelectItem>
                        {item.purchaseUnit && item.purchaseUnit !== item.product.unit && (
                          <SelectItem value={item.purchaseUnit}>{item.purchaseUnit}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-slate-400">¥</span>
                      <Input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) =>
                          onUpdateCartItem(item.product.id, {
                            unitPrice: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-20 h-7 text-sm"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="text-xs text-slate-400">
                      = {formatCurrency(item.unitPrice * item.quantity)}
                    </div>
                  </div>

                  {item.purchaseUnit && item.unitRatio > 1 && (
                    <div className="text-xs text-slate-400">
                      {item.purchaseUnit} = {item.unitRatio} {item.product.unit}，折合 {formatCurrency(item.salePrice)}/{item.product.unit}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-slate-200 mt-4 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">商品金额</span>
              <span className="font-mono">{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">折扣率</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={discountRate}
                  onChange={(e) =>
                    onSetDiscountRate(Math.max(0, Math.min(100, parseFloat(e.target.value) || 100)))
                  }
                  className="w-20 h-8 text-right font-mono"
                  min="0"
                  max="100"
                />
                <span className="text-sm text-slate-500">%</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">抹零</span>
                <Button size="sm" variant="outline" onClick={onHandleMoli} className="h-8 px-2 text-xs">
                  一键抹零
                </Button>
              </div>
              <Input
                type="number"
                value={discount}
                onChange={(e) =>
                  onSetDiscount(Math.max(0, parseFloat(e.target.value) || 0))
                }
                className="w-24 h-8 text-right font-mono"
                min="0"
                step="0.01"
              />
            </div>

            {totalDiscount > 0 && (
              <div className="flex justify-between text-sm text-orange-500">
                <span>总优惠</span>
                <span className="font-mono">-{formatCurrency(totalDiscount)}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-lg font-bold pt-2 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <span>应付金额</span>
                {isManualFinalAmount && (
                  <Badge variant="outline" className="text-xs bg-yellow-50">手动</Badge>
                )}
              </div>
              {isManualFinalAmount ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={manualFinalAmount}
                    onChange={(e) => onSetManualFinalAmount(parseFloat(e.target.value) || 0)}
                    className="w-28 h-8 text-right font-mono text-orange-600"
                    step="0.01"
                  />
                  <Button size="sm" variant="ghost" onClick={() => onSetManualFinalAmount(null)}>
                    重置
                  </Button>
                </div>
              ) : (
                <span
                  className="text-orange-600 font-mono cursor-pointer hover:text-orange-700"
                  onClick={() => onSetManualFinalAmount(finalAmount)}
                  title="点击手动修改应付金额"
                >
                  {formatCurrency(finalAmount)}
                </span>
              )}
            </div>

            {showLossWarning && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                <div className="font-medium">⚠️ 亏本警告</div>
                <div>成交价低于成本价，预计亏损 {formatCurrency(lossAmount)}</div>
              </div>
            )}

            {showLowProfitWarning && !showLossWarning && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-600">
                <div className="font-medium">⚠️ 利润率过低警告</div>
                <div>利润率 {profitRate.toFixed(1)}% 低于10%，请确认是否继续</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">费用汇总</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">成本合计</span>
            <span className="font-mono">{formatCurrency(costTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">订单利润</span>
            <span className={`font-mono ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalProfit)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">利润率</span>
            <span className={`font-mono ${profitRate >= 10 ? 'text-green-600' : profitRate >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
              {profitRate.toFixed(1)}%
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
