import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { InventoryCheckService } from '@/services/InventoryCheckService';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/Toast';
import type { Product, InventoryCheck, InventoryCheckItem } from '@/lib/types';

interface ProductWithStock extends Product {
  actualStock: number;
  profitLoss: number;
  amount: number;
}

export function InventoryCheckPage() {
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkHistory, setCheckHistory] = useState<InventoryCheck[]>([]);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showNewCheckDialog, setShowNewCheckDialog] = useState(false);
  const [checkName, setCheckName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const productsData = await InventoryCheckService.getProducts();

      const productsWithStock: ProductWithStock[] = productsData.map(p => ({
        ...p,
        actualStock: 0,
        profitLoss: 0,
        amount: 0,
      }));
      setProducts(productsWithStock);

      const history = await InventoryCheckService.getCheckHistory();
      setCheckHistory(history);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActualStockChange = (productId: string, actualStock: number) => {
    setProducts(products.map(p => {
      if (p.id === productId) {
        const profitLoss = actualStock - p.stock;
        const amount = profitLoss * p.costPrice;
        return { ...p, actualStock, profitLoss, amount };
      }
      return p;
    }));
  };

  const calculateTotals = () => {
    let totalItems = 0;
    let totalProfit = 0;
    let totalLoss = 0;

    products.forEach(p => {
      if (p.actualStock !== 0) {
        totalItems++;
        if (p.profitLoss > 0) {
          totalProfit += p.profitLoss;
        } else {
          totalLoss += Math.abs(p.profitLoss);
        }
      }
    });

    return { totalItems, totalProfit, totalLoss };
  };

  const handleStartCheck = () => {
    setProducts(products.map(p => ({
      ...p,
      actualStock: p.stock,
      profitLoss: 0,
      amount: 0,
    })));
    setShowNewCheckDialog(true);
  };

  const handleSubmitCheck = async () => {
    try {
      setSubmitting(true);

      const { totalItems, totalProfit, totalLoss } = calculateTotals();

      const check = await InventoryCheckService.createCheck({
        checkDate: new Date(),
        operator: checkName || undefined,
        totalItems,
        totalProfit,
        totalLoss,
        status: 'completed',
        items: {
          create: products
            .filter(p => p.actualStock !== 0)
            .map(p => ({
              productId: p.id,
              systemStock: p.stock,
              actualStock: p.actualStock,
              profitLoss: p.profitLoss,
              costPrice: p.costPrice,
              amount: p.amount,
            })),
        },
      });

      const hasAdjustments = products.some(p => p.profitLoss !== 0 && p.actualStock !== p.stock);
      if (hasAdjustments) {
        for (const p of products) {
          if (p.actualStock !== p.stock) {
            await InventoryCheckService.updateProductStock(p.id, p.actualStock);
          }
        }
        toast('盘点完成，库存已调整', 'success');
      } else {
        toast('盘点完成，无库存差异', 'success');
      }
      setShowNewCheckDialog(false);
      setCheckName('');
      loadData();
    } catch (error) {
      console.error('Failed to submit check:', error);
      toast('盘点提交失败，请重试', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const { totalItems, totalProfit, totalLoss } = calculateTotals();

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
          <h2 className="text-2xl font-bold text-slate-800">库存盘点</h2>
          <p className="text-slate-500 mt-1">核对实际库存与系统库存</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowHistoryDialog(true)}>
            📋 盘点历史
          </Button>
          <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleStartCheck}>
            🔍 开始盘点
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">盘点汇总</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-sm text-slate-500">盘点品种数</div>
              <div className="text-2xl font-bold text-slate-900">{totalItems}</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-green-600">盘盈品种数</div>
              <div className="text-2xl font-bold text-green-700">+{totalProfit}</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-sm text-red-600">盘亏品种数</div>
              <div className="text-2xl font-bold text-red-700">-{totalLoss}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品名称</TableHead>
                <TableHead>规格/型号</TableHead>
                <TableHead className="text-right">系统库存</TableHead>
                <TableHead className="text-right">实际库存</TableHead>
                <TableHead className="text-right">差额</TableHead>
                <TableHead className="text-right">成本价</TableHead>
                <TableHead className="text-right">盈亏金额</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-slate-500">
                    {product.specification || product.model || '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono">{product.stock}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      value={product.actualStock || ''}
                      onChange={(e) =>
                        handleActualStockChange(product.id, parseInt(e.target.value) || 0)
                      }
                      className="w-24 h-8 text-right font-mono ml-auto"
                      min="0"
                    />
                  </TableCell>
                  <TableCell className={`text-right font-mono ${
                    product.profitLoss > 0 ? 'text-green-600' :
                    product.profitLoss < 0 ? 'text-red-600' : 'text-slate-400'
                  }`}>
                    {product.profitLoss > 0 ? `+${product.profitLoss}` : product.profitLoss}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(product.costPrice)}
                  </TableCell>
                  <TableCell className={`text-right font-mono ${
                    product.amount > 0 ? 'text-green-600' :
                    product.amount < 0 ? 'text-red-600' : 'text-slate-400'
                  }`}>
                    {product.amount > 0 ? `+${formatCurrency(product.amount)}` :
                     product.amount < 0 ? formatCurrency(product.amount) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>盘点历史</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {checkHistory.length === 0 ? (
              <div className="text-center py-8 text-slate-500">暂无盘点记录</div>
            ) : (
              checkHistory.map((check) => (
                <div key={check.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">
                        {new Date(check.checkDate).toLocaleDateString('zh-CN')}
                      </div>
                      <div className="text-sm text-slate-500">
                        操作员: {check.operator || '-'}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={check.totalProfit >= check.totalLoss ? 'success' : 'destructive'}>
                        盘盈 {check.totalProfit} / 盘亏 {check.totalLoss}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowHistoryDialog(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewCheckDialog} onOpenChange={setShowNewCheckDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建盘点</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">操作员（可选）</label>
              <Input
                value={checkName}
                onChange={(e) => setCheckName(e.target.value)}
                placeholder="输入操作员姓名"
              />
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="text-sm text-slate-500">盘点汇总</div>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div className="text-center">
                  <div className="text-2xl font-bold">{totalItems}</div>
                  <div className="text-xs text-slate-500">盘点品种</div>
                </div>
                <div className="text-center text-green-600">
                  <div className="text-2xl font-bold">+{totalProfit}</div>
                  <div className="text-xs">盘盈数量</div>
                </div>
                <div className="text-center text-red-600">
                  <div className="text-2xl font-bold">-{totalLoss}</div>
                  <div className="text-xs">盘亏数量</div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCheckDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSubmitCheck} disabled={submitting}>
              {submitting ? '提交中...' : '提交盘点'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
