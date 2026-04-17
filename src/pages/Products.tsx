import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { DataTablePagination, useDataTable } from '@/components/DataTable';
import { db } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import type { Product, Category } from '@/lib/types';
import { toast } from '@/components/Toast';

export function Products() {
  const [products, setProducts] = useState<(Product & { category: Category })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const loadData = async () => {
    try {
      const whereClause: any = {};
      if (selectedCategory !== 'all') {
        whereClause.categoryId = selectedCategory;
      }

      const [productsData, categoriesData] = await Promise.all([
        db.product.findMany({
          where: whereClause,
          include: { category: true },
          orderBy: { name: 'asc' },
        }),
        db.category.findMany({ orderBy: { sortOrder: 'asc' } }),
      ]);

      const filteredProducts = searchTerm
        ? productsData.filter(
            (p) =>
              p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.specification?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.model?.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : productsData;

      setProducts(filteredProducts);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load products:', error);
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

  const tableProps = useDataTable<Product & { category: Category }>({
    data: filteredProducts,
    defaultPageSize: 20,
  });

  const handleDelete = async () => {
    if (!deleteProduct) return;

    try {
      await db.product.delete({ where: { id: deleteProduct.id } });
      setDeleteProduct(null);
      loadData();
      toast('删除成功', 'success');
    } catch (error) {
      console.error('Failed to delete product:', error);
      toast('删除失败，请重试', 'error');
    }
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
          <h2 className="text-2xl font-bold text-slate-800">商品管理</h2>
          <p className="text-slate-500 mt-1">管理商品信息和价格</p>
        </div>
        <Link to="/products/new">
          <Button className="bg-orange-500 hover:bg-orange-600">+ 添加商品</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 flex-wrap">
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

            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-28 h-8">
                <SelectValue placeholder="库存状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部库存</SelectItem>
                <SelectItem value="normal">库存正常</SelectItem>
                <SelectItem value="low">库存预警</SelectItem>
                <SelectItem value="out">库存缺货</SelectItem>
              </SelectContent>
            </Select>

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
                <TableHead>单位</TableHead>
                <TableHead className="text-right">成本价</TableHead>
                <TableHead className="text-right">销售价</TableHead>
                <TableHead className="text-right">库存</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableProps.total === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    暂无商品数据
                  </TableCell>
                </TableRow>
              ) : (
                tableProps.data.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{product.category.name}</Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {product.specification || '-'} {product.model || ''}
                    </TableCell>
                    <TableCell>{product.unit}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(product.costPrice)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-orange-600">
                      {formatCurrency(product.salePrice)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {product.stock}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link to={`/products/${product.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            编辑
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteProduct(product)}
                        >
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
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
          <CardTitle className="text-base">商品统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-slate-800">{products.length}</div>
              <div className="text-sm text-slate-500">商品种类</div>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-slate-800">
                {categories.length}
              </div>
              <div className="text-sm text-slate-500">商品分类</div>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-slate-800">
                {formatCurrency(
                  products.reduce((sum, p) => sum + p.salePrice * p.stock, 0)
                )}
              </div>
              <div className="text-sm text-slate-500">库存总值</div>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-slate-800">
                {products.reduce((sum, p) => sum + p.stock, 0)}
              </div>
              <div className="text-sm text-slate-500">总库存量</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              确定要删除商品 <strong>{deleteProduct?.name}</strong> 吗？
            </p>
            <p className="text-sm text-red-500 mt-2">
              此操作不可恢复，相关销售记录也将受到影响。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteProduct(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
