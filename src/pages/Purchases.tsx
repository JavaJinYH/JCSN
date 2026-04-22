import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTablePagination, useDataTable } from '@/components/DataTable';
import { sortByFrequency } from '@/lib/frequency';
import { generateBatchNo, formatCurrency, formatDateTime } from '@/lib/utils';
import type { PurchaseOrder, Purchase, Product, Category, Supplier } from '@/lib/types';
import { PurchaseService } from '@/services';
import { toast } from '@/components/Toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PurchaseStats,
  PurchaseFilters,
  PurchaseReturn,
  PriceHistory,
} from '@/components/purchase';
import { Combobox } from '@/components/Combobox';
import { PhotoUpload } from '@/components/PhotoUpload';
import { PhotoThumbnail } from '@/components/PhotoThumbnail';
import { PhotoViewer } from '@/components/PhotoViewer';
import { PrintPreviewDialog } from '@/components/PrintPreviewDialog';

interface PurchaseItemRow {
  id: string;
  productId: string;
  quantity: string;
  unitPrice: string;
}

interface PurchaseForReturn {
  id: string;
  orderId: string | null;
  productId: string;
  quantity: number;
  unitPrice: number;
  supplierId: string | null;
  supplierName: string | null;
  pendingReturnQty: number;
  product: Product;
}

interface PurchaseOrderWithItems extends PurchaseOrder {
  items: (Purchase & { product: Product })[];
}

const statusLabels: Record<string, { label: string; variant: 'secondary' | 'default' | 'outline' }> = {
  draft: { label: '草稿', variant: 'secondary' },
  sent: { label: '已发送', variant: 'default' },
  delivered: { label: '已到货', variant: 'default' },
  completed: { label: '已完成', variant: 'outline' },
};

