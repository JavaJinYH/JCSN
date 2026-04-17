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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTablePagination, useDataTable } from '@/components/DataTable';
import { db } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import type { Product, Category } from '@/lib/types';

export function Inventory() {
  const [products, setProducts] = useState<(Product & { category: Category })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedCategory, stockFilter]);

  const loadData = async () => {
    try {
      const whereClause: any = {};

      if (selectedCategory !== 'all') {
        whereClause.categoryId = selectedCategory;
      }

      if (stockFilter === 'low') {
        whereClause.stock = { lte: 10 };
      } else if (stockFilter === 'out') {
        whereClause.stock = 0;
      }

      const [productsData, categoriesData] = await Promise.all([
        db.product.findMany({
          where: whereClause,
          include: { category: true },
          orderBy: { name: 'asc' },
        }),
        db.category.findMany({
          orderBy: { sortOrder: 'asc' },
        }),
      ]);

      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (stockFilter === 'low') {
      return p.stock > 0 && p.stock <= (p.minStock || 10);
    } else if (stockFilter === 'out') {
      return p.stock === 0;
    } else if (stockFilter === 'normal') {
      return p.stock > (p.minStock || 10);
    }
    return true;
  });

  const searchFilteredProducts = searchTerm
    ? filteredProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.specification?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.model?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : filteredProducts;

  const tableProps = useDataTable<Product & { category: Category }>({
    data: searchFilteredProducts,
    defaultPageSize: 20,
  });

  const getStockStatus = (product: Product) => {
    if (product.stock === 0) {
      return { label: '缺货', variant: 'destructive' as const };
    }
    if (product.stock <= (product.minStock || 0)) {
      return { label: '预警', variant: 'warning' as const };
    }
    return { label: '正常', variant: 'success' as const };
  };

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
          <h2 className="text-2xl font-bold text-slate-800">库存管理</h2>
          <p className="text-slate-500 mt-1">管理店内建材水暖产品库存</p>
        </div>
        <Button variant="outline">📥 导出库存</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">分类:</span>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-36 h-8">
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
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">库存状态:</span>
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="w-28 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="normal">正常</SelectItem>
                  <SelectItem value="low">预警</SelectItem>
                  <SelectItem value="out">缺货</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Input
              placeholder="搜索商品名称、规格、型号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48 h-8"
            />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setStockFilter('all');
              }}
              className="h-8 text-slate-500"
            >
              🔄 重置筛选
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品名称</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>规格型号</TableHead>
                <TableHead className="text-right">库存量</TableHead>
                <TableHead className="text-right">成本价</TableHead>
                <TableHead className="text-right">销售价</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableProps.total === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    暂无商品数据
                  </TableCell>
                </TableRow>
              ) : (
                tableProps.data.map((product) => {
                  const status = getStockStatus(product);
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.category.name}</TableCell>
                      <TableCell className="text-slate-500">
                        {product.specification || '-'} {product.model || ''}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {product.stock} {product.unit}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(product.costPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-orange-600">
                        {formatCurrency(product.salePrice)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          <DataTablePagination
            pagination={{
              page: tableProps.page,
              pageSize: tableProps.pageSize,
              total: tableProps.total,
            }}
            onPageChange={tableProps.setPage}
            onPageSizeChange={tableProps.setPageSize}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">库存概览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-slate-800">{products.length}</div>
              <div className="text-sm text-slate-500">商品种类</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {products.filter((p) => p.stock > (p.minStock || 0)).length}
              </div>
              <div className="text-sm text-slate-500">库存正常</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {products.filter((p) => p.stock <= (p.minStock || 0) && p.stock > 0).length}
              </div>
              <div className="text-sm text-slate-500">库存预警</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {products.filter((p) => p.stock === 0).length}
              </div>
              <div className="text-sm text-slate-500">缺货商品</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
