import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { sortByFrequency } from '@/lib/frequency';
import type { Product, Category } from '@/lib/types';

interface SaleProductSelectProps {
  products: Product[];
  categories: Category[];
  historicalPrices: Map<string, number>;
  onAddToCart: (product: Product) => void;
}

export function SaleProductSelect({
  products,
  categories,
  historicalPrices,
  onAddToCart,
}: SaleProductSelectProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = sortByFrequency(
    products.filter((p) => {
      const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
      const matchesSearch =
        !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.specification?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    }),
    'product'
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">选择商品</CardTitle>
        <div className="flex items-center gap-4 mt-4">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="全部分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部分类</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="搜索商品..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-8 text-slate-500">
              {products.length === 0 ? '暂无商品，请先添加商品' : '当前分类下没有商品'}
            </div>
          ) : (
            filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => onAddToCart(product)}
                disabled={product.stock === 0}
                className={`p-3 border rounded-lg text-left transition-colors relative ${
                  product.stock === 0
                    ? 'border-slate-200 opacity-50 cursor-not-allowed'
                    : 'border-slate-200 hover:border-orange-300 hover:bg-orange-50'
                }`}
              >
                {product.brand && (
                  <span className="absolute top-1 right-1 text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                    {product.brand}
                  </span>
                )}
                <div className="font-medium text-slate-800 truncate pr-12">
                  {product.name}
                </div>
                <div className="text-sm text-slate-500 truncate">
                  {product.specification || product.model || '-'}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex flex-col">
                    <span className="text-orange-600 font-bold">
                      {product.referencePrice ? formatCurrency(product.referencePrice) : '-'}
                    </span>
                    {historicalPrices.has(product.id) && (
                      <span className="text-xs text-slate-400">
                        上次: {formatCurrency(historicalPrices.get(product.id)!)}
                      </span>
                    )}
                  </div>
                  <Badge
                    variant={product.stock === 0 ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {product.stock === 0 ? '缺货' : `库存: ${product.stock}`}
                  </Badge>
                </div>
              </button>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
