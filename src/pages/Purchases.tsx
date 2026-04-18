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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { PhotoUpload } from '@/components/PhotoUpload';
import { DataTablePagination, useDataTable } from '@/components/DataTable';
import { db } from '@/lib/db';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { Purchase, Product, Category, Supplier } from '@/lib/types';
import { PhotoViewer } from '@/components/PhotoViewer';
import { PhotoThumbnail } from '@/components/PhotoThumbnail';
import { toast } from '@/components/Toast';

interface PurchaseWithDetails extends Purchase {
  product: Product & { category: Category };
  photos: any[];
}

export function Purchases() {
  const [purchases, setPurchases] = useState<(Purchase & { product: Product })[]>([]);
  const [products, setProducts] = useState<(Product & { category: Category })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

  const [formData, setFormData] = useState({
    productId: '',
    quantity: '',
    unitPrice: '',
    supplierId: '',
    batchNo: '',
    remark: '',
  });
  const [photos, setPhotos] = useState<{ id: string; file?: File; preview: string; remark: string; type: string }[]>([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseWithDetails | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);

  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnPurchase, setReturnPurchase] = useState<PurchaseWithDetails | null>(null);
  const [returnQuantity, setReturnQuantity] = useState('');
  const [showMarketPriceDialog, setShowMarketPriceDialog] = useState(false);
  const [marketPrice, setMarketPrice] = useState('');

  const handleOpenReturnDialog = (purchase: PurchaseWithDetails) => {
    setReturnPurchase(purchase);
    setReturnQuantity('');
    setMarketPrice('');
    setShowReturnDialog(true);
  };

  const handleReturnConfirm = async () => {
    if (!returnPurchase || !returnQuantity) {
      toast('请填写退货数量', 'warning');
      return;
    }

    const qty = parseFloat(returnQuantity);
    if (qty <= 0 || qty > returnPurchase.quantity) {
      toast('退货数量必须大于0且不超过原进货数量', 'warning');
      return;
    }

    if (returnPurchase.product.isPriceVolatile && !marketPrice) {
      setShowMarketPriceDialog(true);
      return;
    }

    await createReturnRecord(qty, returnPurchase.product.isPriceVolatile ? parseFloat(marketPrice) : returnPurchase.unitPrice);
  };

  const createReturnRecord = async (qty: number, unitPrice: number) => {
    try {
      await db.purchaseReturn.create({
        data: {
          purchaseId: returnPurchase!.id,
          totalAmount: qty * unitPrice,
          items: {
            create: {
              productId: returnPurchase!.productId,
              returnQuantity: qty,
              unitPrice: unitPrice,
              amount: qty * unitPrice,
              marketPrice: returnPurchase!.product.isPriceVolatile ? unitPrice : null,
            },
          },
        },
      });

      await db.product.update({
        where: { id: returnPurchase!.productId },
        data: { stock: { decrement: qty } },
      });

      setShowReturnDialog(false);
      setShowMarketPriceDialog(false);
      setReturnQuantity('');
      setMarketPrice('');
      loadData();
      toast('退货记录创建成功！', 'success');
    } catch (error) {
      console.error('Failed to create return:', error);
      toast('退货失败，请重试', 'error');
    }
  };

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
      setSuppliers(suppliersData);
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

  const handleViewPurchase = async (purchaseId: string) => {
    setViewLoading(true);
    try {
      const purchaseData = await db.purchase.findUnique({
        where: { id: purchaseId },
        include: {
          product: { include: { category: true } },
          photos: true,
        },
      });
      if (purchaseData) {
        setSelectedPurchase(purchaseData as PurchaseWithDetails);
        setViewDialogOpen(true);
      }
    } catch (error) {
      console.error('Failed to load purchase details:', error);
      toast('加载进货详情失败，请重试', 'error');
    } finally {
      setViewLoading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) return false;
    if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

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
    if (!formData.productId || !formData.quantity || !formData.unitPrice) {
      toast('请填写必填项', 'warning');
      return;
    }

    try {
      const quantity = parseInt(formData.quantity);
      const unitPrice = parseFloat(formData.unitPrice);

      const purchase = await db.purchase.create({
        data: {
          productId: formData.productId,
          quantity,
          unitPrice,
          totalAmount: quantity * unitPrice,
          supplierId: formData.supplierId === '__none__' ? null : formData.supplierId,
          supplierName: formData.supplierId === '__none__' ? null : suppliers.find(s => s.id === formData.supplierId)?.name,
          batchNo: formData.batchNo || null,
          purchaseDate: new Date(),
          remark: formData.remark || null,
        },
      });

      // 保存照片
      for (const photo of photos) {
        if (photo.file) {
          const dateStr = new Date(purchase.purchaseDate).toISOString().slice(0, 10).replace(/-/g, '');
          const photoTypeNames: Record<string, string> = {
            delivery: '送货单',
            signed: '签收单',
          };
          const typeName = photoTypeNames[photo.type] || photo.type;
          const ext = photo.file.name.split('.').pop() || 'jpg';
          const fileName = `${dateStr}_${purchase.id}_${typeName}.${ext}`;

          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(photo.file);
          });

          await (window as any).electronAPI.photo.save(fileName, dataUrl, 'purchases');

          await db.purchasePhoto.create({
            data: {
              purchaseId: purchase.id,
              photoPath: `purchases/${fileName}`,
              photoType: photo.type,
              photoRemark: photo.remark || null,
            },
          });
        }
      }

      await db.product.update({
        where: { id: formData.productId },
        data: { stock: { increment: quantity } },
      });

      setShowAddDialog(false);
      setFormData({
        productId: '',
        quantity: '',
        unitPrice: '',
        supplierId: '',
        batchNo: '',
        remark: '',
      });
      setPhotos([]);
      loadData();
      toast('进货记录添加成功！', 'success');
    } catch (error) {
      console.error('Failed to add purchase:', error);
      toast('添加失败，请重试', 'error');
    }
  };

  const totalAmount = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalQuantity = purchases.reduce((sum, p) => sum + p.quantity, 0);

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-800">{purchases.length}</div>
            <div className="text-sm text-slate-500">进货记录数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{totalQuantity}</div>
            <div className="text-sm text-slate-500">进货商品总数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalAmount)}</div>
            <div className="text-sm text-slate-500">进货总金额</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">商品分类:</span>
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

            <Input
              placeholder="搜索商品名称、供应商..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48 h-8"
            />

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">日期:</span>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                className="w-32 h-8"
              />
              <span className="text-slate-400">至</span>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                className="w-32 h-8"
              />
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setDateRange({ start: '', end: '' });
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
                <TableHead>进货日期</TableHead>
                <TableHead>商品名称</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>批次号</TableHead>
                <TableHead className="text-right">数量</TableHead>
                <TableHead className="text-right">单价</TableHead>
                <TableHead className="text-right">金额</TableHead>
                <TableHead>供应商</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableProps.total === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                    暂无进货记录
                  </TableCell>
                </TableRow>
              ) : (
                tableProps.data.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell>{formatDateTime(purchase.purchaseDate)}</TableCell>
                    <TableCell className="font-medium">{purchase.product.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{purchase.product.category?.name || '-'}</Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">{purchase.batchNo || '-'}</TableCell>
                    <TableCell className="text-right font-mono">{purchase.quantity}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(purchase.unitPrice)}</TableCell>
                    <TableCell className="text-right font-mono text-green-600">{formatCurrency(purchase.totalAmount)}</TableCell>
                    <TableCell className="text-slate-500">{(purchase as any).supplier?.name || purchase.supplierName || '-'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleViewPurchase(purchase.id)}>
                        查看
                      </Button>
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

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>添加进货记录</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                商品分类
              </label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                商品 <span className="text-red-500">*</span>
              </label>
              <Select value={formData.productId} onValueChange={(v) => setFormData({ ...formData, productId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="选择商品" />
                </SelectTrigger>
                <SelectContent>
                  {filteredProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.specification ? `(${p.specification})` : ''} - 库存: {p.stock}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  进货数量 <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="0"
                  min="1"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  进货单价 (元) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">批次号</label>
              <Input
                value={formData.batchNo}
                onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                placeholder="可选"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">供应商</label>
              <Select value={formData.supplierId} onValueChange={(v) => setFormData({ ...formData, supplierId: v })}>
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

            <div>
              <label className="text-sm font-medium mb-2 block">备注</label>
              <Input
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                placeholder="可选"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">单据照片</label>
              <PhotoUpload
                photos={photos}
                onChange={setPhotos}
                maxPhotos={2}
              />
            </div>

            {formData.quantity && formData.unitPrice && (
              <div className="bg-slate-50 p-3 rounded-lg">
                <div className="text-sm text-slate-500">进货总额</div>
                <div className="text-xl font-bold text-green-600">
                  {formatCurrency(parseInt(formData.quantity) * parseFloat(formData.unitPrice || '0'))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
            <Button onClick={handleAddPurchase}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">进货详情</DialogTitle>
          </DialogHeader>
          {selectedPurchase && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-slate-500">进货日期</div>
                  <div>{formatDateTime(selectedPurchase.purchaseDate)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">商品名称</div>
                  <div className="font-bold">{selectedPurchase.product?.name || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">商品分类</div>
                  <div><Badge variant="secondary">{selectedPurchase.product?.category?.name || '-'}</Badge></div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">批次号</div>
                  <div className="font-mono">{selectedPurchase.batchNo || '-'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-slate-500">供应商</div>
                  <div>{selectedPurchase.supplier?.name || selectedPurchase.supplierName || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">进货数量</div>
                  <div className="text-lg font-bold">{selectedPurchase.quantity}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">进货单价</div>
                  <div className="text-lg font-bold font-mono">{formatCurrency(selectedPurchase.unitPrice)}</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm text-slate-500">进货总额</div>
                  <div className="text-xl font-bold font-mono text-green-600">{formatCurrency(selectedPurchase.totalAmount)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-500">商品规格</div>
                  <div>{selectedPurchase.product?.specification || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">单位</div>
                  <div>{selectedPurchase.product?.unit || '-'}</div>
                </div>
              </div>

              {selectedPurchase.photos && selectedPurchase.photos.length > 0 && (
                <div>
                  <h3 className="font-bold text-slate-700 mb-2">单据照片 ({selectedPurchase.photos.length})</h3>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {selectedPurchase.photos.map((photo: any, index: number) => (
                      <PhotoThumbnail
                        key={photo.id}
                        photo={photo}
                        onClick={() => {
                          setPhotoViewerIndex(index);
                          setPhotoViewerOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {selectedPurchase.remark && (
                <div>
                  <h3 className="font-bold text-slate-700 mb-2">备注</h3>
                  <div className="bg-slate-50 p-3 rounded-lg text-slate-600">{selectedPurchase.remark}</div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewDialogOpen(false);
                    handleOpenReturnDialog(selectedPurchase);
                  }}
                >
                  退货
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedPurchase && selectedPurchase.photos && selectedPurchase.photos.length > 0 && (
        <PhotoViewer
          photos={selectedPurchase.photos as any}
          open={photoViewerOpen}
          onOpenChange={setPhotoViewerOpen}
          initialIndex={photoViewerIndex}
        />
      )}

      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>进货退货</DialogTitle>
          </DialogHeader>
          {returnPurchase && (
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                <div className="text-sm text-slate-500">商品名称</div>
                <div className="font-bold">{returnPurchase.product.name}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-500">原进货数量</div>
                  <div className="font-bold">{returnPurchase.quantity}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">原进货单价</div>
                  <div className="font-bold font-mono">{formatCurrency(returnPurchase.unitPrice)}</div>
                </div>
              </div>

              {returnPurchase.product.isPriceVolatile && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-sm">
                  <span className="text-yellow-700">⚠️ 这是价格波动商品，退货时需要输入当日市场价格</span>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">
                  退货数量 <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  value={returnQuantity}
                  onChange={(e) => setReturnQuantity(e.target.value)}
                  placeholder="0"
                  min="1"
                  max={returnPurchase.quantity}
                />
                <div className="text-xs text-slate-500 mt-1">
                  最多可退: {returnPurchase.quantity} {returnPurchase.product.unit}
                </div>
              </div>

              {returnQuantity && (
                <div className="bg-orange-50 p-3 rounded-lg">
                  <div className="text-sm text-slate-500">退货金额</div>
                  <div className="text-xl font-bold text-orange-600">
                    {returnPurchase.product.isPriceVolatile
                      ? marketPrice
                        ? formatCurrency(parseFloat(returnQuantity) * parseFloat(marketPrice))
                        : '需输入市场价'
                      : formatCurrency(parseFloat(returnQuantity) * returnPurchase.unitPrice)}
                  </div>
                  {returnPurchase.product.isPriceVolatile && !marketPrice && (
                    <div className="text-xs text-orange-600 mt-1">请在下方输入今日的市场价</div>
                  )}
                </div>
              )}

              {returnPurchase.product.isPriceVolatile && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    今日市场价 (元) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    value={marketPrice}
                    onChange={(e) => setMarketPrice(e.target.value)}
                    placeholder="请输入今日市场价格"
                    min="0"
                    step="0.01"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturnDialog(false)}>取消</Button>
            <Button onClick={handleReturnConfirm}>确认退货</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMarketPriceDialog} onOpenChange={setShowMarketPriceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>输入今日市场价格</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600 mb-4">
              <span className="font-bold">{returnPurchase?.product.name}</span> 是价格波动商品，请输入今日的市场价格：
            </p>
            <Input
              type="number"
              value={marketPrice}
              onChange={(e) => setMarketPrice(e.target.value)}
              placeholder="今日市场价格"
              min="0"
              step="0.01"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMarketPriceDialog(false)}>取消</Button>
            <Button
              onClick={() => {
                setShowMarketPriceDialog(false);
                if (returnPurchase && returnQuantity && marketPrice) {
                  createReturnRecord(parseFloat(returnQuantity), parseFloat(marketPrice));
                }
              }}
            >
              确认市场价
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