export function Purchases() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const initialStatus = searchParams.get('status') || 'all';

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderWithItems[]>([]);
  const [products, setProducts] = useState<(Product & { category: Category })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const prefilledDataRef = useRef<any[] | null>(null);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItemRow[]>([
    { id: '1', productId: '', quantity: '', unitPrice: '' }
  ]);
  const [commonSupplierId, setCommonSupplierId] = useState('');
  const [commonBatchNo, setCommonBatchNo] = useState('');
  const [commonRemark, setCommonRemark] = useState('');
  const [needDelivery, setNeedDelivery] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [estimatedDate, setEstimatedDate] = useState('');
  const [photos, setPhotos] = useState<{ id: string; file?: File; preview: string; remark: string; type: string }[]>([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentRemark, setPaymentRemark] = useState('');

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnPurchase, setReturnPurchase] = useState<PurchaseForReturn | null>(null);
  const [returnOrderStatus, setReturnOrderStatus] = useState<string>('draft');

  const [showPriceHistoryDialog, setShowPriceHistoryDialog] = useState(false);
  const [priceHistoryProduct, setPriceHistoryProduct] = useState<Product | null>(null);

  const state = location.state as { openAdd?: boolean; prefilledItems?: any[] } | null;
  if (state?.openAdd && state?.prefilledItems && !prefilledDataRef.current) {
    prefilledDataRef.current = state.prefilledItems;
  }

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  useEffect(() => {
    if (prefilledDataRef.current && prefilledDataRef.current.length > 0 && products.length > 0) {
      setPurchaseItems(prefilledDataRef.current.map((item: any, index: number) => ({
        id: String(index + 1),
        productId: String(item.productId),
        quantity: String(item.quantity),
        unitPrice: String(item.unitPrice),
      })));
      setShowAddDialog(true);
      prefilledDataRef.current = null;
      navigate('.', { replace: true });
    }
  }, [products]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersData, categoriesData, productsData, suppliersData] = await Promise.all([
        PurchaseService.getPurchaseOrders({ status: statusFilter !== 'all' ? statusFilter : undefined }),
        PurchaseService.getCategories(),
        PurchaseService.getProducts(),
        PurchaseService.getSuppliers(),
      ]);

      setPurchaseOrders(ordersData as PurchaseOrderWithItems[]);
      setCategories(categoriesData);
      setProducts(productsData);
      setSuppliers(sortByFrequency(suppliersData, 'supplier'));
    } catch (error) {
      console.error('Failed to load purchases:', error);
      toast('加载进货记录失败，请刷新页面重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = purchaseOrders.filter((order) => {
    // 供应商筛选
    const matchesSupplier =
      selectedSupplier === 'all' ||
      order.supplier?.id === selectedSupplier ||
      order.supplierId === selectedSupplier;

    // 搜索筛选
    const matchesSearch =
      !searchTerm ||
      order.batchNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items.some(item => item.product?.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // 日期筛选
    const purchaseDate = new Date(order.purchaseDate);
    const matchesDateStart = !dateRange.start || purchaseDate >= new Date(dateRange.start);
    const matchesDateEnd = !dateRange.end || purchaseDate <= new Date(dateRange.end + 'T23:59:59');

    return matchesSupplier && matchesSearch && matchesDateStart && matchesDateEnd;
  });

  const tableProps = useDataTable<PurchaseOrderWithItems>({
    data: filteredOrders,
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

      const result = await PurchaseService.createPurchaseOrder({
        items: validItems.map(item => ({
          productId: item.productId,
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
        })),
        supplierId: supplier?.id || null,
        supplierName: supplier?.name || null,
        commonBatchNo: commonBatchNo || undefined,
        commonRemark: commonRemark || null,
        needDelivery,
        driverName: driverName || null,
        driverPhone: driverPhone || null,
        estimatedDeliveryDate: needDelivery && estimatedDate ? new Date(estimatedDate) : null,
        photos: photos,
        paymentAmount: paymentAmount ? parseFloat(paymentAmount) : undefined,
        paymentMethod: paymentMethod || undefined,
        paymentRemark: paymentRemark || undefined,
      });

      setShowAddDialog(false);
      setPurchaseItems([{ id: '1', productId: '', quantity: '', unitPrice: '' }]);
      setCommonSupplierId('');
      setCommonBatchNo('');
      setCommonRemark('');
      setNeedDelivery(false);
      setDriverName('');
      setDriverPhone('');
      setEstimatedDate('');
      setPhotos([]);
      setPaymentAmount('');
      setPaymentMethod('');
      setPaymentRemark('');
      loadData();
      toast(`成功添加进货单，包含 ${validItems.length} 种商品！`, 'success');
    } catch (error) {
      console.error('Failed to add purchase:', error);
      toast('添加失败，请重试', 'error');
    }
  };

  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setViewDialogOpen(true);
  };

  const handleViewPriceHistory = (product: Product) => {
    setPriceHistoryProduct(product);
    setShowPriceHistoryDialog(true);
  };

  const handleOpenReturn = (purchase: any, orderStatus: string) => {
    setReturnPurchase({
      id: purchase.id,
      orderId: purchase.orderId || null,
      productId: purchase.productId,
      quantity: purchase.quantity,
      unitPrice: purchase.unitPrice,
      supplierId: purchase.supplierId || null,
      supplierName: purchase.supplier?.name || purchase.supplierName || null,
      pendingReturnQty: purchase.pendingReturnQty || 0,
      product: purchase.product,
    });
    setReturnOrderStatus(orderStatus);
    setShowReturnDialog(true);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedSupplier('all');
    setDateRange({ start: '', end: '' });
    setStatusFilter('all');
  };

  const totalOrderAmount = (order: PurchaseOrderWithItems) => {
    return order.items.reduce((sum, item) => sum + item.totalAmount, 0);
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

      <PurchaseStats purchases={purchaseOrders.flatMap(o => o.items)} />

      <Card>
        <CardHeader>
          <PurchaseFilters
            suppliers={suppliers}
            selectedSupplier={selectedSupplier}
            searchTerm={searchTerm}
            dateRange={dateRange}
            statusFilter={statusFilter}
            onSupplierChange={setSelectedSupplier}
            onSearchChange={setSearchTerm}
            onDateRangeChange={setDateRange}
            onStatusChange={setStatusFilter}
            onReset={handleResetFilters}
          />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tableProps.data.map((order) => {
              const statusInfo = statusLabels[order.status] || { label: order.status, variant: 'secondary' as const };
              return (
                <div key={order.id} className="border rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => handleViewOrder(order.id)}>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-slate-800">
                          {order.batchNo || order.id.slice(-8)}
                        </span>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        {order.supplier?.name && (
                          <span className="text-sm text-slate-500">供应商: {order.supplier.name}</span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500 mt-1">
                        {formatDateTime(order.purchaseDate)} | {order.items.length} 种商品
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(totalOrderAmount(order))}
                      </div>
                      <div className="text-sm text-slate-500">进货总额</div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t">
                    <div className="text-sm font-medium text-slate-700 mb-2">商品明细:</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                          <div>
                            <span className="font-medium">{item.product?.name}</span>
                            <span className="text-slate-500 ml-2">x{item.quantity}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono">{formatCurrency(item.totalAmount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {order.remark && (
                    <div className="mt-2 text-sm text-slate-500">
                      备注: {order.remark}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
            <DialogTitle>添加进货单</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-orange-50 p-3 rounded-lg text-sm text-orange-700">
              提示：可以添加多行商品，一次性完成多种商品的进货记录
            </div>

            <div className="max-h-64 overflow-y-auto border rounded-lg">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-2 text-sm font-medium">操作</th>
                    <th className="text-left p-2 text-sm font-medium">商品</th>
                    <th className="text-left p-2 text-sm font-medium w-24">数量</th>
                    <th className="text-left p-2 text-sm font-medium w-28">单价 (元)</th>
                    <th className="text-right p-2 text-sm font-medium w-28">小计 (元)</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseItems.map((item) => {
                    const subtotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
                    return (
                      <tr key={item.id} className="border-t">
                        <td className="p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (purchaseItems.length > 1) {
                                setPurchaseItems(purchaseItems.filter(i => i.id !== item.id));
                              }
                            }}
                            className="text-red-500 hover:text-red-700 h-8"
                          >
                            删除
                          </Button>
                        </td>
                        <td className="p-2">
                          <Combobox
                            value={item.productId}
                            onValueChange={(v) => {
                              const newItems = purchaseItems.map(i =>
                                i.id === item.id ? { ...i, productId: v } : i
                              );
                              setPurchaseItems(newItems);
                            }}
                            options={products.map((p) => ({
                              value: p.id,
                              label: `${p.name}${p.specification ? ` (${p.specification})` : ''}`,
                            }))}
                            placeholder="搜索商品..."
                            emptyText="没有找到商品"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const newItems = purchaseItems.map(i =>
                                i.id === item.id ? { ...i, quantity: e.target.value } : i
                              );
                              setPurchaseItems(newItems);
                            }}
                            className="h-8"
                            placeholder="数量"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => {
                              const newItems = purchaseItems.map(i =>
                                i.id === item.id ? { ...i, unitPrice: e.target.value } : i
                              );
                              setPurchaseItems(newItems);
                            }}
                            className="h-8"
                            placeholder="单价"
                          />
                        </td>
                        <td className="p-2 text-right font-mono">
                          {formatCurrency(subtotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setPurchaseItems([...purchaseItems, {
                  id: String(Date.now()),
                  productId: '',
                  quantity: '',
                  unitPrice: ''
                }]);
              }}
              className="w-full"
            >
              + 添加商品
            </Button>

            <div className="bg-slate-50 p-3 rounded-lg flex justify-between items-center">
              <div className="text-sm text-slate-500">
                共 {purchaseItems.filter(item => item.productId).length} 种商品
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-500">进货总额</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(purchaseItems.reduce((sum, item) => {
                    return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
                  }, 0))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">批次号</label>
                <Input
                  value={commonBatchNo}
                  onChange={(e) => setCommonBatchNo(e.target.value)}
                  placeholder="留空自动生成"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">供应商</label>
                <Select value={commonSupplierId} onValueChange={(v) => setCommonSupplierId(v)}>
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
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">备注</label>
              <Input
                value={commonRemark}
                onChange={(e) => setCommonRemark(e.target.value)}
                placeholder="可选"
              />
            </div>

            <div className="border-t pt-4">
              <div className="text-sm font-medium mb-3 flex items-center gap-2">
                <span>💰 付款信息</span>
                <span className="text-slate-400 font-normal">(可选，不填则全额挂账)</span>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">本次付款金额</label>
                    <Input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">付款方式</label>
                    <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择方式（可选）" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">现金</SelectItem>
                        <SelectItem value="wechat">微信</SelectItem>
                        <SelectItem value="alipay">支付宝</SelectItem>
                        <SelectItem value="transfer">银行转账</SelectItem>
                        <SelectItem value="other">其他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {paymentAmount && commonSupplierId && commonSupplierId !== '__none__' && (
                  <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
                    付款后，仍欠供应商：<span className="font-bold">{formatCurrency(purchaseItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0), 0) - parseFloat(paymentAmount))}</span> 元
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium mb-2 block">付款备注</label>
                  <Input
                    value={paymentRemark}
                    onChange={(e) => setPaymentRemark(e.target.value)}
                    placeholder="可选，如：预付定金"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-3 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={needDelivery}
                    onChange={(e) => setNeedDelivery(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium">需要供应商配送</span>
                </label>
              </div>

              {needDelivery && (
                <div className="space-y-3 pl-2 border-l-2 border-blue-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500">司机/联系人</span>
                      <Input
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        placeholder="司机姓名（可选）"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500">联系电话</span>
                      <Input
                        value={driverPhone}
                        onChange={(e) => setDriverPhone(e.target.value)}
                        placeholder="司机电话（可选）"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-slate-500">预计到货日期</span>
                    <Input
                      type="date"
                      value={estimatedDate}
                      onChange={(e) => setEstimatedDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">单据照片</label>
              <PhotoUpload
                photos={photos}
                onChange={setPhotos}
                maxPhotos={2}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
              <Button onClick={handleAddPurchase} className="bg-orange-500 hover:bg-orange-600">保存</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">进货单详情</DialogTitle>
          </DialogHeader>
          {selectedOrderId && (
            <OrderDetail
              orderId={selectedOrderId}
              open={viewDialogOpen}
              onOpenChange={setViewDialogOpen}
              onOpenReturn={handleOpenReturn}
              onViewPriceHistory={handleViewPriceHistory}
              onStatusChange={loadData}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>进货退货</DialogTitle>
          </DialogHeader>
          <PurchaseReturn
            purchase={returnPurchase}
            orderStatus={returnOrderStatus}
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

function OrderDetail({
  orderId,
  open,
  onOpenChange,
  onOpenReturn,
  onViewPriceHistory,
  onStatusChange,
}: {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenReturn: (purchase: any, orderStatus: string) => void;
  onViewPriceHistory: (product: Product) => void;
  onStatusChange: () => void;
}) {
  const [order, setOrder] = useState<PurchaseOrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnitPrice, setEditUnitPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPhotoUploadDialog, setShowPhotoUploadDialog] = useState(false);
  const [uploadPhotos, setUploadPhotos] = useState<{ id: string; file?: File; preview: string; remark: string; type: string }[]>([]);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [showDeliveryConfirmDialog, setShowDeliveryConfirmDialog] = useState(false);
  const [actualQuantities, setActualQuantities] = useState<{ [itemId: string]: string }>({});

  useEffect(() => {
    if (open && orderId) {
      loadOrder();
    }
  }, [open, orderId]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const data = await PurchaseService.getPurchaseOrderById(orderId);
      setOrder(data as PurchaseOrderWithItems);
    } catch (error) {
      console.error('[OrderDetail] 加载失败:', error);
      toast('加载详情失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = (item: any) => {
    setEditingItemId(item.id);
    setEditQuantity(item.quantity.toString());
    setEditUnitPrice(item.unitPrice.toString());
  };

  const handleSaveEdit = async () => {
    if (!order || !editingItemId) return;
    const qty = parseInt(editQuantity);
    const price = parseFloat(editUnitPrice);
    if (isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) {
      toast('数量和单价必须是正数', 'warning');
      return;
    }

    setSaving(true);
    try {
      await PurchaseService.updatePurchase(editingItemId, {
        quantity: qty,
        unitPrice: price,
        totalAmount: qty * price,
      });
      setEditingItemId(null);
      loadOrder();
      toast('保存成功', 'success');
    } catch (error) {
      console.error('[OrderDetail] 保存失败:', error);
      toast('保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!order) return;
    if (order.items.length <= 1) {
      toast('至少要保留一个商品', 'warning');
      return;
    }

    try {
      await PurchaseService.deletePurchase(itemId);
      loadOrder();
      toast('删除成功', 'success');
    } catch (error) {
      console.error('[OrderDetail] 删除失败:', error);
      toast('删除失败', 'error');
    }
  };

  const handleSendToSupplier = async () => {
    if (!order) return;
    setSaving(true);
    try {
      await PurchaseService.updatePurchaseOrderStatus(order.id, 'sent');
      loadOrder();
      onStatusChange();
      toast('已发送给供应商', 'success');
    } catch (error) {
      console.error('[OrderDetail] 发送失败:', error);
      toast('操作失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!order) return;
    setSaving(true);
    try {
      const quantities: { [key: string]: number } = {};
      order.items.forEach(item => {
        quantities[item.id] = item.quantity;
      });
      await PurchaseService.confirmPurchaseDelivery(order.id, quantities);
      loadOrder();
      onStatusChange();
      toast('已确认到货，库存已增加', 'success');
      // 建议上传签收单
      setTimeout(() => {
        setShowPhotoUploadDialog(true);
      }, 500);
    } catch (error) {
      console.error('[OrderDetail] 确认到货失败:', error);
      toast('操作失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadPhotos = async () => {
    if (!order || uploadPhotos.length === 0) {
      setShowPhotoUploadDialog(false);
      setUploadPhotos([]);
      return;
    }

    setSaving(true);
    try {
      for (const photo of uploadPhotos) {
        if (photo.file) {
          const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const fileName = `${dateStr}_${order.id}_${photo.type || 'signed'}_${Date.now()}.${photo.file.name.split('.').pop() || 'jpg'}`;

          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(photo.file);
          });

          await (window as any).electronAPI.photo.save(fileName, dataUrl, 'purchases');

          // 为订单中的第一个商品添加照片关联（因为照片是属于订单级别的，但数据库只支持关联到单个采购项）
          // 未来可以改进数据库结构，支持订单级别的照片
          if (order.items.length > 0) {
            await PurchaseService.createPurchasePhoto(order.items[0].id, {
              url: `purchases/${fileName}`,
              type: photo.type || 'signed',
              remark: photo.remark || undefined,
            });
          }
        }
      }
      loadOrder();
      onStatusChange();
      setShowPhotoUploadDialog(false);
      setUploadPhotos([]);
      toast('照片上传成功', 'success');
    } catch (error) {
      console.error('[OrderDetail] 照片上传失败:', error);
      toast('照片上传失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getAllPhotos = () => {
    if (!order) return [];
    // 收集所有商品的照片
    const allPhotos: any[] = [];
    order.items.forEach(item => {
      if (item.photos) {
        allPhotos.push(...item.photos);
      }
    });
    return allPhotos;
  };

  const handleComplete = async () => {
    if (!order) return;
    setSaving(true);
    try {
      await PurchaseService.updatePurchaseOrderStatus(order.id, 'completed');
      loadOrder();
      onStatusChange();
      toast('进货单已完成', 'success');
    } catch (error) {
      console.error('[OrderDetail] 完成失败:', error);
      toast('操作失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  if (loading) {
    return <div className="text-center py-8 text-slate-500">加载中...</div>;
  }

  if (!order) {
    return <div className="text-center py-8 text-slate-500">未找到订单</div>;
  }

  const statusInfo = statusLabels[order.status] || { label: order.status, variant: 'secondary' as const };
  const totalAmount = order.items.reduce((sum, item) => sum + item.totalAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant={statusInfo.variant} className="text-sm px-3 py-1">{statusInfo.label}</Badge>
          <span className="font-medium text-slate-800">
            {order.batchNo || order.id.slice(-8)}
          </span>
          <Button onClick={() => setPrintDialogOpen(true)} variant="outline" size="sm">
            🖨️ 打印
          </Button>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-500">进货总额</div>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(totalAmount)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div className="text-sm text-slate-500">进货日期</div>
          <div>{formatDateTime(order.purchaseDate)}</div>
        </div>
        <div>
          <div className="text-sm text-slate-500">供应商</div>
          <div>{order.supplier?.name || order.supplierName || '-'}</div>
        </div>
        <div>
          <div className="text-sm text-slate-500">商品种类</div>
          <div>{order.items.length} 种</div>
        </div>
        <div>
          <div className="text-sm text-slate-500">商品总数</div>
          <div>{order.items.reduce((sum, item) => sum + item.quantity, 0)} 件</div>
        </div>
      </div>

      {order.remark && (
        <div>
          <div className="text-sm text-slate-500">备注</div>
          <div className="bg-slate-50 p-2 rounded">{order.remark}</div>
        </div>
      )}

      <div className="flex gap-2">
        {order.status === 'draft' && (
          <Button
            onClick={handleSendToSupplier}
            disabled={saving}
            className="bg-orange-500 hover:bg-orange-600"
          >
            发送给供应商
          </Button>
        )}
        {order.status === 'sent' && (
          <Button
            onClick={() => {
              const initial: { [key: string]: string } = {};
              order.items.forEach(item => {
                initial[item.id] = item.quantity.toString();
              });
              setActualQuantities(initial);
              setShowDeliveryConfirmDialog(true);
            }}
            disabled={saving}
            className="bg-green-500 hover:bg-green-600"
          >
            确认到货
          </Button>
        )}
        {order.status === 'delivered' && (
          <Button
            onClick={handleComplete}
            disabled={saving}
          >
            完成入库
          </Button>
        )}
      </div>

      <div>
        <div className="text-sm font-medium text-slate-700 mb-2">商品明细</div>
        <div className="space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="p-3 bg-slate-50 rounded-lg">
              {editingItemId === item.id ? (
                <div className="space-y-3">
                  <div className="font-medium">{item.product?.name}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500">数量</label>
                      <Input
                        type="number"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">单价</label>
                      <Input
                        type="number"
                        value={editUnitPrice}
                        onChange={(e) => setEditUnitPrice(e.target.value)}
                        className="h-8"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                      保存
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingItemId(null)}>
                      取消
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{item.product?.name}</div>
                      <div className="text-sm text-slate-500">
                        {item.product?.category?.name} | {item.product?.specification || '-'} | {item.product?.unit || '-'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">x{item.quantity}</div>
                      <div className="text-sm text-slate-500">单价: {formatCurrency(item.unitPrice)}</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t">
                    <div className="font-medium text-green-600">{formatCurrency(item.totalAmount)}</div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewPriceHistory(item.product!)}
                      >
                        价格历史
                      </Button>
                      {order.status === 'draft' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditItem(item)}
                          >
                            编辑
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            删除
                          </Button>
                        </>
                      )}
                      {(order.status === 'sent' || order.status === 'delivered' || order.status === 'completed') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onOpenReturn(item, order.status)}
                        >
                          退货/换货
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 显示已上传的照片 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-slate-700">单据照片</div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPhotoUploadDialog(true)}
          >
            + 添加照片
          </Button>
        </div>
        {getAllPhotos().length > 0 ? (
          <div className="grid grid-cols-4 gap-3">
            {getAllPhotos().map((photo, index) => (
              <div
                key={photo.id}
                onClick={() => {
                  setPhotoViewerIndex(index);
                  setShowPhotoViewer(true);
                }}
              >
                <PhotoThumbnail
                  photo={photo}
                  onClick={() => {
                    setPhotoViewerIndex(index);
                    setShowPhotoViewer(true);
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <div className="text-3xl mb-2">📷</div>
            <div>暂无照片</div>
          </div>
        )}
      </div>

      {/* 照片上传对话框 */}
      <Dialog open={showPhotoUploadDialog} onOpenChange={setShowPhotoUploadDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>上传单据照片</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
              建议上传签字确认单，方便年底对账（可选）
            </div>
            <PhotoUpload
              photos={uploadPhotos}
              onChange={setUploadPhotos}
              maxPhotos={5}
            />
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPhotoUploadDialog(false);
                  setUploadPhotos([]);
                }}
                disabled={saving}
              >
                取消
              </Button>
              <Button
                onClick={handleUploadPhotos}
                disabled={saving}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {saving ? '上传中...' : '上传照片'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 确认到货对话框 */}
      <Dialog open={showDeliveryConfirmDialog} onOpenChange={setShowDeliveryConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>确认到货</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-sm">
              <p className="text-yellow-700">
                <strong>提示：</strong>请核对实际到货数量。如有缺货，请修改为实际数量。
              </p>
            </div>

            <div className="space-y-3">
              {order.items.map((item) => {
                const orderedQty = item.quantity;
                const actualQty = actualQuantities[item.id] || orderedQty.toString();
                const shortage = orderedQty - parseInt(actualQty || '0');
                return (
                  <div key={item.id} className="border rounded-lg p-3">
                    <div className="font-medium mb-2">{item.product?.name}</div>
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <div>
                        <div className="text-xs text-slate-500">订购数量</div>
                        <div className="font-bold">{orderedQty}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">实际到货</div>
                        <Input
                          type="number"
                          value={actualQty}
                          onChange={(e) => setActualQuantities(prev => ({
                            ...prev,
                            [item.id]: e.target.value
                          }))}
                          className="h-8"
                          min="0"
                          max={orderedQty}
                        />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">缺货</div>
                        <div className={`font-bold ${shortage > 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {shortage > 0 ? shortage : '无'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDeliveryConfirmDialog(false)}>
                取消
              </Button>
              <Button
                onClick={async () => {
                  setSaving(true);
                  try {
                    const quantities: { [key: string]: number } = {};
                    order.items.forEach(item => {
                      quantities[item.id] = parseInt(actualQuantities[item.id] || '0');
                    });
                    await PurchaseService.confirmPurchaseDelivery(order.id, quantities);
                    setShowDeliveryConfirmDialog(false);
                    loadOrder();
                    onStatusChange();
                    toast('已确认到货', 'success');
                    setTimeout(() => {
                      setShowPhotoUploadDialog(true);
                    }, 500);
                  } catch (error) {
                    console.error('[OrderDetail] 确认到货失败:', error);
                    toast('操作失败', 'error');
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="bg-green-500 hover:bg-green-600"
              >
                确认入库
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 照片查看器 */}
      {showPhotoViewer && (
        <PhotoViewer
          photos={getAllPhotos()}
          open={showPhotoViewer}
          onOpenChange={setShowPhotoViewer}
          initialIndex={photoViewerIndex}
        />
      )}

      <PrintPreviewDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        slipData={{
          batchNo: order.batchNo || order.id.slice(-8),
          purchaseDate: order.purchaseDate,
          supplier: order.supplier ? { name: order.supplier.name, phone: order.supplier.phone } : { name: order.supplierName || '-' },
          totalAmount: order.items.reduce((sum, item) => sum + item.totalAmount, 0),
          items: order.items.map(item => ({
            product: item.product,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.totalAmount,
          })),
          remark: order.remark || undefined,
        }}
        slipType="purchase"
      />
    </div>
  );
}