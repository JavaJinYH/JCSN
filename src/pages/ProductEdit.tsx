import { useEffect, useState } from 'react';
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
import { db } from '@/lib/db';
import type { Product, Category } from '@/lib/types';

export function ProductEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    specification: '',
    model: '',
    unit: '个',
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

      const [productData, categoriesData] = await Promise.all([
        db.product.findUnique({ where: { id } }),
        db.category.findMany({ orderBy: { sortOrder: 'asc' } }),
      ]);

      if (productData) {
        setProduct(productData);
        setFormData({
          name: productData.name,
          categoryId: productData.categoryId,
          specification: productData.specification || '',
          model: productData.model || '',
          unit: productData.unit,
          referencePrice: productData.referencePrice?.toString() || '',
          lastPurchasePrice: productData.lastPurchasePrice?.toString() || '',
          isPriceVolatile: productData.isPriceVolatile || false,
          stock: productData.stock.toString(),
          minStock: productData.minStock.toString(),
          remark: '',
        });
      }

      setCategories(categoriesData);
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
      await db.product.update({
        where: { id },
        data: {
          name: formData.name,
          categoryId: formData.categoryId,
          specification: formData.specification || null,
          model: formData.model || null,
          unit: formData.unit,
          referencePrice: formData.referencePrice ? parseFloat(formData.referencePrice) : null,
          lastPurchasePrice: formData.lastPurchasePrice ? parseFloat(formData.lastPurchasePrice) : null,
          isPriceVolatile: formData.isPriceVolatile,
          minStock: parseInt(formData.minStock) || 0,
        },
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
              <label className="text-sm font-medium mb-2 block">规格</label>
              <Input
                value={formData.specification}
                onChange={(e) =>
                  setFormData({ ...formData, specification: e.target.value })
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">型号</label>
              <Input
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">单位</label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="个">个</SelectItem>
                  <SelectItem value="米">米</SelectItem>
                  <SelectItem value="卷">卷</SelectItem>
                  <SelectItem value="根">根</SelectItem>
                  <SelectItem value="套">套</SelectItem>
                  <SelectItem value="箱">箱</SelectItem>
                  <SelectItem value="千克">千克</SelectItem>
                  <SelectItem value="吨">吨</SelectItem>
                </SelectContent>
              </Select>
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
