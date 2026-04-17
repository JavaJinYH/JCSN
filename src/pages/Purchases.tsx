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
import type { Purchase, Product, Category } from '@/lib/types';
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
    supplier: '',
    batchNo: '',
    remark: '',
  });
  const [photos, setPhotos] = useState<{ id: string; file?: File; preview: string; remark: string; type: string }[]>([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseWithDetails | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (showAddDialog) {
      loadProducts();
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
      p.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
          supplier: formData.supplier || null,
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
        supplier: '',
        batchNo: '',
        remark: '',
      });
      setPhotos([]);
      loadData();
      alert('进货记录添加成功！');
    } catch (error) {
      console.error('Failed to add purchase:', error);
      alert('添加失败，请重试');
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
                    <TableCell className="text-slate-500">{purchase.supplier || '-'}</TableCell>
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
              <Input
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="可选"
              />
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
                  <div>{selectedPurchase.supplier || '-'}</div>
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
    </div>
  );
}
