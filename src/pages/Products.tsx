import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { DataTablePagination, useDataTable } from '@/components/DataTable';
import { db } from '@/lib/db';
import type { Product, Category, ProductSpec } from '@/lib/types';
import { toast } from '@/components/Toast';
import { ProductStats, ProductFilters, ProductTable, ProductImport } from '@/components/product';
import { useProducts, useCategories } from '@/hooks';

interface ProductWithDetails extends Product {
  category: Category;
  productSpecs?: ProductSpec[];
}

interface ImportItem {
  productId: string;
  productName: string;
  quantity: number;
  price?: number;
}

export function Products() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [deleteProduct, setDeleteProduct] = useState<ProductWithDetails | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importItems, setImportItems] = useState<ImportItem[]>([]);

  const { products: allProducts, loading, refresh } = useProducts({
    includeCategory: true,
    includeSpecs: true,
    categoryId: selectedCategory === 'all' ? undefined : selectedCategory,
  });
  const { categories } = useCategories();

  const filteredProducts = allProducts.filter((p) => {
    const matchesSearch =
      !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.specification?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.model?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStock =
      stockFilter === 'all' ||
      (stockFilter === 'low' && p.stock > 0 && p.stock <= (p.minStock || 10)) ||
      (stockFilter === 'out' && p.stock === 0) ||
      (stockFilter === 'normal' && p.stock > (p.minStock || 10));
    return matchesSearch && matchesStock;
  });

  const tableProps = useDataTable<ProductWithDetails>({
    data: filteredProducts,
    defaultPageSize: 20,
  });

  const handleDelete = async () => {
    if (!deleteProduct) return;

    try {
      await db.product.delete({ where: { id: deleteProduct.id } });
      setDeleteProduct(null);
      refresh();
      toast('删除成功', 'success');
    } catch (error) {
      console.error('Failed to delete product:', error);
      toast('删除失败，请重试', 'error');
    }
  };

  const handleImportStock = async () => {
    if (importItems.length === 0) return;

    try {
      for (const item of importItems) {
        await db.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            referencePrice: item.price,
          },
        });
      }
      toast(`成功导入 ${importItems.length} 项库存`, 'success');
      setImportItems([]);
      setShowImportDialog(false);
      refresh();
    } catch (error) {
      console.error('[Products] 导入库存失败:', error);
      toast('导入失败，请重试', 'error');
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setStockFilter('all');
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            导入初始库存
          </Button>
          <Link to="/products/new">
            <Button className="bg-orange-500 hover:bg-orange-600">+ 添加商品</Button>
          </Link>
        </div>
      </div>

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
            products={filteredProducts}
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

      <Dialog open={showImportDialog} onOpenChange={(open) => {
        setShowImportDialog(open);
        if (!open) setImportItems([]);
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>导入初始库存</DialogTitle>
          </DialogHeader>
          <ProductImport
            products={allProducts}
            importItems={importItems}
            onItemsChange={setImportItems}
            onImport={handleImportStock}
            onCancel={() => {
              setShowImportDialog(false);
              setImportItems([]);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
