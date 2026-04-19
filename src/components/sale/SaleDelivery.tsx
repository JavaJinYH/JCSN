import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface SaleDeliveryProps {
  needsDelivery: boolean;
  deliveryAddress: string;
  deliveryFee: string;
  deliverySuggestion: string;
  totalProfit: number;
  onNeedsDeliveryChange: (value: boolean) => void;
  onDeliveryAddressChange: (value: string) => void;
  onDeliveryFeeChange: (value: string) => void;
}

export function SaleDelivery({
  needsDelivery,
  deliveryAddress,
  deliveryFee,
  deliverySuggestion,
  totalProfit,
  onNeedsDeliveryChange,
  onDeliveryAddressChange,
  onDeliveryFeeChange,
}: SaleDeliveryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">配送信息</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 mb-3">
          <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
            <input
              type="checkbox"
              checked={needsDelivery}
              onChange={(e) => onNeedsDeliveryChange(e.target.checked)}
              className="w-4 h-4"
            />
            需要配送
          </label>
          {deliverySuggestion && (
            <span className={`text-xs px-2 py-1 rounded ${
              totalProfit < 10 ? 'bg-red-50 text-red-600' :
              totalProfit < 50 ? 'bg-yellow-50 text-yellow-600' :
              'bg-green-50 text-green-600'
            }`}>
              {deliverySuggestion}
            </span>
          )}
        </div>
        {needsDelivery && (
          <div className="space-y-3 pl-2 border-l-2 border-orange-200">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">配送地址</label>
              <Input
                placeholder="输入配送地址"
                value={deliveryAddress}
                onChange={(e) => onDeliveryAddressChange(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">配送费 (元)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={deliveryFee}
                onChange={(e) => onDeliveryFeeChange(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
