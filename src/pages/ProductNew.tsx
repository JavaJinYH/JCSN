import { useEffect, useState } from 'react';
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
import { db } from '@/lib/db';
import { toast } from '@/components/Toast';
import type { Category } from '@/lib/types';

export function ProductNew() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    specification: '',
    model: '',
    unit: '个',
    costPrice: '',
    salePrice: '',
    stock: '',
    minStock: '',
    remark: '',
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await db.category.findMany({
        orderBy: { sortOrder: 'asc' },
      });
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.categoryId || !formData.costPrice || !formData.salePrice) {
      toast('请填写必填项', 'warning');
      return;
    }

    setLoading(true);
    try {
      await db.product.create({
        data: {
          name: formData.name,
          categoryId: formData.categoryId,
          specification: formData.specification || null,
          model: formData.model || null,
          unit: formData.unit,
          costPrice: parseFloat(formData.costPrice),
          salePrice: parseFloat(formData.salePrice),
          stock: parseInt(formData.stock) || 0,
          minStock: parseInt(formData.minStock) || 0,
        },
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
      const category = await db.category.create({
        data: {
          name: newCategoryName.trim(),
          description: newCategoryDesc.trim() || null,
        },
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
              <label className="text-sm font-medium mb-2 block">规格</label>
              <Input
                value={formData.specification}
                onChange={(e) =>
                  setFormData({ ...formData, specification: e.target.value })
                }
                placeholder="如：25*2.3"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">型号</label>
              <Input
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="如：PPR热水管"
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
                成本价 (元) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={formData.costPrice}
                onChange={(e) =>
                  setFormData({ ...formData, costPrice: e.target.value })
                }
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                销售价 (元) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={formData.salePrice}
                onChange={(e) =>
                  setFormData({ ...formData, salePrice: e.target.value })
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
    </div>
  );
}
