import { useState } from 'react';
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
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/lib/types';

interface ImportItem {
  productId: string;
  productName: string;
  quantity: number;
  price?: number;
}

interface ProductImportProps {
  products: Product[];
  importItems: ImportItem[];
  onItemsChange: (items: ImportItem[]) => void;
  onImport: () => void;
  onCancel: () => void;
}

export function ProductImport({
  products,
  importItems,
  onItemsChange,
  onImport,
  onCancel,
}: ProductImportProps) {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');

  const handleAddItem = () => {
    if (!selectedProductId) {
      return;
    }
    if (!quantity || parseInt(quantity) <= 0) {
      return;
    }

    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    onItemsChange([
      ...importItems,
      {
        productId: selectedProductId,
        productName: product.name,
        quantity: parseInt(quantity),
        price: price ? parseFloat(price) : undefined,
      },
    ]);

    setSelectedProductId('');
    setQuantity('');
    setPrice('');
  };

  const removeItem = (index: number) => {
    onItemsChange(importItems.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4 py-4">
      <p className="text-sm text-slate-500">
        选择商品并设置初始库存数量。商品如果不存在将自动创建。
      </p>

      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium w-20">商品</label>
          <select
            className="flex-1 h-9 border rounded px-2"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
          >
            <option value="">选择商品</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium w-20">库存数量</label>
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            min="0"
            className="flex-1"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium w-20">参考售价</label>
          <Input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="可不填"
            step="0.01"
            className="flex-1"
          />
        </div>

        <Button size="sm" onClick={handleAddItem} className="w-full">
          + 添加到列表
        </Button>
      </div>

      {importItems.length > 0 && (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品</TableHead>
                <TableHead className="text-right">库存</TableHead>
                <TableHead className="text-right">售价</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {importItems.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="text-sm">{item.productName}</TableCell>
                  <TableCell className="text-right font-mono">{item.quantity}</TableCell>
                  <TableCell className="text-right font-mono">
                    {item.price ? formatCurrency(item.price) : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-red-600"
                      onClick={() => removeItem(index)}
                    >
                      删除
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-slate-400">
        提示：如果商品已存在，库存数量将累加。如果参考售价留空，将使用商品原有售价。
      </p>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button onClick={onImport} disabled={importItems.length === 0}>
          确认导入 {importItems.length > 0 && `(${importItems.length}项)`}
        </Button>
      </div>
    </div>
  );
}
