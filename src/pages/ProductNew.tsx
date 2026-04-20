import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { toast } from '@/components/Toast';
import { formatProductName } from '@/lib/utils';
import type { Category, Product } from '@/lib/types';
import { ProductService } from '@/services/ProductService';

export function ProductNew() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    categoryId: '',
    brand: '',
    specification: '',
    model: '',
    unit: '个',
    purchaseUnit: '',
    unitRatio: '1',
    referencePrice: '',
    lastPurchasePrice: '',
    stock: '',
    minStock: '',
    remark: '',
    isPriceVolatile: false,
  });

  const [showSimilarDialog, setShowSimilarDialog] = useState(false);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!formData.code) {
      generateCode();
    }
  }, []);

  const generateCode = async () => {
    try {
      const code = await ProductService.generateProductCode();
      setFormData(prev => ({ ...prev, code }));
    } catch (error) {
      console.error('Failed to generate product code:', error);
    }
  };

  const loadData = async () => {
    try {
      const [categoriesData, productsData] = await Promise.all([
        ProductService.getCategories(),
        ProductService.getProductNames(),
      ]);
      setCategories(categoriesData);
      setAllProducts(productsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const brandOptions = useMemo(() => {
    const brands = [...new Set(allProducts.map(p => p.brand).filter(Boolean) as string[])];
    return brands.map(b => ({ value: b, label: b })).sort((a, b) => a.label.localeCompare(b.label));
  }, [allProducts]);

  const specificationOptions = useMemo(() => {
    const specs = [...new Set(allProducts.map(p => p.specification).filter(Boolean) as string[])];
    return specs.map(s => ({ value: s, label: s })).sort((a, b) => a.label.localeCompare(b.label));
  }, [allProducts]);

  const similarProductsList = useMemo(() => {
    if (!formData.name) return [];
    const name = formData.name.toLowerCase();
    const brand = formData.brand?.toLowerCase();
    const spec = formData.specification?.toLowerCase();

    return allProducts.filter(p => {
      if (formData.categoryId && (p as any).categoryId !== formData.categoryId) return false;
      const pName = p.name.toLowerCase();
      const pBrand = (p.brand || '').toLowerCase();
      const pSpec = (p.specification || '').toLowerCase();

      if (name && pName.includes(name)) return true;
      if (brand && pBrand === brand && pName.includes(name)) return true;
      if (brand && spec && pBrand === brand && pSpec === spec) return true;
      return false;
    }).slice(0, 5);
  }, [allProducts, formData.name, formData.brand, formData.specification, formData.categoryId]);

  useEffect(() => {
    if (similarProductsList.length > 0) {
      setSimilarProducts(similarProductsList);
      setShowSimilarDialog(true);
    }
  }, [similarProductsList.length]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.categoryId) {
      toast('请填写必填项', 'warning');
      return;
    }

    setLoading(true);
    try {
      await ProductService.createProduct({
        code: formData.code || undefined,
        name: formData.name,
        categoryId: formData.categoryId,
        brand: formData.brand || undefined,
        specification: formData.specification || undefined,
        model: formData.model || undefined,
        unit: formData.unit,
        purchaseUnit: formData.purchaseUnit || undefined,
        unitRatio: formData.purchaseUnit ? (parseFloat(formData.unitRatio) || 1).toString() : '1',
        referencePrice: formData.referencePrice ? parseFloat(formData.referencePrice) : undefined,
        lastPurchasePrice: formData.lastPurchasePrice ? parseFloat(formData.lastPurchasePrice) : undefined,
        isPriceVolatile: formData.isPriceVolatile,
        stock: parseInt(formData.stock) || 0,
        minStock: parseInt(formData.minStock) || 0,
      });

      toast('商品添加成功！', 'success');
      navigate('/products');
    } catch (error) {
      console.error('Failed to add product:', error);
      toast('添加失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast('请输入分类名称', 'warning');
      return;
    }

    try {
      const category = await ProductService.createCategory({
        name: newCategoryName.trim(),
      });

      setCategories([...categories, category]);
      setFormData({ ...formData, categoryId: category.id });
      setShowCategoryDialog(false);
      setNewCategoryName('');
      setNewCategoryDesc('');
      toast('分类添加成功', 'success');
    } catch (error) {
      console.error('Failed to add category:', error);
      toast('添加分类失败', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">添加商品</h2>
          <p className="text-slate-500 mt-1">添加新的商品到库存</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/products')}>
          取消
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>商品信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium mb-2 block">
                商品编码 <span className="text-xs text-slate-400">(自动生成)</span>
              </label>
              <Input
                value={formData.code}
                readOnly
                placeholder="自动生成"
                className="bg-slate-50"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                商品名称 <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入商品名称"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                商品分类 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, categoryId: value })
                  }
                >
                  <SelectTrigger className="flex-1">
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
                <Button variant="outline" onClick={() => setShowCategoryDialog(true)}>
                  + 新分类
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">品牌</label>
              <Combobox
                value={formData.brand}
                onValueChange={(value) => setFormData({ ...formData, brand: value })}
                options={brandOptions}
                placeholder="输入或选择品牌"
                emptyText="没有找到匹配的品牌，输入后按回车"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">规格参数</label>
              <Combobox
                value={formData.specification}
                onValueChange={(value) => setFormData({ ...formData, specification: value })}
                options={specificationOptions}
                placeholder="输入或选择规格"
                emptyText="没有找到匹配的规格，输入后按回车"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">产品型号</label>
              <Input
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="如：PPR热水管"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">进货单位换算</label>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-slate-500">1</span>
                <Select
                  value={formData.purchaseUnit}
                  onValueChange={(v) => setFormData({ ...formData, purchaseUnit: v })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="进货单位" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="箱">箱</SelectItem>
                    <SelectItem value="盘">盘</SelectItem>
                    <SelectItem value="件">件</SelectItem>
                    <SelectItem value="卷">卷</SelectItem>
                    <SelectItem value="捆">捆</SelectItem>
                    <SelectItem value="袋">袋</SelectItem>
                    <SelectItem value="桶">桶</SelectItem>
                    <SelectItem value="罐">罐</SelectItem>
                    <SelectItem value="瓶">瓶</SelectItem>
                    <SelectItem value="个">个</SelectItem>
                    <SelectItem value="套">套</SelectItem>
                    <SelectItem value="组">组</SelectItem>
                    <SelectItem value="盒">盒</SelectItem>
                    <SelectItem value="米">米</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-slate-500">=</span>
                <Input
                  type="number"
                  value={formData.unitRatio}
                  onChange={(e) => setFormData({ ...formData, unitRatio: e.target.value })}
                  className="w-20"
                  min="0.01"
                  step="0.01"
                />
                <Select
                  value={formData.unit}
                  onValueChange={(value) => setFormData({ ...formData, unit: value })}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="个">个</SelectItem>
                    <SelectItem value="件">件</SelectItem>
                    <SelectItem value="只">只</SelectItem>
                    <SelectItem value="支">支</SelectItem>
                    <SelectItem value="根">根</SelectItem>
                    <SelectItem value="张">张</SelectItem>
                    <SelectItem value="片">片</SelectItem>
                    <SelectItem value="块">块</SelectItem>
                    <SelectItem value="卷">卷</SelectItem>
                    <SelectItem value="盘">盘</SelectItem>
                    <SelectItem value="套">套</SelectItem>
                    <SelectItem value="组">组</SelectItem>
                    <SelectItem value="箱">箱</SelectItem>
                    <SelectItem value="盒">盒</SelectItem>
                    <SelectItem value="袋">袋</SelectItem>
                    <SelectItem value="捆">捆</SelectItem>
                    <SelectItem value="桶">桶</SelectItem>
                    <SelectItem value="罐">罐</SelectItem>
                    <SelectItem value="瓶">瓶</SelectItem>
                    <SelectItem value="米">米</SelectItem>
                    <SelectItem value="厘米">厘米</SelectItem>
                    <SelectItem value="分米">分米</SelectItem>
                    <SelectItem value="千米">千米(km)</SelectItem>
                    <SelectItem value="英寸">英寸(inch)</SelectItem>
                    <SelectItem value="英尺">英尺(ft)</SelectItem>
                    <SelectItem value="平方米">平方米(㎡)</SelectItem>
                    <SelectItem value="平方厘米">平方厘米(c㎡)</SelectItem>
                    <SelectItem value="立方米">立方米(m³)</SelectItem>
                    <SelectItem value="立方厘米">立方厘米(cm³)</SelectItem>
                    <SelectItem value="升">升(L)</SelectItem>
                    <SelectItem value="毫升">毫升(mL)</SelectItem>
                    <SelectItem value="加仑">加仑(gal)</SelectItem>
                    <SelectItem value="吨">吨(t)</SelectItem>
                    <SelectItem value="千克">千克(kg)</SelectItem>
                    <SelectItem value="克">克(g)</SelectItem>
                    <SelectItem value="毫克">毫克(mg)</SelectItem>
                    <SelectItem value="磅">磅(lb)</SelectItem>
                    <SelectItem value="盎司">盎司(oz)</SelectItem>
                    <SelectItem value="板">板</SelectItem>
                    <SelectItem value="条">条</SelectItem>
                    <SelectItem value="节">节</SelectItem>
                    <SelectItem value="段">段</SelectItem>
                    <SelectItem value="双">双</SelectItem>
                    <SelectItem value="对">对</SelectItem>
                    <SelectItem value="包">包</SelectItem>
                    <SelectItem value="扎">扎</SelectItem>
                    <SelectItem value="令">令</SelectItem>
                    <SelectItem value="码">码(yd)</SelectItem>
                    <SelectItem value="平方码">平方码(yd²)</SelectItem>
                    <SelectItem value="亩">亩</SelectItem>
                    <SelectItem value="公顷">公顷(ha)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                如：1盘 = 100米、1件 = 24个、1箱 = 12瓶
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                上次进价 (元)
              </label>
              <Input
                type="number"
                value={formData.lastPurchasePrice}
                onChange={(e) =>
                  setFormData({ ...formData, lastPurchasePrice: e.target.value })
                }
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                参考售价 (元)
              </label>
              <Input
                type="number"
                value={formData.referencePrice}
                onChange={(e) =>
                  setFormData({ ...formData, referencePrice: e.target.value })
                }
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">初始库存</label>
              <Input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                placeholder="0"
                min="0"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">最低库存预警</label>
              <Input
                type="number"
                value={formData.minStock}
                onChange={(e) =>
                  setFormData({ ...formData, minStock: e.target.value })
                }
                placeholder="0"
                min="0"
              />
              <p className="text-xs text-slate-500 mt-1">
                当库存低于此值时，系统将发出预警提醒
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <input
              type="checkbox"
              id="isPriceVolatile"
              checked={formData.isPriceVolatile}
              onChange={(e) =>
                setFormData({ ...formData, isPriceVolatile: e.target.checked })
              }
              className="w-4 h-4 rounded border-yellow-400 text-yellow-500 focus:ring-yellow-400"
            />
            <div>
              <label htmlFor="isPriceVolatile" className="text-sm font-medium cursor-pointer">
                ⚠️ 价格波动商品
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                标记后，退货时需要输入当日市场价格（如不锈钢、电线等贵金属商品）
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">备注</label>
            <Input
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              placeholder="添加备注信息（可选）"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate('/products')}>
          取消
        </Button>
        <Button
          className="bg-orange-500 hover:bg-orange-600"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? '保存中...' : '💾 保存商品'}
        </Button>
      </div>

      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加新分类</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">分类名称 *</label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="输入分类名称"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">分类描述</label>
              <Input
                value={newCategoryDesc}
                onChange={(e) => setNewCategoryDesc(e.target.value)}
                placeholder="输入分类描述（可选）"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddCategory}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSimilarDialog} onOpenChange={setShowSimilarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>发现相似商品</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-600">
              系统发现以下已有商品与您正在创建的商品相似，请确认是否继续创建：
            </p>
            <div className="space-y-2">
              {similarProducts.map((p) => (
                <div key={p.id} className="p-3 bg-slate-50 rounded-lg">
                  <div className="font-medium">{formatProductName(p)}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400">
              提示：如果这些商品与您要创建的是同一个，请选择"查看已有商品"；如果您确定要创建新商品，请选择"继续创建"。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSimilarDialog(false)}>
              继续创建
            </Button>
            <Button onClick={() => { setShowSimilarDialog(false); navigate('/products'); }}>
              查看已有商品
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
