import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';

interface PaymentInfo {
  method: string;
  amount: number;
  payerName: string;
}

interface SalePaymentProps {
  payments: PaymentInfo[];
  totalPaid: number;
  remainingAmount: number;
  onPaymentsChange: (payments: PaymentInfo[]) => void;
  onDistributeRemaining: () => void;
}

export function SalePayment({
  payments,
  totalPaid,
  remainingAmount,
  onPaymentsChange,
  onDistributeRemaining,
}: SalePaymentProps) {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const addPaymentMethod = () => {
    onPaymentsChange([
      ...payments,
      { method: '现金', amount: 0, payerName: '' },
    ]);
  };

  const updatePayment = (index: number, field: keyof PaymentInfo, value: any) => {
    const newPayments = [...payments];
    newPayments[index] = { ...newPayments[index], [field]: value };
    onPaymentsChange(newPayments);
  };

  const removePayment = (index: number) => {
    if (payments.length > 1) {
      onPaymentsChange(payments.filter((_, i) => i !== index));
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">支付方式</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowPaymentDialog(true)}>
              支付设置
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {payments.filter(p => p.amount > 0).length === 0 ? (
              <div className="text-slate-500 text-center py-4">点击"支付设置"添加支付方式</div>
            ) : (
              payments.filter(p => p.amount > 0).map((p, i) => (
                <div key={i} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                  <span>{p.method}</span>
                  <span className="font-mono">{formatCurrency(p.amount)}</span>
                </div>
              ))
            )}
            <div className="flex justify-between items-center p-2 bg-green-50 rounded font-medium">
              <span>已付金额</span>
              <span className="text-green-600 font-mono">{formatCurrency(totalPaid)}</span>
            </div>
            {remainingAmount > 0 && (
              <div className="flex justify-between items-center p-2 bg-yellow-50 rounded text-yellow-700">
                <span>剩余待付</span>
                <span className="font-mono">{formatCurrency(remainingAmount)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>支付方式设置</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
            {payments.map((payment, index) => (
              <div key={index} className="p-3 border border-slate-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">支付方式 {index + 1}</span>
                  {payments.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500"
                      onClick={() => removePayment(index)}
                    >
                      删除
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">支付方式</label>
                    <Select
                      value={payment.method}
                      onValueChange={(v) => updatePayment(index, 'method', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="现金">现金</SelectItem>
                        <SelectItem value="微信支付">微信支付</SelectItem>
                        <SelectItem value="支付宝">支付宝</SelectItem>
                        <SelectItem value="银行转账">银行转账</SelectItem>
                        <SelectItem value="其他">其他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">支付金额</label>
                    <Input
                      type="number"
                      value={payment.amount}
                      onChange={(e) => updatePayment(index, 'amount', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={addPaymentMethod}>
              + 添加支付方式
            </Button>
            {remainingAmount > 0 && (
              <Button variant="secondary" className="w-full" onClick={onDistributeRemaining}>
                自动填充剩余金额 {formatCurrency(remainingAmount)}
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              取消
            </Button>
            <Button onClick={() => setShowPaymentDialog(false)}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
