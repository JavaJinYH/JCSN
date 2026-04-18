import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { db } from '@/lib/db';
import { formatCurrency, generateInvoiceNo } from '@/lib/utils';
import { toast } from '@/components/Toast';
import type { Product, Category, Contact, Entity, BizProject } from '@/lib/types';

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
}

interface PaymentInfo {
  method: string;
  amount: number;
  payerName: string;
}

export function SaleNew() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [projects, setProjects] = useState<BizProject[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [historicalPrices, setHistoricalPrices] = useState<Map<string, number>>(new Map());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedBuyer, setSelectedBuyer] = useState<string>('__none__');
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('__none__');
  const [selectedPayer, setSelectedPayer] = useState<string>('__none__');
  const [selectedIntroducer, setSelectedIntroducer] = useState<string>('__none__');
  const [pickerName, setPickerName] = useState('');
  const [pickerPhone, setPickerPhone] = useState('');

  const [discount, setDiscount] = useState(0);
  const [discountRate, setDiscountRate] = useState(100);
  const [remark, setRemark] = useState('');
  const [writtenInvoiceNo, setWrittenInvoiceNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [manualFinalAmount, setManualFinalAmount] = useState<number | null>(null);
  const [showLossConfirm, setShowLossConfirm] = useState(false);

  const [showBuyerDialog, setShowBuyerDialog] = useState(false);
  const [newBuyerName, setNewBuyerName] = useState('');
  const [newBuyerPhone, setNewBuyerPhone] = useState('');

  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [payments, setPayments] = useState<PaymentInfo[]>([
    { method: '现金', amount: 0, payerName: '' },
  ]);
  const [photos, setPhotos] = useState<{ id: string; file?: File; preview: string; remark: string; type: string }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadProjects();
  }, [selectedEntity]);

  const loadData = async () => {
    try {
      const [productsData, categoriesData, contactsData, entitiesData] = await Promise.all([
        db.product.findMany({
          include: { category: true },
          orderBy: { name: 'asc' },
        }),
        db.category.findMany({ orderBy: { sortOrder: 'asc' } }),
        db.contact.findMany({ orderBy: { name: 'asc' } }),
        db.entity.findMany({ orderBy: { name: 'asc' } }),
      ]);

      setProducts(productsData);
      setCategories(categoriesData);
      setContacts(contactsData);
      setEntities(entitiesData);
    } catch (error) {
      console.error('[SaleNew] 加载数据失败:', error);
      toast('数据加载失败，请刷新页面重试', 'error');
    }
  };

  const loadProjects = async () => {
    if (!selectedEntity) {
      setProjects([]);
      return;
    }
    try {
      const projectsData = await db.bizProject.findMany({
        where: { entityId: selectedEntity, status: '进行中' },
        orderBy: { createdAt: 'desc' },
      });
      setProjects(projectsData);
    } catch (error) {
      console.error('[SaleNew] 加载项目失败:', error);
    }
  };

  const loadHistoricalPrices = async (contactId: string) => {
    try {
      const customerPrices = await db.customerPrice.findMany({
        where: { customerId: contactId },
      });

      const priceMap = new Map<string, number>();
      customerPrices.forEach(cp => {
        priceMap.set(cp.productId, cp.lastPrice);
      });

      const orders = await db.saleOrder.findMany({
        where: { buyerId: contactId },
        include: {
          items: {
            include: { product: true },
          },
        },
        orderBy: { saleDate: 'desc' },
      });

      orders.forEach(order => {
        order.items?.forEach(item => {
          if (!priceMap.has(item.productId)) {
            priceMap.set(item.productId, item.unitPrice);
          }
        });
      });
      setHistoricalPrices(priceMap);
    } catch (error) {
      console.error('[SaleNew] 加载历史价格失败:', error);
    }
  };

  useEffect(() => {
    if (selectedBuyer && selectedBuyer !== '__none__') {
      loadHistoricalPrices(selectedBuyer);
    } else {
      setHistoricalPrices(new Map());
    }
  }, [selectedBuyer]);

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchesSearch =
      !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.specification?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.product.id === product.id);
    if (existing) {
      if (existing.quantity < product.stock) {
        setCart(
          cart.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );
      }
    } else {
      const historicalPrice = historicalPrices.get(product.id);
      setCart([
        ...cart,
        {
          product,
          quantity: 1,
          unitPrice: historicalPrice || product.referencePrice || 0,
        },
      ]);
    }
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      const product = products.find((p) => p.id === productId);
      if (product && quantity <= product.stock) {
        setCart(
          cart.map((item) =>
            item.product.id === productId ? { ...item, quantity } : item
          )
        );
      }
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const costTotal = cart.reduce(
    (sum, item) => sum + (item.product.costPrice || 0) * item.quantity,
    0
  );
  const rateDiscount = subtotal * (100 - discountRate) / 100;
  const totalDiscount = discount + rateDiscount;
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const calculatedFinalAmount = subtotal - totalDiscount;
  const finalAmount = manualFinalAmount !== null ? manualFinalAmount : calculatedFinalAmount;
  const paidAmount = Math.min(totalPaid, finalAmount);
  const remainingAmount = Math.max(0, finalAmount - totalPaid);
  const isManualFinalAmount = manualFinalAmount !== null;
  const lossAmount = costTotal - finalAmount;
  const showLossWarning = finalAmount < costTotal && finalAmount > 0;

  const handleMoli = () => {
    const moliAmount = Math.floor(subtotal - totalDiscount);
    setDiscount(moliAmount);
  };

  const handleAddBuyer = async () => {
    if (!newBuyerName.trim()) {
      toast('请输入联系人姓名', 'warning');
      return;
    }
    if (!newBuyerPhone.trim()) {
      toast('请输入手机号', 'warning');
      return;
    }

    try {
      const existing = await db.contact.findUnique({
        where: { primaryPhone: newBuyerPhone.trim() },
      });
      if (existing) {
        toast('该手机号已被使用', 'warning');
        return;
      }

      const contact = await db.contact.create({
        data: {
          name: newBuyerName.trim(),
          primaryPhone: newBuyerPhone.trim(),
        },
      });

      setContacts([...contacts, contact]);
      setSelectedBuyer(contact.id);
      setShowBuyerDialog(false);
      setNewBuyerName('');
      setNewBuyerPhone('');
      toast('添加成功', 'success');
    } catch (error) {
      console.error('[SaleNew] 添加联系人失败:', error);
      toast('添加失败，请重试', 'error');
    }
  };

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast('请先添加商品', 'warning');
      return;
    }

    if (!selectedBuyer || selectedBuyer === '__none__') {
      toast('请选择购货人', 'warning');
      return;
    }

    if (!selectedEntity) {
      toast('请选择付款主体', 'warning');
      return;
    }

    if (showLossWarning && !showLossConfirm) {
      setShowLossConfirm(true);
      return;
    }

    setLoading(true);
    try {
      const sale = await db.saleOrder.create({
        data: {
          invoiceNo: generateInvoiceNo(),
          buyerId: selectedBuyer,
          payerId: selectedPayer === '__none__' ? null : selectedPayer,
          introducerId: selectedIntroducer === '__none__' ? null : selectedIntroducer,
          pickerName: pickerName || null,
          pickerPhone: pickerPhone || null,
          projectId: selectedProject === '__none__' ? null : selectedProject,
          paymentEntityId: selectedEntity,
          totalAmount: finalAmount,
          discount: totalDiscount,
          paidAmount,
          saleDate: new Date(),
          writtenInvoiceNo: writtenInvoiceNo || null,
          remark: remark || null,
          items: {
            create: cart.map((item) => ({
              productId: item.product.id,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              costPriceSnapshot: item.product.costPrice,
              sellingPriceSnapshot: item.product.salePrice,
              subtotal: item.unitPrice * item.quantity,
            })),
          },
          payments: {
            create: payments
              .filter((p) => p.amount > 0)
              .map((p) => ({
                amount: p.amount,
                method: p.method,
                payerName: p.payerName || null,
                paidAt: new Date(),
              })),
          },
        },
      });

      for (const item of cart) {
        await db.product.update({
          where: { id: item.product.id },
          data: {
            stock: {
              decrement: item.quantity,
            },
            lastPurchasePrice: item.product.lastPurchasePrice || undefined,
          },
        });

        const existingPrice = await db.customerPrice.findUnique({
          where: {
            customerId_productId: {
              customerId: selectedBuyer,
              productId: item.product.id,
            },
          },
        });
        if (existingPrice) {
          await db.customerPrice.update({
            where: { id: existingPrice.id },
            data: {
              lastPrice: item.unitPrice,
              transactionCount: existingPrice.transactionCount + 1,
            },
          });
        } else {
          await db.customerPrice.create({
            data: {
              customerId: selectedBuyer,
              productId: item.product.id,
              lastPrice: item.unitPrice,
              transactionCount: 1,
            },
          });
        }
      }

      if (photos.length > 0) {
        for (const photo of photos) {
          if (photo.file) {
            const fileName = `sale_${sale.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            const dataUrl = photo.preview;
            const result = await (window as any).electronAPI.photo.save(fileName, dataUrl, 'sales');
            if (result.success) {
              await db.saleOrderPhoto.create({
                data: {
                  saleOrderId: sale.id,
                  photoPath: result.data.path,
                  photoType: photo.type,
                  photoRemark: photo.remark || null,
                },
              });
            }
          }
        }
      }

      toast('销售保存成功！', 'success');
      navigate('/sales');
    } catch (error) {
      console.error('[SaleNew] 保存销售失败:', error);
      toast('保存失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addPaymentMethod = () => {
    setPayments([
      ...payments,
      { method: '现金', amount: 0, payerName: '' },
    ]);
  };

  const updatePayment = (index: number, field: keyof PaymentInfo, value: any) => {
    const newPayments = [...payments];
    newPayments[index] = { ...newPayments[index], [field]: value };
    setPayments(newPayments);
  };

  const removePayment = (index: number) => {
    if (payments.length > 1) {
      setPayments(payments.filter((_, i) => i !== index));
    }
  };

  const distributeRemainingAmount = () => {
    if (remainingAmount > 0 && payments.length > 0) {
      const newPayments = [...payments];
      const lastIndex = newPayments.findIndex((p) => p.amount === 0);
      if (lastIndex >= 0) {
        newPayments[lastIndex].amount = remainingAmount;
      } else {
        newPayments[newPayments.length - 1].amount += remainingAmount;
      }
      setPayments(newPayments);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">新增销售</h2>
          <p className="text-slate-500 mt-1">创建新的销售订单</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/sales')}>
          取消
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">选择商品</CardTitle>
              <div className="flex items-center gap-4 mt-4">
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
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
                      onClick={() => addToCart(product)}
                      disabled={product.stock === 0}
                      className={`p-3 border rounded-lg text-left transition-colors ${
                        product.stock === 0
                          ? 'border-slate-200 opacity-50 cursor-not-allowed'
                          : 'border-slate-200 hover:border-orange-300 hover:bg-orange-50'
                      }`}
                    >
                      <div className="font-medium text-slate-800 truncate">
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
                          {product.lastPurchasePrice && (
                            <span className="text-xs text-slate-400">
                              进价: {formatCurrency(product.lastPurchasePrice)}
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">购货人信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Select
                  value={selectedBuyer}
                  onValueChange={setSelectedBuyer}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="选择购货人（必选）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">无</SelectItem>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.primaryPhone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => setShowBuyerDialog(true)}
                >
                  + 新购货人
                </Button>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-slate-600 mb-3">销售单角色（可选）</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">付款人</label>
                    <Select value={selectedPayer} onValueChange={setSelectedPayer}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择付款人" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">无</SelectItem>
                        {contacts.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} ({c.primaryPhone})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">介绍人(水电工)</label>
                    <Select value={selectedIntroducer} onValueChange={setSelectedIntroducer}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择介绍人" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">无</SelectItem>
                        {contacts.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} ({c.primaryPhone})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">提货人姓名</label>
                    <Input
                      placeholder="提货人姓名"
                      value={pickerName}
                      onChange={(e) => setPickerName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">提货人电话</label>
                    <Input
                      placeholder="提货人电话"
                      value={pickerPhone}
                      onChange={(e) => setPickerPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">结账主体与项目</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">
                  付款主体 <span className="text-red-500">*</span>
                </label>
                <Select
                  value={selectedEntity}
                  onValueChange={(v) => {
                    setSelectedEntity(v);
                    setSelectedProject('__none__');
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="选择付款主体（必选）" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} {e.entityType === 'personal' ? '(个人)' : e.entityType === 'company' ? '(公司)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedEntity && projects.length > 0 && (
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">关联项目（可选）</label>
                  <Select
                    value={selectedProject}
                    onValueChange={setSelectedProject}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="选择项目（可选）" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">无项目</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} {p.address ? `- ${p.address}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">当前订单</CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  购物车为空
                  <br />
                  请从左侧选择商品
                </div>
              ) : (
                <div className="space-y-3 max-h-[250px] overflow-y-auto">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {item.product.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatCurrency(item.unitPrice)} × {item.quantity}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            updateCartQuantity(item.product.id, item.quantity - 1)
                          }
                          className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-600"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-mono text-sm">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateCartQuantity(item.product.id, item.quantity + 1)
                          }
                          disabled={item.quantity >= item.product.stock}
                          className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-600 disabled:opacity-50"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="w-6 h-6 rounded bg-red-100 hover:bg-red-200 text-red-600 ml-2"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-slate-200 mt-4 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">商品金额</span>
                  <span className="font-mono">{formatCurrency(subtotal)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">折扣率</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={discountRate}
                      onChange={(e) =>
                        setDiscountRate(Math.max(0, Math.min(100, parseFloat(e.target.value) || 100)))
                      }
                      className="w-20 h-8 text-right font-mono"
                      min="0"
                      max="100"
                    />
                    <span className="text-sm text-slate-500">%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">抹零</span>
                    <Button size="sm" variant="outline" onClick={handleMoli} className="h-8 px-2 text-xs">
                      一键抹零
                    </Button>
                  </div>
                  <Input
                    type="number"
                    value={discount}
                    onChange={(e) =>
                      setDiscount(Math.max(0, parseFloat(e.target.value) || 0))
                    }
                    className="w-24 h-8 text-right font-mono"
                    min="0"
                    step="0.01"
                  />
                </div>

                {totalDiscount > 0 && (
                  <div className="flex justify-between text-sm text-orange-500">
                    <span>总优惠</span>
                    <span className="font-mono">-{formatCurrency(totalDiscount)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-lg font-bold pt-2 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <span>应付金额</span>
                    {isManualFinalAmount && (
                      <Badge variant="outline" className="text-xs bg-yellow-50">手动</Badge>
                    )}
                  </div>
                  {isManualFinalAmount ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={manualFinalAmount}
                        onChange={(e) => setManualFinalAmount(parseFloat(e.target.value) || 0)}
                        className="w-28 h-8 text-right font-mono text-orange-600"
                        step="0.01"
                      />
                      <Button size="sm" variant="ghost" onClick={() => setManualFinalAmount(null)}>
                        重置
                      </Button>
                    </div>
                  ) : (
                    <span
                      className="text-orange-600 font-mono cursor-pointer hover:text-orange-700"
                      onClick={() => setManualFinalAmount(finalAmount)}
                      title="点击手动修改应付金额"
                    >
                      {formatCurrency(finalAmount)}
                    </span>
                  )}
                </div>

                {showLossWarning && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                    <div className="font-medium">⚠️ 亏本警告</div>
                    <div>成交价低于成本价，预计亏损 {formatCurrency(lossAmount)}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">支付方式</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowPaymentDialog(true)}>
                  支付设置
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {payments.filter(p => p.amount > 0).length === 0 ? (
                  <div className="text-slate-500 text-center py-4">点击"支付设置"添加支付方式</div>
                ) : (
                  payments.filter(p => p.amount > 0).map((p, i) => (
                    <div key={i} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                      <span>{p.method}</span>
                      <span className="font-mono">{formatCurrency(p.amount)}</span>
                    </div>
                  ))
                )}
                <div className="flex justify-between items-center p-2 bg-green-50 rounded font-medium">
                  <span>已付金额</span>
                  <span className="text-green-600 font-mono">{formatCurrency(totalPaid)}</span>
                </div>
                {remainingAmount > 0 && (
                  <div className="flex justify-between items-center p-2 bg-yellow-50 rounded text-yellow-700">
                    <span>剩余待付</span>
                    <span className="font-mono">{formatCurrency(remainingAmount)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">手写单号</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="输入手写单号（可选）..."
                value={writtenInvoiceNo}
                onChange={(e) => setWrittenInvoiceNo(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">备注</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="添加备注信息..."
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">单据照片</CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoUpload
                photos={photos}
                onChange={setPhotos}
                maxPhotos={5}
              />
            </CardContent>
          </Card>

          <Button
            className="flex-1 bg-orange-500 hover:bg-orange-600"
            size="lg"
            onClick={handleSubmit}
            disabled={cart.length === 0 || loading}
          >
            {loading ? '保存中...' : '💾 保存销售'}
          </Button>
        </div>
      </div>

      <Dialog open={showBuyerDialog} onOpenChange={setShowBuyerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加新购货人</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">姓名 *</label>
              <Input
                value={newBuyerName}
                onChange={(e) => setNewBuyerName(e.target.value)}
                placeholder="输入联系人姓名"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">主手机号 *</label>
              <Input
                value={newBuyerPhone}
                onChange={(e) => setNewBuyerPhone(e.target.value)}
                placeholder="输入手机号（唯一标识）"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowBuyerDialog(false)}
              >
                取消
              </Button>
              <Button onClick={handleAddBuyer}>保存</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>支付方式设置</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
            {payments.map((payment, index) => (
              <div key={index} className="p-3 border border-slate-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">支付方式 {index + 1}</span>
                  {payments.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500"
                      onClick={() => removePayment(index)}
                    >
                      删除
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">支付方式</label>
                    <Select
                      value={payment.method}
                      onValueChange={(v) => updatePayment(index, 'method', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="现金">现金</SelectItem>
                        <SelectItem value="微信支付">微信支付</SelectItem>
                        <SelectItem value="支付宝">支付宝</SelectItem>
                        <SelectItem value="银行转账">银行转账</SelectItem>
                        <SelectItem value="其他">其他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">支付金额</label>
                    <Input
                      type="number"
                      value={payment.amount}
                      onChange={(e) => updatePayment(index, 'amount', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={addPaymentMethod}>
              + 添加支付方式
            </Button>
            {remainingAmount > 0 && (
              <Button variant="secondary" className="w-full" onClick={distributeRemainingAmount}>
                自动填充剩余金额 {formatCurrency(remainingAmount)}
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              取消
            </Button>
            <Button onClick={() => setShowPaymentDialog(false)}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showLossConfirm} onOpenChange={setShowLossConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⚠️ 确认亏本？</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>成交价 <span className="font-bold text-red-600">{formatCurrency(finalAmount)}</span> 低于成本价 <span className="font-bold">{formatCurrency(costTotal)}</span></p>
            <p className="mt-2 text-red-600">预计亏损：{formatCurrency(lossAmount)}</p>
            <p className="mt-4 text-sm text-slate-500">是否确认继续保存？</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLossConfirm(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowLossConfirm(false);
                handleSubmit();
              }}
            >
              确认亏本保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}