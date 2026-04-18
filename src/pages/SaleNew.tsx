import { useEffect, useState, useMemo } from 'react';
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
import { Combobox } from '@/components/Combobox';
import { PhotoUpload } from '@/components/PhotoUpload';
import { db } from '@/lib/db';
import { formatCurrency, generateInvoiceNo, formatProductName } from '@/lib/utils';
import { toast } from '@/components/Toast';
import { sortByFrequency, recordFrequency } from '@/lib/frequency';
import type { Product, Category, Contact, Entity, BizProject } from '@/lib/types';

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  salePrice: number;
  purchaseUnit: string | null;
  saleUnit: string;
  unitRatio: number;
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

  const [needsDelivery, setNeedsDelivery] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('0');

  const [deliverySuggestion, setDeliverySuggestion] = useState<string>('');

  const [discount, setDiscount] = useState(0);
  const [discountRate, setDiscountRate] = useState(100);
  const [remark, setRemark] = useState('');
  const [writtenInvoiceNo, setWrittenInvoiceNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [manualFinalAmount, setManualFinalAmount] = useState<number | null>(null);
  const [showLossConfirm, setShowLossConfirm] = useState(false);

  const [showBuyerDialog, setShowBuyerDialog] = useState(false);
  const [newBuyer, setNewBuyer] = useState({
    name: '',
    primaryPhone: '',
    address: '',
    remark: '',
    contactType: 'customer',
  });

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
      let [productsData, categoriesData, contactsData, entitiesData] = await Promise.all([
        db.product.findMany({
          include: { category: true },
          orderBy: { name: 'asc' },
        }),
        db.category.findMany({ orderBy: { sortOrder: 'asc' } }),
        db.contact.findMany({ orderBy: { name: 'asc' } }),
        db.entity.findMany({ orderBy: { name: 'asc' } }),
      ]);

      let walkInCustomer = contactsData.find(c => c.name === '散客');
      if (!walkInCustomer) {
        const randomCode = 'SK' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6).toUpperCase();
        walkInCustomer = await db.contact.create({
          data: {
            name: '散客',
            code: randomCode,
            primaryPhone: '0000000000',
            manualTag: '○',
          },
        });
        contactsData = [...contactsData, walkInCustomer];
      }

      setProducts(productsData);
      setCategories(categoriesData);
      setContacts(sortByFrequency(contactsData, 'contact'));
      setEntities(sortByFrequency(entitiesData, 'entity'));
    } catch (error) {
      console.error('[SaleNew] 加载数据失败:', error);
      toast('数据加载失败，请刷新页面重试', 'error');
    }
  };

  const loadProjects = async () => {
    if (!selectedEntity || selectedEntity === '__cash__') {
      setProjects([]);
      return;
    }
    try {
      const projectsData = await db.bizProject.findMany({
        where: { entityId: selectedEntity, status: '进行中' },
        orderBy: { createdAt: 'desc' },
      });
      setProjects(sortByFrequency(projectsData, 'project'));
    } catch (error) {
      console.error('[SaleNew] 加载项目失败:', error);
    }
  };

  const contactOptions = useMemo(() => {
    return contacts.map(c => ({
      value: c.id,
      label: `${c.name} (${c.primaryPhone || '无电话'})`,
    }));
  }, [contacts]);

  const entityOptions = useMemo(() => {
    return entities.map(e => ({
      value: e.id,
      label: `${e.name} ${e.entityType === 'personal' ? '(个人)' : e.entityType === 'company' ? '(公司)' : e.entityType === 'team' ? '(施工队)' : ''}`,
    }));
  }, [entities]);

  const projectOptions = useMemo(() => {
    return projects.map(p => ({
      value: p.id,
      label: `${p.name} ${p.address ? `- ${p.address}` : ''}`,
    }));
  }, [projects]);

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

  const filteredProducts = sortByFrequency(
    products.filter((p) => {
      const matchesCategory =
        selectedCategory === 'all' || p.categoryId === selectedCategory;
      const matchesSearch =
        !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.specification?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    }),
    'product'
  );

  const addToCart = (product: Product) => {
    recordFrequency('product', product.id);
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
      const hasUnitConversion = product.purchaseUnit && product.unitRatio && product.unitRatio > 1;
      setCart([
        ...cart,
        {
          product,
          quantity: 1,
          unitPrice: historicalPrice || product.referencePrice || 0,
          costPrice: product.lastPurchasePrice || 0,
          salePrice: product.referencePrice || 0,
          purchaseUnit: product.purchaseUnit || null,
          saleUnit: product.unit,
          unitRatio: product.unitRatio || 1,
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

  const updateCartItem = (productId: string, updates: Partial<CartItem>) => {
    setCart(
      cart.map((item) =>
        item.product.id === productId ? { ...item, ...updates } : item
      )
    );
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const costTotal = cart.reduce(
    (sum, item) => sum + item.costPrice * item.quantity,
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
  const profitRate = finalAmount > 0 ? ((finalAmount - costTotal) / finalAmount) * 100 : 0;
  const showLowProfitWarning = profitRate < 10 && profitRate >= 0 && finalAmount > 0;
  const showLossWarning = finalAmount < costTotal && finalAmount > 0;

  const totalProfit = finalAmount - costTotal;
  useEffect(() => {
    if (finalAmount <= 0) {
      setDeliverySuggestion('');
      return;
    }
    if (totalProfit < 10) {
      setDeliverySuggestion('⚠️ 利润较低，建议加收配送费或由客户自提');
    } else if (totalProfit < 50) {
      setDeliverySuggestion('💡 利润适中，建议根据距离酌情收取配送费');
    } else {
      setDeliverySuggestion('✅ 利润充足，可考虑免费配送');
    }
  }, [totalProfit, finalAmount]);

  const handleMoli = () => {
    const moliAmount = Math.floor(subtotal - totalDiscount);
    setDiscount(moliAmount);
  };

  const handleAddBuyer = async () => {
    if (!newBuyer.name.trim()) {
      toast('请输入联系人姓名', 'warning');
      return;
    }
    if (!newBuyer.primaryPhone.trim()) {
      toast('请输入手机号', 'warning');
      return;
    }

    try {
      const existing = await db.contact.findFirst({
        where: { primaryPhone: newBuyer.primaryPhone.trim() },
      });
      if (existing) {
        toast('该手机号已被使用', 'warning');
        return;
      }

      const contactCount = await db.contact.count();
      const newCode = `C${String(contactCount + 1).padStart(3, '0')}`;

      const contact = await db.contact.create({
        data: {
          code: newCode,
          name: newBuyer.name.trim(),
          primaryPhone: newBuyer.primaryPhone.trim(),
          address: newBuyer.address.trim() || null,
          remark: newBuyer.remark.trim() || null,
          contactType: newBuyer.contactType,
        },
      });

      setContacts([...contacts, contact]);
      setSelectedBuyer(contact.id);
      setShowBuyerDialog(false);
      setNewBuyer({ name: '', primaryPhone: '', address: '', remark: '', contactType: 'customer' });
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

    if (!selectedEntity) {
      toast('请选择挂靠主体', 'warning');
      return;
    }

    if (showLossWarning && !showLossConfirm) {
      setShowLossConfirm(true);
      return;
    }

    if (showLowProfitWarning && !showLossConfirm) {
      setShowLossConfirm(true);
      return;
    }

    if (writtenInvoiceNo) {
      const existing = await db.saleOrder.findFirst({
        where: { writtenInvoiceNo },
      });
      if (existing) {
        toast('该手写单号已存在，请使用其他单号或留空', 'error');
        return;
      }
    }

    setLoading(true);
    try {
      const buyerId = selectedBuyer === '__none__'
        ? contacts.find(c => c.name === '散客')?.id
        : selectedBuyer;

      const entityId = selectedEntity === '__cash__'
        ? entities.find(e => e.entityType === 'cash')?.id || entities[0]?.id
        : selectedEntity;

      const sale = await db.saleOrder.create({
        data: {
          invoiceNo: generateInvoiceNo(),
          buyerId: buyerId!,
          payerId: selectedPayer === '__none__' ? null : selectedPayer,
          introducerId: selectedIntroducer === '__none__' ? null : selectedIntroducer,
          pickerName: pickerName || null,
          pickerPhone: pickerPhone || null,
          projectId: selectedProject === '__none__' ? null : selectedProject,
          paymentEntityId: entityId!,
          totalAmount: finalAmount,
          discount: totalDiscount,
          paidAmount,
          saleDate: new Date(),
          writtenInvoiceNo: writtenInvoiceNo || null,
          remark: remark || null,
          needDelivery: needsDelivery,
          deliveryAddress: needsDelivery ? deliveryAddress : null,
          deliveryFee: needsDelivery ? parseFloat(deliveryFee) || 0 : 0,
          items: {
            create: cart.map((item) => ({
              productId: item.product.id,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              costPriceSnapshot: item.costPrice,
              sellingPriceSnapshot: item.salePrice,
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

      await db.receivable.create({
        data: {
          orderId: sale.id,
          originalAmount: finalAmount,
          paidAmount: paidAmount,
          remainingAmount: remainingAmount,
        },
      });

      if (needsDelivery) {
        await db.deliveryRecord.create({
          data: {
            saleOrderId: sale.id,
            recipientName: selectedBuyer !== '__none__' ? contacts.find(c => c.id === selectedBuyer)?.name || pickerName || '客户' : pickerName || '客户',
            recipientPhone: selectedBuyer !== '__none__' ? contacts.find(c => c.id === selectedBuyer)?.primaryPhone || pickerPhone : pickerPhone,
            deliveryAddress: deliveryAddress,
            totalFee: parseFloat(deliveryFee) || 0,
            deliveryStatus: 'pending',
            zoneName: '默认区域',
          },
        });
      }

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
                      className={`p-3 border rounded-lg text-left transition-colors relative ${
                        product.stock === 0
                          ? 'border-slate-200 opacity-50 cursor-not-allowed'
                          : 'border-slate-200 hover:border-orange-300 hover:bg-orange-50'
                      }`}
                    >
                      {product.brand && (
                        <span className="absolute top-1 right-1 text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {product.brand}
                        </span>
                      )}
                      <div className="font-medium text-slate-800 truncate pr-12">
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
              <CardTitle className="text-base">联系人信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Combobox
                    value={selectedBuyer === '__none__' ? '' : selectedBuyer}
                    onValueChange={(v) => {
                      setSelectedBuyer(v || '__none__');
                      if (v) recordFrequency('contact', v);
                    }}
                    options={contactOptions}
                    placeholder="选择联系人（散客可跳过）"
                    emptyText="没有找到匹配的联系人"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowBuyerDialog(true)}
                >
                  + 新联系人
                </Button>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-slate-600 mb-3">销售单角色（可选）</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">付款人</label>
                    <Combobox
                      value={selectedPayer === '__none__' ? '' : selectedPayer}
                      onValueChange={(v) => setSelectedPayer(v || '__none__')}
                      options={contactOptions}
                      placeholder="选择付款人"
                      emptyText="没有找到匹配的联系人"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">介绍人(水电工)</label>
                    <Combobox
                      value={selectedIntroducer === '__none__' ? '' : selectedIntroducer}
                      onValueChange={(v) => setSelectedIntroducer(v || '__none__')}
                      options={contactOptions}
                      placeholder="选择介绍人"
                      emptyText="没有找到匹配的联系人"
                    />
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

                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center gap-4 mb-3">
                    <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={needsDelivery}
                        onChange={(e) => setNeedsDelivery(e.target.checked)}
                        className="w-4 h-4"
                      />
                      需要配送
                    </label>
                    {deliverySuggestion && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        totalProfit < 10 ? 'bg-red-50 text-red-600' :
                        totalProfit < 50 ? 'bg-yellow-50 text-yellow-600' :
                        'bg-green-50 text-green-600'
                      }`}>
                        {deliverySuggestion}
                      </span>
                    )}
                  </div>
                  {needsDelivery && (
                    <div className="space-y-3 pl-2 border-l-2 border-orange-200">
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">配送地址</label>
                        <Input
                          placeholder="输入配送地址"
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">配送费 (元)</label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={deliveryFee}
                          onChange={(e) => setDeliveryFee(e.target.value)}
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">挂靠主体</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">
                  挂靠主体 <span className="text-red-500">*</span>
                </label>
                <Combobox
                  value={selectedEntity}
                  onValueChange={(v) => {
                    setSelectedEntity(v);
                    if (v && v !== '__cash__') recordFrequency('entity', v);
                  }}
                  options={[{ value: '__cash__', label: '散客（无挂靠）' }, ...entityOptions]}
                  placeholder="选择挂靠主体（必选）"
                  emptyText="没有找到匹配的挂靠主体"
                  allowCustom={false}
                />
              </div>

              {selectedEntity && selectedEntity !== '__cash__' && (
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">关联项目（可选）</label>
                  <Select
                    value={selectedProject}
                    onValueChange={(v) => { setSelectedProject(v); if (v && v !== '__none__') recordFrequency('project', v); }}
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
                      className="flex flex-col gap-2 p-2 bg-slate-50 rounded-lg relative"
                    >
                      {item.product.brand && (
                        <span className="absolute top-1 right-12 text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                          {item.product.brand}
                        </span>
                      )}
                      <div className="flex items-center justify-between pr-16">
                        <div className="font-medium text-sm">
                          {formatProductName(item.product)}
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="w-6 h-6 rounded bg-red-100 hover:bg-red-200 text-red-600"
                        >
                          ×
                        </button>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              updateCartQuantity(item.product.id, item.quantity - 1)
                            }
                            className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-600"
                          >
                            -
                          </button>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              updateCartQuantity(item.product.id, parseInt(e.target.value) || 1)
                            }
                            className="w-16 h-7 text-center text-sm"
                            min="1"
                          />
                          <button
                            onClick={() =>
                              updateCartQuantity(item.product.id, item.quantity + 1)
                            }
                            disabled={item.quantity >= item.product.stock}
                            className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-600 disabled:opacity-50"
                          >
                            +
                          </button>
                        </div>

                        <Select
                          value={item.saleUnit}
                          onValueChange={(v) => {
                            const newSaleUnit = v;
                            const newUnitRatio = item.purchaseUnit && newSaleUnit === item.purchaseUnit ? item.unitRatio : 1;
                            let newUnitPrice = item.salePrice;
                            if (item.purchaseUnit && newSaleUnit === item.purchaseUnit) {
                              newUnitPrice = item.salePrice * item.unitRatio;
                            } else if (item.purchaseUnit && newSaleUnit === item.product.unit) {
                              newUnitPrice = item.salePrice / item.unitRatio;
                            }
                            updateCartItem(item.product.id, {
                              saleUnit: newSaleUnit,
                              unitRatio: newUnitRatio,
                              unitPrice: newUnitPrice,
                            });
                          }}
                        >
                          <SelectTrigger className="w-20 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={item.product.unit}>{item.product.unit}</SelectItem>
                            {item.purchaseUnit && item.purchaseUnit !== item.product.unit && (
                              <SelectItem value={item.purchaseUnit}>{item.purchaseUnit}</SelectItem>
                            )}
                          </SelectContent>
                        </Select>

                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-slate-400">¥</span>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateCartItem(item.product.id, {
                                unitPrice: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-20 h-7 text-sm"
                            min="0"
                            step="0.01"
                          />
                        </div>

                        <div className="text-xs text-slate-400">
                          = {formatCurrency(item.unitPrice * item.quantity)}
                        </div>
                      </div>

                      {item.purchaseUnit && item.unitRatio > 1 && (
                        <div className="text-xs text-slate-400">
                          {item.purchaseUnit} = {item.unitRatio} {item.product.unit}，折合 {formatCurrency(item.salePrice)}/{item.product.unit}
                        </div>
                      )}
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

                {showLowProfitWarning && !showLossWarning && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-600">
                    <div className="font-medium">⚠️ 利润率过低警告</div>
                    <div>利润率 {profitRate.toFixed(1)}% 低于10%，请确认是否继续</div>
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
            <DialogTitle>添加新联系人</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                姓名 <span className="text-red-500">*</span>
              </label>
              <Input
                value={newBuyer.name}
                onChange={(e) => setNewBuyer({ ...newBuyer, name: e.target.value })}
                placeholder="输入联系人姓名"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                手机号 <span className="text-red-500">*</span>
              </label>
              <Input
                value={newBuyer.primaryPhone}
                onChange={(e) => setNewBuyer({ ...newBuyer, primaryPhone: e.target.value })}
                placeholder="输入手机号（唯一标识）"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">联系人类型</label>
              <Select value={newBuyer.contactType} onValueChange={(v) => setNewBuyer({ ...newBuyer, contactType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">客户</SelectItem>
                  <SelectItem value="plumber">水电工</SelectItem>
                  <SelectItem value="company">装修公司</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">地址</label>
              <Input
                value={newBuyer.address}
                onChange={(e) => setNewBuyer({ ...newBuyer, address: e.target.value })}
                placeholder="输入地址（可选）"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">备注</label>
              <Input
                value={newBuyer.remark}
                onChange={(e) => setNewBuyer({ ...newBuyer, remark: e.target.value })}
                placeholder="输入备注（可选）"
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
            <DialogTitle>{showLossWarning ? '⚠️ 确认亏本？' : '⚠️ 确认低利润率？'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {showLossWarning ? (
              <>
                <p>成交价 <span className="font-bold text-red-600">{formatCurrency(finalAmount)}</span> 低于成本价 <span className="font-bold">{formatCurrency(costTotal)}</span></p>
                <p className="mt-2 text-red-600">预计亏损：{formatCurrency(lossAmount)}</p>
              </>
            ) : (
              <>
                <p>订单利润率 <span className="font-bold text-yellow-600">{profitRate.toFixed(1)}%</span> 低于10%</p>
                <p className="mt-2">成交总额：{formatCurrency(finalAmount)}</p>
                <p>成本总额：{formatCurrency(costTotal)}</p>
                <p>订单利润：{formatCurrency(finalAmount - costTotal)}</p>
              </>
            )}
            <p className="mt-4 text-sm text-slate-500">是否确认继续保存？</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLossConfirm(false)}>
              取消
            </Button>
            <Button
              variant={showLossWarning ? 'destructive' : 'default'}
              onClick={() => {
                setShowLossConfirm(false);
                handleSubmit();
              }}
            >
              {showLossWarning ? '确认亏本保存' : '确认保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}