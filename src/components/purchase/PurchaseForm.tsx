import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PhotoUpload } from '@/components/PhotoUpload';
import { formatCurrency } from '@/lib/utils';
import { recordFrequency } from '@/lib/frequency';
import type { Product, Category, Supplier } from '@/lib/types';

interface PurchaseItemRow {
  id: string;
  productId: string;
  quantity: string;
  unitPrice: string;
}

interface PurchaseFormProps {
  open: boolean;
  products: (Product & { category: Category })[];
  suppliers: Supplier[];
  purchaseItems: PurchaseItemRow[];
  commonSupplierId: string;
  commonBatchNo: string;
  commonRemark: string;
  photos: { id: string; file?: File; preview: string; remark: string; type: string }[];
  onOpenChange: (open: boolean) => void;
  onItemsChange: (items: PurchaseItemRow[]) => void;
  onSupplierChange: (id: string) => void;
  onBatchNoChange: (no: string) => void;
  onRemarkChange: (remark: string) => void;
  onPhotosChange: (photos: any[]) => void;
  onSubmit: () => void;
}

export function PurchaseForm({
  open,
  products,
  suppliers,
  purchaseItems,
  commonSupplierId,
  commonBatchNo,
  commonRemark,
  photos,
  onOpenChange,
  onItemsChange,
  onSupplierChange,
  onBatchNoChange,
  onRemarkChange,
  onPhotosChange,
  onSubmit,
}: PurchaseFormProps) {
  useEffect(() => {
    if (open) {
      onItemsChange([{ id: '1', productId: '', quantity: '', unitPrice: '' }]);
      onSupplierChange('');
      onBatchNoChange('');
      onRemarkChange('');
      onPhotosChange([]);
    }
  }, [open]);

  const filteredProducts = products;

  const addPurchaseItem = () => {
    const newId = Date.now().toString();
    onItemsChange([...purchaseItems, { id: newId, productId: '', quantity: '', unitPrice: '' }]);
  };

  const removePurchaseItem = (id: string) => {
    if (purchaseItems.length <= 1) return;
    onItemsChange(purchaseItems.filter(item => item.id !== id));
  };

  const updatePurchaseItem = (id: string, field: 'productId' | 'quantity' | 'unitPrice', value: string) => {
    onItemsChange(purchaseItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const totalAmount = purchaseItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  return (
    <div className="space-y-4 py-4">
      <div className="bg-orange-50 p-3 rounded-lg text-sm text-orange-700">
        提示：可以添加多行商品，一次性完成多种商品的进货记录
      </div>

      <div className="max-h-64 overflow-y-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">操作</TableHead>
              <TableHead>商品</TableHead>
              <TableHead className="w-24">数量</TableHead>
              <TableHead className="w-28">单价 (元)</TableHead>
              <TableHead className="w-28">小计 (元)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchaseItems.map((item) => {
              const subtotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePurchaseItem(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      删除
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.productId}
                      onValueChange={(v) => updatePurchaseItem(item.id, 'productId', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择商品" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredProducts.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} {p.specification ? `(${p.specification})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updatePurchaseItem(item.id, 'quantity', e.target.value)}
                      placeholder="0"
                      min="1"
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updatePurchaseItem(item.id, 'unitPrice', e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell className="font-mono text-right">
                    {subtotal > 0 ? formatCurrency(subtotal) : '-'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Button variant="outline" onClick={addPurchaseItem} className="w-full">
        + 添加商品
      </Button>

      <div className="bg-slate-50 p-3 rounded-lg flex justify-between items-center">
        <div className="text-sm text-slate-500">
          共 {purchaseItems.filter(item => item.productId).length} 种商品
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-500">进货总额</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(totalAmount)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">批次号</label>
          <Input
            value={commonBatchNo}
            onChange={(e) => onBatchNoChange(e.target.value)}
            placeholder="可选"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">供应商</label>
          <Select value={commonSupplierId} onValueChange={(v) => { onSupplierChange(v); if (v && v !== '__none__') recordFrequency('supplier', v); }}>
            <SelectTrigger>
              <SelectValue placeholder="选择供应商（可选）" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">无</SelectItem>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">备注</label>
        <Input
          value={commonRemark}
          onChange={(e) => onRemarkChange(e.target.value)}
          placeholder="可选"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">单据照片</label>
        <PhotoUpload
          photos={photos}
          onChange={onPhotosChange}
          maxPhotos={2}
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
        <Button onClick={onSubmit}>保存</Button>
      </div>
    </div>
  );
}
