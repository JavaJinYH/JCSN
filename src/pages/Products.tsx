import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTablePagination, useDataTable } from '@/components/DataTable';
import { ProductService } from '@/services/ProductService';
import { SettingsService } from '@/services/SettingsService';
import type { Product, Category, ProductSpec } from '@/lib/types';
import { toast } from '@/components/Toast';
import { ProductStats, ProductFilters, ProductTable } from '@/components/product';
import { useProducts, useCategories } from '@/hooks';

interface ProductWithDetails extends Product {
  category: Category;
  productSpecs?: ProductSpec[];
}

export function Products() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [deleteProduct, setDeleteProduct] = useState<ProductWithDetails | null>(null);

  // 分类管理状态
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');

  const { products: allProducts, loading, refresh } = useProducts({
    includeCategory: true,
    includeSpecs: true,
    categoryId: selectedCategory === 'all' ? undefined : selectedCategory,
  });
  const { categories: categoriesHook } = useCategories();

  const getStockStatus = (p: Product) => {
    if (p.stock <= 0) {
      return { label: 'out' };
    }
    if (p.stock <= (p.minStock || 0)) {
      return { label: 'low' };
    }
    return { label: 'normal' };
  };

  const filteredProducts = allProducts.filter((p) => {
    const matchesSearch =
      !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.specification?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.model?.toLowerCase().includes(searchTerm.toLowerCase());
    const status = getStockStatus(p);
    const matchesStock =
      stockFilter === 'all' ||
      (stockFilter === 'low' && status.label === 'low') ||
      (stockFilter === 'out' && status.label === 'out') ||
      (stockFilter === 'normal' && status.label === 'normal');
    return matchesSearch && matchesStock;
  });

  const tableProps = useDataTable<ProductWithDetails>({
    data: filteredProducts,
    defaultPageSize: 20,
  });

  // 同步分类数据
  useEffect(() => {
    setCategories(categoriesHook);
  }, [categoriesHook]);

  const loadCategories = async () => {
    const data = await SettingsService.getCategories();
    setCategories(data);
  };

  const handleDelete = async () => {
    if (!deleteProduct) return;

    try {
      await ProductService.deleteProduct(deleteProduct.id);
      setDeleteProduct(null);
      refresh();
      toast('删除成功', 'success');
    } catch (error) {
      console.error('Failed to delete product:', error);
      toast('删除失败，请重试', 'error');
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setStockFilter('all');
  };

  // 分类管理功能
  const handleAddCategory = async () => {
    if (!categoryName.trim()) {
      toast('请输入分类名称', 'warning');
      return;
    }

    const names = categoryName.split('\n').map(n => n.trim()).filter(n => n);

    if (names.length === 0) {
      toast('请输入分类名称', 'warning');
      return;
    }

    try {
      let successCount = 0;
      for (const name of names) {
        try {
          await SettingsService.createCategory({
            name,
            description: categoryDesc.trim() || undefined,
          });
          successCount++;
        } catch (err) {
          console.error(`添加分类 "${name}" 失败:`, err);
        }
      }

      setShowCategoryDialog(false);
      setCategoryName('');
      setCategoryDesc('');
      loadCategories();

      if (successCount === names.length) {
        toast(`成功添加 ${successCount} 个分类`, 'success');
      } else {
        toast(`成功添加 ${successCount}/${names.length} 个分类，部分重复已跳过`, 'warning');
      }
    } catch (error) {
      console.error('Failed to add category:', error);
      toast('添加分类失败', 'error');
    }
  };

  const handleUpdateCategory = async () => {
    if (!editCategory || !categoryName.trim()) {
      toast('请输入分类名称', 'warning');
      return;
    }

    try {
      await SettingsService.updateCategory(editCategory.id, {
        name: categoryName.trim(),
        description: categoryDesc.trim() || undefined,
      });

      setEditCategory(null);
      setCategoryName('');
      setCategoryDesc('');
      loadCategories();
      toast('分类更新成功', 'success');
    } catch (error) {
      console.error('Failed to update category:', error);
      toast('更新分类失败', 'error');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await SettingsService.deleteCategory(id);
      loadCategories();
      toast('分类删除成功', 'success');
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast('删除失败，该分类下可能有商品', 'error');
    }
  };

  const openEditCategory = (category: Category) => {
    setEditCategory(category);
    setCategoryName(category.name);
    setCategoryDesc(category.description || '');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-50">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-80">商品管理</h2>
          <p className="text-slate-500 mt-1">管理商品信息和分类</p>
        </div>
        <div className="flex gap-2">
          <Link to="/products/new">
            <Button className="bg-orange-500 hover:bg-orange-600">+ 添加商品</Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">商品列表</TabsTrigger>
          <TabsTrigger value="categories">分类管理</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <ProductStats
            productCount={allProducts.length}
            categoryCount={categories.length}
            totalStock={allProducts.reduce((sum, p) => sum + p.stock, 0)}
          />

          <Card>
            <CardHeader>
              <ProductFilters
                categories={categories}
                selectedCategory={selectedCategory}
                stockFilter={stockFilter}
                searchTerm={searchTerm}
                onCategoryChange={setSelectedCategory}
                onStockFilterChange={setStockFilter}
                onSearchChange={setSearchTerm}
                onReset={handleResetFilters}
              />
            </CardHeader>
            <CardContent>
              <ProductTable
                products={tableProps.data}
                pagination={{
                  page: tableProps.page,
                  pageSize: tableProps.pageSize,
                  total: tableProps.total,
                }}
                onPageChange={tableProps.setPage}
                onPageSizeChange={tableProps.setPageSize}
                onDelete={setDeleteProduct}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>商品分类</CardTitle>
                  <CardDescription>管理商品分类</CardDescription>
                </div>
                <Button onClick={() => setShowCategoryDialog(true)}>+ 添加分类</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="p-3 border border-slate-200 rounded-lg hover:border-orange-300 transition-colors"
                  >
                    <div className="font-medium text-slate-80">{category.name}</div>
                    {category.description && (
                      <div className="text-xs text-slate-500 mt-1">{category.description}</div>
                    )}
                    <div className="text-xs text-slate-400 mt-2">
                      商品: {allProducts.filter(p => p.categoryId === category.id).length}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => openEditCategory(category)}
                        className="text-xs text-orange-500 hover:text-orange-600"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="text-xs text-red-500 hover:text-red-600"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
                {categories.length === 0 && (
                  <div className="col-span-full text-center py-8 text-slate-500">
                    暂无分类，请添加
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

      {/* 分类管理对话框 */}
      <Dialog
        open={showCategoryDialog}
        onOpenChange={(open) => {
          setShowCategoryDialog(open);
          if (!open) {
            setCategoryName('');
            setCategoryDesc('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加分类</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                分类名称 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="输入分类名称（支持批量：每行一个）"
                rows={6}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-slate-500 mt-1">
                💡 每行一个分类名称，可一次性添加多个
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">分类描述（批量时统一描述）</label>
              <Input
                value={categoryDesc}
                onChange={(e) => setCategoryDesc(e.target.value)}
                placeholder="输入分类描述（可选）"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddCategory}>添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editCategory}
        onOpenChange={(open) => {
          if (!open) {
            setEditCategory(null);
            setCategoryName('');
            setCategoryDesc('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑分类</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                分类名称 <span className="text-red-500">*</span>
              </label>
              <Input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">分类描述</label>
              <Input
                value={categoryDesc}
                onChange={(e) => setCategoryDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCategory(null)}>
              取消
            </Button>
            <Button onClick={handleUpdateCategory}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">数据说明</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• 商品管理用于维护商品信息，包括名称、分类、规格型号、库存上下限等核心数据</p>
          <p>• 商品的参考销售价用于销售单自动填充，进货价用于记录最近一次进货价格</p>
          <p>• 点击「添加商品」可新增商品，商品分类便于筛选和统计同类商品</p>
          <p>• 商品列表支持按分类、库存状态筛选，可搜索商品名称、规格、型号</p>
        </div>
      </div>
    </div>
  );
}
