import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { db } from '@/lib/db';
import { formatCurrency, generateInvoiceNo, formatProductName } from '@/lib/utils';
import { toast } from '@/components/Toast';
import type { Product, Category, Contact, Project, SaleSlip } from '@/lib/types';

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
}

interface PaymentInfo {
  method: string;
  amount: number;
  payerName: string;
  thirdPartyName: string;
}

export function SaleDraftEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [slip, setSlip] = useState<SaleSlip | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedBuyer, setSelectedBuyer] = useState<string>('__none__');
  const [selectedPayer, setSelectedPayer] = useState<string>('__none__');
  const [selectedIntroducer, setSelectedIntroducer] = useState<string>('__none__');
  const [selectedPicker, setSelectedPicker] = useState<string>('__none__');
  const [pickerName, setPickerName] = useState('');
  const [pickerPhone, setPickerPhone] = useState('');
  const [pickerType, setPickerType] = useState<string>('personal');
  const [discount, setDiscount] = useState(0);
  const [discountRate, setDiscountRate] = useState(100);
  const [remark, setRemark] = useState('');
  const [writtenInvoiceNo, setWrittenInvoiceNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [payments, setPayments] = useState<PaymentInfo[]>([
    { method: '现金', amount: 0, payerName: '', thirdPartyName: '' },
  ]);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      const [slipData, productsData, categoriesData, customersData] = await Promise.all([
        db.saleSlip.findUnique({
          where: { id },
          include: { items: true, customer: true },
        }),
        db.product.findMany({
          include: { category: true },
          orderBy: { name: 'asc' },
        }),
        db.category.findMany({ orderBy: { sortOrder: 'asc' } }),
        db.contact.findMany({ orderBy: { name: 'asc' } }),
      ]);

      if (!slipData) {
        toast('暂存单不存在', 'error');
        navigate('/sales/drafts');
        return;
      }

      setSlip(slipData as SaleSlip);
      setProducts(productsData);
      setCategories(categoriesData);
      setCustomers(customersData);
      setSelectedCustomer(slipData.customerId || '');
      setSelectedProject(slipData.projectId || '');
      setSelectedBuyer(slipData.buyerCustomerId || '__none__');
      setSelectedPayer(slipData.payerCustomerId || '__none__');
      setSelectedIntroducer(slipData.introducerCustomerId || '__none__');
      setSelectedPicker(slipData.pickerCustomerId || '__none__');
      setPickerName(slipData.pickerName || '');
      setPickerPhone(slipData.pickerPhone || '');
      setPickerType(slipData.pickerType || 'personal');
      setDiscount(slipData.discount);
      setDiscountRate(slipData.discountRate);
      setRemark(slipData.remark || '');
      setWrittenInvoiceNo(slipData.writtenInvoiceNo || '');
      setPayments(slipData.payments ? JSON.parse(slipData.payments) : [{ method: '现金', amount: 0, payerName: '', thirdPartyName: '' }]);

      const cartItems: CartItem[] = [];
      for (const item of slipData.items) {
        const product = productsData.find((p) => p.id === item.productId);
        if (product) {
          cartItems.push({
            product,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          });
        }
      }
      setCart(cartItems);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const loadProjects = async () => {
    if (!selectedCustomer) {
      setProjects([]);
      return;
    }
    try {
      const projectsData = await db.project.findMany({
        where: { customerId: selectedCustomer, status: '进行中' },
        orderBy: { createdAt: 'desc' },
      });
      setProjects(projectsData);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [selectedCustomer]);

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
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
            item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        );
      }
    } else {
      setCart([
        ...cart,
        {
          product,
          quantity: 1,
          unitPrice: product.salePrice,
        },
      ]);
    }
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter((item) => item.product.id !== productId));
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

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const rateDiscount = subtotal * (100 - discountRate) / 100;
  const totalDiscount = discount + rateDiscount;
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const finalAmount = subtotal - totalDiscount;
  const remainingAmount = Math.max(0, finalAmount - totalPaid);

  const handleSaveDraft = async () => {
    if (cart.length === 0) {
      toast('请先添加商品', 'warning');
      return;
    }
    try {
      setLoading(true);
      await db.saleSlip.update({
        where: { id },
        data: {
          customerId: selectedCustomer || null,
          projectId: selectedProject || null,
          buyerCustomerId: selectedBuyer === '__none__' ? null : selectedBuyer,
          payerCustomerId: selectedPayer === '__none__' ? null : selectedPayer,
          introducerCustomerId: selectedIntroducer === '__none__' ? null : selectedIntroducer,
          pickerCustomerId: selectedPicker === '__none__' ? null : selectedPicker,
          pickerName: pickerName || null,
          pickerPhone: pickerPhone || null,
          pickerType: pickerName ? pickerType : null,
          writtenInvoiceNo: writtenInvoiceNo || null,
          totalAmount: finalAmount,
          discount,
          discountRate,
          remark: remark || null,
          payments: JSON.stringify(payments),
          items: {
            deleteMany: {},
            create: cart.map((item) => ({
              productId: item.product.id,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.unitPrice * item.quantity,
            })),
          },
        },
      });
      toast('保存成功', 'success');
      navigate('/sales/drafts');
    } catch (error) {
      console.error('Failed to save draft:', error);
      toast('保存失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast('请先添加商品', 'warning');
      return;
    }
    try {
      setLoading(true);
      const customerId = selectedCustomer || undefined;
      const projectId = selectedProject || undefined;

      const sale = await db.sale.create({
        data: {
          invoiceNo: generateInvoiceNo(),
          customerId,
          projectId,
          buyerCustomerId: selectedBuyer === '__none__' ? undefined : selectedBuyer,
          payerCustomerId: selectedPayer === '__none__' ? undefined : selectedPayer,
          introducerCustomerId: selectedIntroducer === '__none__' ? undefined : selectedIntroducer,
          pickerCustomerId: selectedPicker === '__none__' ? undefined : selectedPicker,
          pickerName: pickerName || null,
          pickerPhone: pickerPhone || null,
          pickerType: pickerName ? pickerType : null,
          writtenInvoiceNo: writtenInvoiceNo || null,
          totalAmount: finalAmount,
          discount: totalDiscount,
          paidAmount: Math.min(totalPaid, finalAmount),
          saleDate: new Date(),
          remark: remark || null,
          status: 'completed',
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
                thirdPartyName: p.thirdPartyName || null,
                paidAt: new Date(),
              })),
          },
        },
      });

      for (const item of cart) {
        await db.product.update({
          where: { id: item.product.id },
          data: { stock: { decrement: item.quantity } },
        });
      }

      await db.saleSlip.update({
        where: { id },
        data: { status: 'completed' },
      });

      toast('提交成功', 'success');
      navigate('/sales');
    } catch (error) {
      console.error('Failed to submit:', error);
      toast('提交失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!slip) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">编辑暂存单</h1>
          <p className="text-slate-500 mt-1">继续编辑并完成销售</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/sales/drafts')}>
            返回列表
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">选择商品</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
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

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-slate-500">
                    未找到商品
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
                      <div className="font-medium text-slate-800 truncate">{product.name}</div>
                      <div className="text-sm text-slate-500 truncate">
                        {product.specification || product.model || '-'}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-orange-600 font-bold">
                          {formatCurrency(product.salePrice)}
                        </span>
                        <Badge variant={product.stock === 0 ? 'destructive' : 'secondary'} className="text-xs">
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
              <CardTitle className="text-base">客户与项目信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="选择客户（可选）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">无客户</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="选择项目（可选）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">无项目</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-500 mb-1 block">购货人</label>
                  <Select value={selectedBuyer} onValueChange={setSelectedBuyer}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择购货人" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">无</SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-slate-500 mb-1 block">付款人</label>
                  <Select value={selectedPayer} onValueChange={setSelectedPayer}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择付款人" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">无</SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-slate-500 mb-1 block">介绍人</label>
                  <Select value={selectedIntroducer} onValueChange={setSelectedIntroducer}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择介绍人" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">无</SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-slate-500 mb-1 block">提货人</label>
                  <Select value={selectedPicker} onValueChange={setSelectedPicker}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择提货人" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">无</SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedPicker !== '__none__' && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-slate-500 mb-1 block">提货人姓名</label>
                    <Input
                      value={pickerName}
                      onChange={(e) => setPickerName(e.target.value)}
                      placeholder="提货人姓名"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 mb-1 block">提货人电话</label>
                    <Input
                      value={pickerPhone}
                      onChange={(e) => setPickerPhone(e.target.value)}
                      placeholder="电话"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 mb-1 block">身份类型</label>
                    <Select value={pickerType} onValueChange={setPickerType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">个人</SelectItem>
                        <SelectItem value="company">公司员工</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
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
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">购物车</CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className="text-center py-8 text-slate-500">购物车为空</div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{formatProductName(item.product)}</div>
                        <div className="text-xs text-slate-500">
                          {formatCurrency(item.unitPrice)} × {item.quantity}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                        >
                          +
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          ×
                        </Button>
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
                  <span className="text-slate-500">优惠</span>
                  <Input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
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

                <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-200">
                  <span>应付金额</span>
                  <span className="text-orange-600 font-mono">{formatCurrency(finalAmount)}</span>
                </div>
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
                {payments.filter((p) => p.amount > 0).length === 0 ? (
                  <div className="text-slate-500 text-center py-4">点击"支付设置"添加支付方式</div>
                ) : (
                  payments.filter((p) => p.amount > 0).map((p, i) => (
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
              <CardTitle className="text-base">备注</CardTitle>
            </CardHeader>
            <CardContent>
              <Input placeholder="添加备注信息..." value={remark} onChange={(e) => setRemark(e.target.value)} />
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" size="lg" onClick={handleSaveDraft} disabled={loading} className="flex-1">
              📝 保存暂存
            </Button>
            <Button className="flex-1 bg-orange-500 hover:bg-orange-600" size="lg" onClick={handleSubmit} disabled={loading}>
              {loading ? '保存中...' : '💾 完成销售'}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>支付设置</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {payments.map((p, i) => (
              <div key={i} className="space-y-2 p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Select
                    value={p.method}
                    onValueChange={(v) => {
                      const newPayments = [...payments];
                      newPayments[i].method = v;
                      setPayments(newPayments);
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="现金">现金</SelectItem>
                      <SelectItem value="微信">微信</SelectItem>
                      <SelectItem value="支付宝">支付宝</SelectItem>
                      <SelectItem value="转账">转账</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="金额"
                    value={p.amount || ''}
                    onChange={(e) => {
                      const newPayments = [...payments];
                      newPayments[i].amount = parseFloat(e.target.value) || 0;
                      setPayments(newPayments);
                    }}
                    className="flex-1"
                  />
                  {payments.length > 1 && (
                    <Button variant="destructive" size="sm" onClick={() => setPayments(payments.filter((_, j) => j !== i))}>
                      删除
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="付款人姓名（可选）"
                    value={p.payerName}
                    onChange={(e) => {
                      const newPayments = [...payments];
                      newPayments[i].payerName = e.target.value;
                      setPayments(newPayments);
                    }}
                    className="flex-1"
                  />
                  <Input
                    placeholder="第三方姓名（可选）"
                    value={p.thirdPartyName}
                    onChange={(e) => {
                      const newPayments = [...payments];
                      newPayments[i].thirdPartyName = e.target.value;
                      setPayments(newPayments);
                    }}
                    className="flex-1"
                  />
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => setPayments([...payments, { method: '现金', amount: 0, payerName: '', thirdPartyName: '' }])}
              className="w-full"
            >
              + 添加支付方式
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPaymentDialog(false)}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
