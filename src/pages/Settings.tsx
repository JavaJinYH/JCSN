import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { db } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import type { SystemSetting, Category } from '@/lib/types';
import * as XLSX from 'xlsx';

export function Settings() {
  const [settings, setSettings] = useState<SystemSetting | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');

  const [shopForm, setShopForm] = useState({
    shopName: '',
    ownerName: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsData, categoriesData] = await Promise.all([
        db.systemSetting.findUnique({ where: { id: 'default' } }),
        db.category.findMany({ orderBy: { sortOrder: 'asc' } }),
      ]);

      if (settingsData) {
        setSettings(settingsData);
        setShopForm({
          shopName: settingsData.shopName,
          ownerName: settingsData.ownerName || '',
          phone: settingsData.phone || '',
          address: settingsData.address || '',
        });
      }

      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveShopInfo = async () => {
    setSaving(true);
    try {
      await db.systemSetting.upsert({
        where: { id: 'default' },
        update: shopForm,
        create: {
          id: 'default',
          ...shopForm,
        },
      });

      alert('店铺信息保存成功！');
      loadData();
    } catch (error) {
      console.error('Failed to save shop info:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleBackupData = async () => {
    try {
      const [products, customers, sales, categoriesData] = await Promise.all([
        db.product.findMany({ include: { category: true } }),
        db.customer.findMany(),
        db.sale.findMany({
          include: {
            customer: true,
            items: { include: { product: true } },
          },
        }),
        db.category.findMany(),
      ]);

      const backupData = {
        exportTime: new Date().toISOString(),
        shopInfo: settings,
        categories: categoriesData,
        products: products.map((p) => ({
          name: p.name,
          category: p.category.name,
          specification: p.specification,
          model: p.model,
          unit: p.unit,
          costPrice: p.costPrice,
          salePrice: p.salePrice,
          stock: p.stock,
          minStock: p.minStock,
        })),
        customers: customers.map((c) => ({
          name: c.name,
          phone: c.phone,
          customerType: c.customerType,
          address: c.address,
        })),
        salesCount: sales.length,
        totalSalesAmount: sales.reduce((sum, s) => sum + s.paidAmount, 0),
      };

      const ws = XLSX.utils.json_to_sheet(backupData.products);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '商品数据');
      XLSX.writeFile(wb, `折柳建材数据备份_${new Date().toISOString().split('T')[0]}.xlsx`);

      setShowBackupDialog(false);
      alert('数据备份成功！');
    } catch (error) {
      console.error('Failed to backup data:', error);
      alert('备份失败，请重试');
    }
  };

  const handleAddCategory = async () => {
    if (!categoryName.trim()) {
      alert('请输入分类名称');
      return;
    }

    try {
      await db.category.create({
        data: {
          name: categoryName.trim(),
          description: categoryDesc.trim() || null,
        },
      });

      setShowCategoryDialog(false);
      setCategoryName('');
      setCategoryDesc('');
      loadData();
    } catch (error) {
      console.error('Failed to add category:', error);
      alert('添加分类失败');
    }
  };

  const handleUpdateCategory = async () => {
    if (!editCategory || !categoryName.trim()) {
      alert('请输入分类名称');
      return;
    }

    try {
      await db.category.update({
        where: { id: editCategory.id },
        data: {
          name: categoryName.trim(),
          description: categoryDesc.trim() || null,
        },
      });

      setEditCategory(null);
      setCategoryName('');
      setCategoryDesc('');
      loadData();
    } catch (error) {
      console.error('Failed to update category:', error);
      alert('更新分类失败');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('确定要删除此分类吗？')) return;

    try {
      await db.category.delete({ where: { id } });
      loadData();
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert('删除失败，该分类下可能有商品');
    }
  };

  const openEditCategory = (category: Category) => {
    setEditCategory(category);
    setCategoryName(category.name);
    setCategoryDesc(category.description || '');
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
      <div>
        <h2 className="text-2xl font-bold text-slate-800">系统设置</h2>
        <p className="text-slate-500 mt-1">管理店铺信息和系统配置</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>🏪 店铺信息</CardTitle>
          <CardDescription>设置店铺基本信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">店铺名称</label>
              <Input
                value={shopForm.shopName}
                onChange={(e) => setShopForm({ ...shopForm, shopName: e.target.value })}
                placeholder="请输入店铺名称"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">店主姓名</label>
              <Input
                value={shopForm.ownerName}
                onChange={(e) => setShopForm({ ...shopForm, ownerName: e.target.value })}
                placeholder="请输入店主姓名"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">联系电话</label>
              <Input
                value={shopForm.phone}
                onChange={(e) => setShopForm({ ...shopForm, phone: e.target.value })}
                placeholder="请输入联系电话"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">店铺地址</label>
              <Input
                value={shopForm.address}
                onChange={(e) => setShopForm({ ...shopForm, address: e.target.value })}
                placeholder="请输入店铺地址"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              className="bg-orange-500 hover:bg-orange-600"
              onClick={handleSaveShopInfo}
              disabled={saving}
            >
              {saving ? '保存中...' : '💾 保存设置'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>📂 商品分类</CardTitle>
              <CardDescription>管理商品分类</CardDescription>
            </div>
            <Button onClick={() => setShowCategoryDialog(true)}>+ 添加分类</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="p-3 border border-slate-200 rounded-lg hover:border-orange-300 transition-colors"
              >
                <div className="font-medium text-slate-800">{category.name}</div>
                {category.description && (
                  <div className="text-xs text-slate-500 mt-1">{category.description}</div>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => openEditCategory(category)}
                    className="text-xs text-orange-500 hover:text-orange-600"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="text-xs text-red-500 hover:text-red-600"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>💾 数据管理</CardTitle>
          <CardDescription>备份和导出数据</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <div className="font-medium">数据备份</div>
              <div className="text-sm text-slate-500">将所有数据导出为Excel文件</div>
            </div>
            <Button variant="outline" onClick={() => setShowBackupDialog(true)}>
              📥 备份数据
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <div className="font-medium">数据库位置</div>
              <div className="text-sm text-slate-500 font-mono">prisma/dev.db</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ℹ️ 系统信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">系统版本</span>
              <Badge>v1.0.0</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">数据库</span>
              <Badge variant="secondary">SQLite</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-500">开发框架</span>
              <Badge variant="secondary">Electron + React</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showBackupDialog} onOpenChange={setShowBackupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认数据备份</DialogTitle>
            <DialogDescription>
              将导出所有商品和客户数据到Excel文件
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600">
              备份将包含：商品信息、客户信息、销售统计等数据。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBackupDialog(false)}>
              取消
            </Button>
            <Button onClick={handleBackupData}>确认备份</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showCategoryDialog}
        onOpenChange={(open) => {
          setShowCategoryDialog(open);
          if (!open) {
            setCategoryName('');
            setCategoryDesc('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加分类</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                分类名称 <span className="text-red-500">*</span>
              </label>
              <Input
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="输入分类名称"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">分类描述</label>
              <Input
                value={categoryDesc}
                onChange={(e) => setCategoryDesc(e.target.value)}
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

      <Dialog
        open={!!editCategory}
        onOpenChange={(open) => {
          if (!open) {
            setEditCategory(null);
            setCategoryName('');
            setCategoryDesc('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑分类</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                分类名称 <span className="text-red-500">*</span>
              </label>
              <Input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">分类描述</label>
              <Input
                value={categoryDesc}
                onChange={(e) => setCategoryDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCategory(null)}>
              取消
            </Button>
            <Button onClick={handleUpdateCategory}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
