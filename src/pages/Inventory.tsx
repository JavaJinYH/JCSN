import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { DataTablePagination, useDataTable } from '@/components/DataTable';
import { ProductService } from '@/services/ProductService';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/Toast';
import type { Product, Category } from '@/lib/types';

interface StockEditItem {
  productId: string;
  originalStock: number;
  newStock: number;
}

export function Inventory() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get('filter') || 'all';

  const [products, setProducts] = useState<(Product & { category: Category })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>(initialFilter);
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  // 批量编辑库存相关
  const [showStockEditDialog, setShowStockEditDialog] = useState(false);
  const [stockEditItems, setStockEditItems] = useState<StockEditItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [editSearchTerm, setEditSearchTerm] = useState('');
  const [editSelectedCategory, setEditSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [selectedCategory, stockFilter]);

  const loadData = async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        ProductService.getProducts(),
        ProductService.getCategories(),
      ]);

      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 打开批量编辑库存对话框
  const openStockEditDialog = () => {
    const items: StockEditItem[] = products.map(p => ({
      productId: p.id,
      originalStock: p.stock,
      newStock: p.stock,
    }));
    setStockEditItems(items);
    setShowStockEditDialog(true);
  };

  // 更新单个商品的编辑库存
  const updateStockEditItem = (productId: string, newStock: number) => {
    setStockEditItems(items => items.map(item =>
      item.productId === productId ? { ...item, newStock: Math.max(0, newStock) } : item
    ));
  };

  // 保存批量库存
  const saveBatchStock = async () => {
    setIsSaving(true);
    try {
      const itemsToUpdate = stockEditItems.filter(
        item => item.newStock !== item.originalStock
      );

      for (const item of itemsToUpdate) {
        await ProductService.updateProduct(item.productId, {
          stock: item.newStock,
        });
      }

      toast(`成功更新 ${itemsToUpdate.length} 项库存`, 'success');
      setShowStockEditDialog(false);
      loadData();
    } catch (error) {
      console.error('[Inventory] 批量更新库存失败:', error);
      toast('更新失败，请重试', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // 批量编辑的筛选
  const filteredStockEditItems = stockEditItems.filter(item => {
    const product = products.find(p => p.id === item.productId);
    if (!product) return false;

    const matchesSearch =
      !editSearchTerm ||
      product.name.toLowerCase().includes(editSearchTerm.toLowerCase()) ||
      product.specification?.toLowerCase().includes(editSearchTerm.toLowerCase()) ||
      product.model?.toLowerCase().includes(editSearchTerm.toLowerCase());

    const matchesCategory =
      editSelectedCategory === 'all' ||
      product.categoryId === editSelectedCategory;

    return matchesSearch && matchesCategory;
  });

  const isAlertMode = stockFilter === 'low' || stockFilter === 'out';

  const toggleProductSelection = (productId: string) => {
    const newSet = new Set(selectedProducts);
    if (newSet.has(productId)) {
      newSet.delete(productId);
    } else {
      newSet.add(productId);
    }
    setSelectedProducts(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const openGenerateDialog = () => {
    const selectedItems = products
      .filter(p => selectedProducts.has(p.id))
      .map(p => ({
        productId: String(p.id),
        quantity: Math.max(1, (p.minStock || 10) - p.stock),
        unitPrice: p.lastPurchasePrice || 0,
      }));

    console.log('[Inventory] 跳转前选中的商品:', selectedItems);
    setSelectedProducts(new Set());
    navigate('/purchases', {
      state: {
        openAdd: true,
        prefilledItems: selectedItems
      }
    });
  };

  const filteredProducts = products.filter((p) => {
    const effectiveMinStock = p.minStock || 10;
    if (stockFilter === 'low') {
      return p.stock > 0 && p.stock <= effectiveMinStock && p.minStock > 0;
    } else if (stockFilter === 'out') {
      return p.stock === 0;
    } else if (stockFilter === 'normal') {
      return p.stock > effectiveMinStock || p.minStock === 0;
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={openStockEditDialog}>
            📋 批量盘点/录入库存
          </Button>
          {isAlertMode && selectedProducts.size > 0 && (
            <Button className="bg-orange-500 hover:bg-orange-600" onClick={openGenerateDialog}>
              📝 生成进货单 ({selectedProducts.size})
            </Button>
          )}
        </div>
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
                setSelectedProducts(new Set());
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
                {isAlertMode && <TableHead className="w-10"></TableHead>}
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
                  <TableCell colSpan={isAlertMode ? 8 : 7} className="text-center py-8 text-slate-500">
                    暂无商品数据
                  </TableCell>
                </TableRow>
              ) : (
                tableProps.data.map((product) => {
                  const status = getStockStatus(product);
                  return (
                    <TableRow key={product.id}>
                      {isAlertMode && (
                        <TableCell>
                          <Checkbox
                            checked={selectedProducts.has(product.id)}
                            onCheckedChange={() => toggleProductSelection(product.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.category.name}</TableCell>
                      <TableCell className="text-slate-500">
                        {product.specification || '-'} {product.model || ''}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {product.stock} {product.unit}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(product.lastPurchasePrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-orange-600">
                        {formatCurrency(product.referencePrice)}
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

      {/* 批量编辑库存对话框 */}
      <Dialog open={showStockEditDialog} onOpenChange={setShowStockEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>批量盘点/录入库存</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">分类:</span>
                <Select value={editSelectedCategory} onValueChange={setEditSelectedCategory}>
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
              <Input
                placeholder="搜索商品..."
                value={editSearchTerm}
                onChange={(e) => setEditSearchTerm(e.target.value)}
                className="w-48 h-8"
              />
              <p className="text-xs text-slate-400">
                提示：直接在“盘点库存”列中输入数量，会直接覆盖原有库存
              </p>
            </div>

            <div className="border rounded-lg overflow-auto max-h-[50vh]">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead>商品名称</TableHead>
                    <TableHead>分类</TableHead>
                    <TableHead className="text-right">原有库存</TableHead>
                    <TableHead className="text-right w-32">盘点库存</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStockEditItems.map(item => {
                    const product = products.find(p => p.id === item.productId);
                    if (!product) return null;
                    const hasChanged = item.originalStock !== item.newStock;
                    return (
                      <TableRow key={item.productId} className={hasChanged ? 'bg-orange-50' : ''}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.category.name}</TableCell>
                        <TableCell className="text-right font-mono">
                          {item.originalStock} {product.unit}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={item.newStock}
                            onChange={(e) => updateStockEditItem(item.productId, parseInt(e.target.value) || 0)}
                            min="0"
                            className="w-full h-8 text-right"
                          />
                        </TableCell>
                        <TableCell>
                          {hasChanged && (
                            <Badge variant="warning">已修改</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between items-center">
              <p className="text-sm text-slate-500">
                共 {filteredStockEditItems.length} 件商品，已修改 {stockEditItems.filter(i => i.originalStock !== i.newStock).length} 件
              </p>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowStockEditDialog(false);
                    setStockEditItems([]);
                  }}
                >
                  取消
                </Button>
                <Button
                  onClick={saveBatchStock}
                  disabled={isSaving}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {isSaving ? '保存中...' : '保存修改'}
                </Button>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
