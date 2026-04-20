import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/Toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/Combobox';
import type { Product, Category } from '@/lib/types';
import { ProductService } from '@/services/ProductService';

export function ProductEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const brandOptions = useMemo(() => {
    const brands = [...new Set(allProducts.map(p => p.brand).filter(Boolean) as string[])];
    return brands.map(b => ({ value: b, label: b })).sort((a, b) => a.label.localeCompare(b.label));
  }, [allProducts]);

  const specificationOptions = useMemo(() => {
    const specs = [...new Set(allProducts.map(p => p.specification).filter(Boolean) as string[])];
    return specs.map(s => ({ value: s, label: s })).sort((a, b) => a.label.localeCompare(b.label));
  }, [allProducts]);

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
    isPriceVolatile: false,
    stock: '',
    minStock: '',
    remark: '',
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      if (!id) return;

      const [productData, categoriesData, productsData] = await Promise.all([
        ProductService.getProductById(id),
        ProductService.getCategories(),
        ProductService.getProductNames(),
      ]);

      if (productData) {
        setProduct(productData);
        setFormData({
          code: productData.code || '',
          name: productData.name,
          categoryId: productData.categoryId,
          brand: productData.brand || '',
          specification: productData.specification || '',
          model: productData.model || '',
          unit: productData.unit,
          purchaseUnit: productData.purchaseUnit || '',
          unitRatio: productData.unitRatio?.toString() || '1',
          referencePrice: productData.referencePrice?.toString() || '',
          lastPurchasePrice: productData.lastPurchasePrice?.toString() || '',
          isPriceVolatile: productData.isPriceVolatile || false,
          stock: productData.stock.toString(),
          minStock: productData.minStock.toString(),
          remark: productData.remark || '',
        });
      }

      setCategories(categoriesData);
      setAllProducts(productsData);
    } catch (error) {
      console.error('Failed to load product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.categoryId) {
      toast('请填写必填项', 'warning');
      return;
    }

    if (!id) return;

    setSaving(true);
    try {
      await ProductService.updateProduct(id, {
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
        minStock: parseInt(formData.minStock) || 0,
      });

      toast('商品更新成功！', 'success');
      navigate('/products');
    } catch (error) {
      console.error('Failed to update product:', error);
      toast('更新失败，请重试', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">商品不存在</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">编辑商品</h2>
          <p className="text-slate-500 mt-1">修改商品信息</p>
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
                商品编码
              </label>
              <Input
                value={formData.code}
                readOnly
                placeholder="无编码"
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
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                商品分类 <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) =>
                  setFormData({ ...formData, categoryId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
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
                参考售价 (元)
              </label>
              <Input
                type="number"
                value={formData.referencePrice}
                onChange={(e) =>
                  setFormData({ ...formData, referencePrice: e.target.value })
                }
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                最近进价 (元)
              </label>
              <Input
                type="number"
                value={formData.lastPurchasePrice}
                onChange={(e) =>
                  setFormData({ ...formData, lastPurchasePrice: e.target.value })
                }
                min="0"
                step="0.01"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPriceVolatile"
                checked={formData.isPriceVolatile}
                onChange={(e) =>
                  setFormData({ ...formData, isPriceVolatile: e.target.checked })
                }
                className="w-4 h-4"
              />
              <label htmlFor="isPriceVolatile" className="text-sm font-medium">
                价格波动商品（退货时按当日市场价结算）
              </label>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">当前库存</label>
              <Input
                type="number"
                value={formData.stock}
                disabled
                className="bg-slate-100"
              />
              <p className="text-xs text-slate-500 mt-1">
                库存需要通过进货或销售单据调整
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">最低库存预警</label>
              <Input
                type="number"
                value={formData.minStock}
                onChange={(e) =>
                  setFormData({ ...formData, minStock: e.target.value })
                }
                min="0"
              />
            </div>
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
          disabled={saving}
        >
          {saving ? '保存中...' : '💾 保存修改'}
        </Button>
      </div>
    </div>
  );
}
