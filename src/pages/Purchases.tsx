import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTablePagination, useDataTable } from '@/components/DataTable';
import { PhotoViewer } from '@/components/PhotoViewer';
import { db } from '@/lib/db';
import { sortByFrequency } from '@/lib/frequency';
import { generateBatchNo } from '@/lib/utils';
import type { Purchase, Product, Category, Supplier } from '@/lib/types';
import { toast } from '@/components/Toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  PurchaseStats,
  PurchaseFilters,
  PurchaseTable,
  PurchaseForm,
  PurchaseDetail,
  PurchaseReturn,
  PriceHistory,
} from '@/components/purchase';
import { useProducts, useCategories } from '@/hooks';

interface PurchaseItemRow {
  id: string;
  productId: string;
  quantity: string;
  unitPrice: string;
}

interface PurchaseForReturn {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  product: Product;
}

export function Purchases() {
  const [purchases, setPurchases] = useState<(Purchase & { product: Product })[]>([]);
  const [products, setProducts] = useState<(Product & { category: Category })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItemRow[]>([
    { id: '1', productId: '', quantity: '', unitPrice: '' }
  ]);
  const [commonSupplierId, setCommonSupplierId] = useState('');
  const [commonBatchNo, setCommonBatchNo] = useState('');
  const [commonRemark, setCommonRemark] = useState('');
  const [photos, setPhotos] = useState<{ id: string; file?: File; preview: string; remark: string; type: string }[]>([]);

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);

  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnPurchase, setReturnPurchase] = useState<PurchaseForReturn | null>(null);

  const [showPriceHistoryDialog, setShowPriceHistoryDialog] = useState(false);
  const [priceHistoryProduct, setPriceHistoryProduct] = useState<Product | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (showAddDialog) {
      loadProducts();
      loadSuppliers();
    }
  }, [showAddDialog]);

  const loadProducts = async () => {
    try {
      const productsData = await db.product.findMany({
        include: { category: true },
        orderBy: { name: 'asc' },
      });
      setProducts(productsData);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const loadSuppliers = async () => {
    try {
      const suppliersData = await db.supplier.findMany({
        orderBy: { name: 'asc' },
      });
      setSuppliers(sortByFrequency(suppliersData, 'supplier'));
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [purchasesData, categoriesData] = await Promise.all([
        db.purchase.findMany({
          include: { product: { include: { category: true } }, photos: true },
          orderBy: { purchaseDate: 'desc' },
          take: 100,
        }),
        db.category.findMany({ orderBy: { sortOrder: 'asc' } }),
      ]);

      setPurchases(purchasesData as any);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load purchases:', error);
      toast('加载进货记录失败，请刷新页面重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredPurchases = purchases.filter((p) => {
    const matchesSearch =
      !searchTerm ||
      p.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p as any).supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.batchNo?.toLowerCase().includes(searchTerm.toLowerCase());
    const purchaseDate = new Date(p.purchaseDate);
    const matchesDateStart = !dateRange.start || purchaseDate >= new Date(dateRange.start);
    const matchesDateEnd = !dateRange.end || purchaseDate <= new Date(dateRange.end + 'T23:59:59');
    return matchesSearch && matchesDateStart && matchesDateEnd;
  });

  const tableProps = useDataTable<Purchase & { product: Product }>({
    data: filteredPurchases,
    defaultPageSize: 20,
  });

  const handleAddPurchase = async () => {
    const validItems = purchaseItems.filter(item => item.productId && item.quantity && item.unitPrice);
    if (validItems.length === 0) {
      toast('请至少填写一行商品信息（商品、数量、单价）', 'warning');
      return;
    }

    for (const item of validItems) {
      const qty = parseInt(item.quantity);
      const price = parseFloat(item.unitPrice);
      if (isNaN(qty) || isNaN(price) || qty <= 0 || price <= 0) {
        toast('数量和单价必须是正数', 'warning');
        return;
      }
    }

    try {
      const supplier = commonSupplierId && commonSupplierId !== '__none__'
        ? suppliers.find(s => s.id === commonSupplierId)
        : null;
      const purchaseDate = new Date();

      const createdPurchases = [];
      for (const item of validItems) {
        const quantity = parseInt(item.quantity);
        const unitPrice = parseFloat(item.unitPrice);

        const purchase = await db.purchase.create({
          data: {
            productId: item.productId,
            quantity,
            unitPrice,
            totalAmount: quantity * unitPrice,
            supplierId: supplier?.id || null,
            supplierName: supplier?.name || null,
            batchNo: commonBatchNo || generateBatchNo(),
            purchaseDate,
            remark: commonRemark || null,
          },
        });
        createdPurchases.push(purchase);

        await db.product.update({
          where: { id: item.productId },
          data: { stock: { increment: quantity } },
        });
      }

      for (const photo of photos) {
        if (photo.file) {
          const dateStr = purchaseDate.toISOString().slice(0, 10).replace(/-/g, '');
          const photoTypeNames: Record<string, string> = {
            delivery: '送货单',
            signed: '签收单',
          };
          const typeName = photoTypeNames[photo.type] || photo.type;
          const ext = photo.file.name.split('.').pop() || 'jpg';
          const fileName = `${dateStr}_${createdPurchases[0].id}_${typeName}.${ext}`;

          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(photo.file);
          });

          await (window as any).electronAPI.photo.save(fileName, dataUrl, 'purchases');

          await db.purchasePhoto.create({
            data: {
              purchaseId: createdPurchases[0].id,
              photoPath: `purchases/${fileName}`,
              photoType: photo.type,
              photoRemark: photo.remark || null,
            },
          });
        }
      }

      setShowAddDialog(false);
      loadData();
      toast(`成功添加 ${createdPurchases.length} 条进货记录！`, 'success');
    } catch (error) {
      console.error('Failed to add purchase:', error);
      toast('添加失败，请重试', 'error');
    }
  };

  const handleViewPurchase = (purchaseId: string) => {
    setSelectedPurchaseId(purchaseId);
    setViewDialogOpen(true);
  };

  const handleViewPriceHistory = (product: Product) => {
    setPriceHistoryProduct(product);
    setShowPriceHistoryDialog(true);
  };

  const handleOpenReturn = (purchase: any) => {
    setReturnPurchase({
      id: purchase.id,
      productId: purchase.productId,
      quantity: purchase.quantity,
      unitPrice: purchase.unitPrice,
      product: purchase.product,
    });
    setShowReturnDialog(true);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setDateRange({ start: '', end: '' });
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
          <h2 className="text-2xl font-bold text-slate-800">进货管理</h2>
          <p className="text-slate-500 mt-1">管理商品进货记录和库存更新</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => setShowAddDialog(true)}>
          + 添加进货
        </Button>
      </div>

      <PurchaseStats purchases={purchases} />

      <Card>
        <CardHeader>
          <PurchaseFilters
            categories={categories}
            selectedCategory={selectedCategory}
            searchTerm={searchTerm}
            dateRange={dateRange}
            onCategoryChange={setSelectedCategory}
            onSearchChange={setSearchTerm}
            onDateRangeChange={setDateRange}
            onReset={handleResetFilters}
          />
        </CardHeader>
        <CardContent>
          <PurchaseTable
            purchases={filteredPurchases as any}
            pagination={{
              page: tableProps.page,
              pageSize: tableProps.pageSize,
              total: tableProps.total,
            }}
            onPageChange={tableProps.setPage}
            onPageSizeChange={tableProps.setPageSize}
            onView={handleViewPurchase}
            onViewPriceHistory={handleViewPriceHistory}
          />
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

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>添加进货记录</DialogTitle>
          </DialogHeader>
          <PurchaseForm
            open={showAddDialog}
            products={products}
            suppliers={suppliers}
            purchaseItems={purchaseItems}
            commonSupplierId={commonSupplierId}
            commonBatchNo={commonBatchNo}
            commonRemark={commonRemark}
            photos={photos}
            onOpenChange={setShowAddDialog}
            onItemsChange={setPurchaseItems}
            onSupplierChange={setCommonSupplierId}
            onBatchNoChange={setCommonBatchNo}
            onRemarkChange={setCommonRemark}
            onPhotosChange={setPhotos}
            onSubmit={handleAddPurchase}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">进货详情</DialogTitle>
          </DialogHeader>
          <PurchaseDetail
            purchaseId={selectedPurchaseId}
            open={viewDialogOpen}
            onOpenChange={setViewDialogOpen}
            onOpenReturn={handleOpenReturn}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>进货退货</DialogTitle>
          </DialogHeader>
          <PurchaseReturn
            purchase={returnPurchase}
            open={showReturnDialog}
            onOpenChange={setShowReturnDialog}
            onSuccess={loadData}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showPriceHistoryDialog} onOpenChange={setShowPriceHistoryDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              进货价格历史 - {priceHistoryProduct ? priceHistoryProduct.name : ''}
            </DialogTitle>
          </DialogHeader>
          <PriceHistory
            product={priceHistoryProduct}
            open={showPriceHistoryDialog}
            onOpenChange={setShowPriceHistoryDialog}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
