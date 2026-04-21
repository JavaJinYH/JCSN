import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/Toast';
import { sortByFrequency, recordFrequency } from '@/lib/frequency';
import type { Product, Category, Contact, Entity, BizProject } from '@/lib/types';
import { SaleCart, CartItem } from '@/components/sale/SaleCart';
import { SaleProductSelect } from '@/components/sale/SaleProductSelect';
import { SaleContactSelect } from '@/components/sale/SaleContactSelect';
import { SaleDelivery } from '@/components/sale/SaleDelivery';
import { SalePayment } from '@/components/sale/SalePayment';
import { SaleService } from '@/services/SaleService';
import { ProductService } from '@/services/ProductService';
import { ContactService } from '@/services/ContactService';
import { EntityService } from '@/services/EntityService';
import { ProjectService } from '@/services/ProjectService';

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
  const [buyerHistoricalPrices, setBuyerHistoricalPrices] = useState<Map<string, number>>(new Map());

  const [selectedBuyer, setSelectedBuyer] = useState<string>('__none__');
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('__none__');
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
  const [draftId, setDraftId] = useState<string | null>(null);
  const [manualFinalAmount, setManualFinalAmount] = useState<number | null>(null);
  const [showLossConfirm, setShowLossConfirm] = useState(false);
  const [showLossDetails, setShowLossDetails] = useState(false);
  const [showPriceUpdateDialog, setShowPriceUpdateDialog] = useState(false);

  const [payments, setPayments] = useState<PaymentInfo[]>([
    { method: '现金', amount: 0, payerName: '' },
  ]);
  const [photos, setPhotos] = useState<{ id: string; file?: File; preview: string; remark: string; type: string }[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    loadData();
    loadProjects();
  }, []);

  useEffect(() => {
    console.log('[SaleNew] selectedEntity 变化:', selectedEntity);
  }, [selectedEntity]);

  const [searchParams] = useSearchParams();
  const draftIdFromUrl = searchParams.get('draftId');

  useEffect(() => {
    if (draftIdFromUrl && dataLoaded && products.length > 0) {
      loadDraft(draftIdFromUrl);
    }
  }, [draftIdFromUrl, dataLoaded]);

  const loadDraft = async (id: string, productsData?: Product[]) => {
    try {
      setLoading(true);
      console.log('[SaleNew] 开始加载草稿, id:', id);
      const draft = await SaleService.getSaleDraftById(id);
      console.log('[SaleNew] 草稿数据:', draft);
      console.log('[SaleNew] paymentEntityId:', draft?.paymentEntityId);
      if (draft) {
        setDraftId(draft.id);
        setSelectedBuyer(draft.buyerId || '__none__');
        setSelectedIntroducer(draft.introducerId || '__none__');
        setSelectedEntity(draft.paymentEntityId || '');
        console.log('[SaleNew] 设置 selectedEntity 为:', draft.paymentEntityId || '');
        setSelectedProject(draft.projectId || '__none__');
        setPickerName(draft.pickerName || '');
        setPickerPhone(draft.pickerPhone || '');
        setNeedsDelivery(draft.needDelivery || false);
        setDeliveryAddress(draft.deliveryAddress || '');
        setDeliveryFee(draft.deliveryFee?.toString() || '0');
        setDiscount(draft.discount || 0);
        setRemark(draft.remark || '');
        setWrittenInvoiceNo(draft.writtenInvoiceNo || '');
        setPayments(draft.payments ? JSON.parse(draft.payments) : [{ method: '现金', amount: 0, payerName: '' }]);

        const productList = productsData || products;
        const cartItems: CartItem[] = [];
        for (const item of draft.items) {
          const product = productList.find(p => p.id === item.productId);
          if (product) {
            cartItems.push({
              product,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              costPrice: product.lastPurchasePrice || 0,
              salePrice: product.referencePrice || 0,
              purchaseUnit: product.purchaseUnit || null,
              saleUnit: product.unit,
              unitRatio: product.unitRatio || 1,
            });
          }
        }
        setCart(cartItems);
        toast('已加载草稿', 'success');
      }
    } catch (error) {
      console.error('[SaleNew] 加载草稿失败:', error);
      toast('加载草稿失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      let [productsData, categoriesData, contactsData, entitiesData] = await Promise.all([
        ProductService.getProducts(),
        EntityService.getCategories(),
        ContactService.getContacts(),
        EntityService.getEntities(),
      ]);

      let walkInCustomer = contactsData.find(c => c.name === '散客');
      if (!walkInCustomer) {
        walkInCustomer = await ContactService.ensureWalkInCustomer();
        contactsData = [...contactsData, walkInCustomer];
      }

      setProducts(productsData);
      setCategories(categoriesData);
      setContacts(sortByFrequency(contactsData, 'contact'));
      setEntities(sortByFrequency(entitiesData, 'entity'));
      setDataLoaded(true);
    } catch (error) {
      console.error('[SaleNew] 加载数据失败:', error);
      toast('数据加载失败，请刷新页面重试', 'error');
    }
  };

  const loadProjects = async () => {
    try {
      const projectsData = await ProjectService.getProjects();
      setProjects(sortByFrequency(projectsData, 'project'));
    } catch (error) {
      console.error('[SaleNew] 加载项目失败:', error);
    }
  };

  const entityOptions = useMemo(() => {
    return entities.map(e => ({
      value: e.id,
      label: `${e.name} ${e.entityType === 'personal' ? '(个人)' : e.entityType === 'company' ? '(公司)' : e.entityType === 'team' ? '(施工队)' : ''}`,
    }));
  }, [entities]);

  const loadHistoricalPrices = async (entityId: string) => {
    try {
      const priceMapObj = await EntityService.getEntityPrices(entityId);
      const priceMap = new Map<string, number>(Object.entries(priceMapObj));
      setHistoricalPrices(priceMap);
    } catch (error) {
      console.error('[SaleNew] 加载历史价格失败:', error);
    }
  };

  const loadBuyerHistoricalPrices = async (buyerId: string) => {
    try {
      const priceMapObj = await ContactService.getBuyerPrices(buyerId);
      const priceMap = new Map<string, number>(Object.entries(priceMapObj));
      setBuyerHistoricalPrices(priceMap);
    } catch (error) {
      console.error('[SaleNew] 加载买家历史价格失败:', error);
    }
  };

  const [previousSelectedEntity, setPreviousSelectedEntity] = useState<string>('');
  const [previousSelectedBuyer, setPreviousSelectedBuyer] = useState<string>('__none__');

  useEffect(() => {
    if (selectedEntity) {
      loadHistoricalPrices(selectedEntity);
      // 如果之前已经有商品，并且选择了新的挂靠主体（不是第一次选），提示是否更新购物车里的商品价格
      if (cart.length > 0 && previousSelectedEntity !== selectedEntity && previousSelectedEntity !== '') {
        setShowPriceUpdateDialog(true);
      }
      setPreviousSelectedEntity(selectedEntity);
    } else {
      setHistoricalPrices(new Map());
      setPreviousSelectedEntity('');
    }
  }, [selectedEntity]);

  // 监听联系人变化，加载联系人历史价格
  useEffect(() => {
    if (selectedBuyer && selectedBuyer !== '__none__') {
      loadBuyerHistoricalPrices(selectedBuyer);
      // 如果之前已经有商品，并且选择了新的联系人（不是第一次选/不是清空），提示是否更新购物车价格
      if (cart.length > 0 && previousSelectedBuyer !== selectedBuyer && previousSelectedBuyer !== '__none__') {
        setShowPriceUpdateDialog(true);
      }
      setPreviousSelectedBuyer(selectedBuyer);
    } else {
      setBuyerHistoricalPrices(new Map());
      setPreviousSelectedBuyer('__none__');
    }
  }, [selectedBuyer]);

  const getHistoricalPriceForProduct = (productId: string): number | undefined => {
    // 优先：挂靠主体历史价格
    const entityPrice = historicalPrices.get(productId);
    if (entityPrice !== undefined) {
      return entityPrice;
    }
    // 其次：联系人历史价格
    const buyerPrice = buyerHistoricalPrices.get(productId);
    if (buyerPrice !== undefined) {
      return buyerPrice;
    }
    // 没有历史价格
    return undefined;
  };

  const handleUpdateCartPrices = () => {
    // 更新购物车里所有商品的价格，优先用挂靠主体历史价格，其次用联系人
    const updatedCart = cart.map(item => {
      const historicalPrice = getHistoricalPriceForProduct(item.product.id);
      if (historicalPrice !== undefined) {
        return { ...item, unitPrice: historicalPrice };
      }
      return item;
    });
    setCart(updatedCart);
    setShowPriceUpdateDialog(false);
  };


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
      const historicalPrice = getHistoricalPriceForProduct(product.id);
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

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const costTotal = cart.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);
  const totalDiscount = discount + subtotal * (100 - discountRate) / 100;
  const deliveryFeeAmount = needsDelivery ? parseFloat(deliveryFee) || 0 : 0;
  const calculatedFinalAmount = subtotal - totalDiscount;
  const finalAmount = calculatedFinalAmount + deliveryFeeAmount;
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const paidAmount = Math.min(totalPaid, finalAmount);
  const remainingAmount = Math.max(0, finalAmount - totalPaid);
  const totalCost = costTotal + deliveryFeeAmount;
  const totalProfit = finalAmount - totalCost;
  const productProfit = calculatedFinalAmount - costTotal;
  const profitRate = finalAmount > 0 ? (totalProfit / finalAmount) * 100 : 0;
  const showLowProfitWarning = profitRate < 10 && profitRate >= 0 && finalAmount > 0;
  const showLossWarning = totalProfit < 0 && finalAmount > 0;

  useEffect(() => {
    if (subtotal <= 0) {
      setDeliverySuggestion('');
      return;
    }
    if (productProfit < 10) {
      setDeliverySuggestion('⚠️ 利润较低，建议加收配送费或由客户自提');
    } else if (productProfit < 50) {
      setDeliverySuggestion('💡 利润适中，建议根据距离酌情收取配送费');
    } else {
      setDeliverySuggestion('✅ 利润充足，可考虑免费配送');
    }
  }, [productProfit, subtotal]);

  const handleMoli = () => {
    const moliAmount = Math.floor(subtotal - totalDiscount);
    setDiscount(moliAmount);
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

    setLoading(true);
    try {
      const result = await SaleService.createSaleOrder({
        buyerId: selectedBuyer,
        introducerId: selectedIntroducer,
        pickerName: pickerName || null,
        pickerPhone: pickerPhone || null,
        projectId: selectedProject,
        paymentEntityId: selectedEntity,
        totalAmount: finalAmount,
        discount: totalDiscount,
        paidAmount,
        writtenInvoiceNo: writtenInvoiceNo || null,
        remark: remark || null,
        needDelivery: needsDelivery,
        deliveryAddress: needsDelivery ? deliveryAddress : null,
        deliveryFee: needsDelivery ? parseFloat(deliveryFee) || 0 : 0,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.unitPrice * item.quantity,
          costPriceSnapshot: item.costPrice,
          sellingPriceSnapshot: item.salePrice,
        })),
        payments: payments.filter(p => p.amount > 0).map(p => ({
          method: p.method,
          amount: p.amount,
          payerName: p.payerName || null,
        })),
        photos: photos.map(p => ({
          file: p.file,
          preview: p.preview,
          remark: p.remark,
          type: p.type,
        })),
      });

      toast('销售保存成功！', 'success');
      navigate('/sales');
    } catch (error: any) {
      console.error('[SaleNew] 保存销售失败:', error);
      toast(error.message || '保存失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmLoss = () => {
    setShowLossConfirm(false);
    handleSubmit();
  };

  const handleSaveDraft = async () => {
    if (cart.length === 0) {
      toast('请先添加商品', 'warning');
      return;
    }

    if (!selectedEntity) {
      toast('请选择挂靠主体', 'warning');
      return;
    }

    setLoading(true);
    try {
      const draftData = {
        buyerId: selectedBuyer,
        introducerId: selectedIntroducer,
        pickerName: pickerName || null,
        pickerPhone: pickerPhone || null,
        projectId: selectedProject,
        paymentEntityId: selectedEntity,
        totalAmount: finalAmount,
        discount: totalDiscount,
        paidAmount,
        writtenInvoiceNo: writtenInvoiceNo || null,
        remark: remark || null,
        needDelivery: needsDelivery,
        deliveryAddress: needsDelivery ? deliveryAddress : null,
        deliveryFee: needsDelivery ? parseFloat(deliveryFee) || 0 : 0,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.unitPrice * item.quantity,
          costPriceSnapshot: item.costPrice,
          sellingPriceSnapshot: item.salePrice,
        })),
        payments: payments.filter(p => p.amount > 0).map(p => ({
          method: p.method,
          amount: p.amount,
          payerName: p.payerName || null,
        })),
      };

      if (draftId) {
        await SaleService.updateSaleDraft(draftId, draftData);
        toast('草稿已更新', 'success');
      } else {
        const result = await SaleService.createSaleDraft(draftData);
        setDraftId(result.draft.id);
        toast('已暂存草稿', 'success');
      }
      navigate('/sales/drafts');
    } catch (error: any) {
      console.error('[SaleNew] 保存草稿失败:', error);
      toast(error.message || '暂存失败，请重试', 'error');
    } finally {
      setLoading(false);
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

              <div>
                <label className="text-xs text-slate-500 mb-1 block">关联项目（可选）</label>
                <Select
                  value={selectedProject}
                  onValueChange={(v) => {
                    if (v && v !== '__none__') {
                      // 找到选中的项目，并设置对应的挂靠主体
                      const project = projects.find(p => p.id === v);
                      if (project && project.entityId) {
                        setSelectedEntity(project.entityId);
                        recordFrequency('project', v);
                      }
                    }
                    setSelectedProject(v);
                  }}
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

              {selectedProject && selectedProject !== '__none__' && (
                <p className="text-xs text-amber-600 mt-2 bg-amber-50 px-2 py-1 rounded">
                  已选择项目，挂靠主体已自动设定
                </p>
              )}
            </CardContent>
          </Card>

          <SaleProductSelect
            products={products}
            categories={categories}
            historicalPrices={historicalPrices}
            onAddToCart={addToCart}
          />

          <SaleContactSelect
            contacts={contacts}
            selectedBuyer={selectedBuyer}
            selectedIntroducer={selectedIntroducer}
            pickerName={pickerName}
            pickerPhone={pickerPhone}
            onSelectedBuyerChange={setSelectedBuyer}
            onSelectedIntroducerChange={setSelectedIntroducer}
            onPickerNameChange={setPickerName}
            onPickerPhoneChange={setPickerPhone}
            onContactsChange={setContacts}
          />

          <SaleDelivery
            needsDelivery={needsDelivery}
            deliveryAddress={deliveryAddress}
            deliveryFee={deliveryFee}
            deliverySuggestion={deliverySuggestion}
            totalProfit={totalProfit}
            onNeedsDeliveryChange={setNeedsDelivery}
            onDeliveryAddressChange={setDeliveryAddress}
            onDeliveryFeeChange={setDeliveryFee}
          />
        </div>

        <div className="space-y-4 flex flex-col h-[calc(100vh-180px)]">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <SaleCart
              cart={cart}
              products={products}
              historicalPrices={historicalPrices}
              discount={discount}
              discountRate={discountRate}
              manualFinalAmount={manualFinalAmount}
              needsDelivery={needsDelivery}
              deliveryFee={deliveryFee}
              onUpdateCartQuantity={updateCartQuantity}
              onRemoveFromCart={removeFromCart}
              onUpdateCartItem={updateCartItem}
              onSetDiscount={setDiscount}
              onSetDiscountRate={setDiscountRate}
              onSetManualFinalAmount={setManualFinalAmount}
              onHandleMoli={handleMoli}
            />

            <SalePayment
              payments={payments}
              totalPaid={totalPaid}
              remainingAmount={remainingAmount}
              onPaymentsChange={setPayments}
              onDistributeRemaining={distributeRemainingAmount}
            />

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
          </div>
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600"
              size="lg"
              onClick={handleSubmit}
              disabled={cart.length === 0 || loading}
            >
              {loading ? '保存中...' : '💾 保存销售'}
            </Button>
            <Button
              className="w-full"
              variant="outline"
              size="lg"
              onClick={handleSaveDraft}
              disabled={cart.length === 0 || loading}
            >
              📝 暂存
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showPriceUpdateDialog} onOpenChange={setShowPriceUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>💡 已选择挂靠主体，是否更新购物车价格？</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>已选择新的挂靠主体，购物车里有{cart.length}件商品，是否将它们的价格更新为该挂靠主体的历史购买价？</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPriceUpdateDialog(false)}>
              不更新（保持当前价格）
            </Button>
            <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleUpdateCartPrices}>
              更新为历史价格
            </Button>
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
                <p>成交价 <span className="font-bold text-red-600">{formatCurrency(finalAmount)}</span> 低于成本价 <span className="font-bold">{formatCurrency(totalCost)}</span></p>
                <p className="mt-2 text-red-600">预计亏损：{formatCurrency(Math.abs(totalProfit))}</p>
              </>
            ) : (
              <>
                <p>订单利润率 <span className="font-bold text-yellow-600">{profitRate.toFixed(1)}%</span> 低于10%，是否确认继续？</p>
                <button
                  onClick={() => setShowLossDetails(!showLossDetails)}
                  className="mt-2 text-sm text-slate-500 hover:text-slate-700"
                >
                  {showLossDetails ? '▲ 收起明细' : '▼ 点击查看明细'}
                </button>
                {showLossDetails && (
                  <div className="mt-2 text-sm text-slate-600 space-y-1">
                    <p>成交总额：{formatCurrency(finalAmount)}</p>
                    <p>成本总额：{formatCurrency(totalCost)}</p>
                    <p>订单利润：{formatCurrency(totalProfit)}</p>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLossConfirm(false)}>
              取消
            </Button>
            <Button
              variant={showLossWarning ? 'destructive' : 'default'}
              onClick={handleConfirmLoss}
            >
              {showLossWarning ? '确认亏本保存' : '确认保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}