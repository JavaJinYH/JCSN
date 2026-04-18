import { useEffect, useState } from 'react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { db } from '@/lib/db';
import { toast } from '@/components/Toast';
import type { Brand, ProductSpec } from '@/lib/types';

export function Brands() {
  const [brands, setBrands] = useState<(Brand & { specs: ProductSpec[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSpecDialog, setShowSpecDialog] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [editingSpec, setEditingSpec] = useState<ProductSpec | null>(null);
  const [brandName, setBrandName] = useState('');
  const [specName, setSpecName] = useState('');
  const [specUnit, setSpecUnit] = useState('个');
  const [specPrice, setSpecPrice] = useState('');
  const [specs, setSpecs] = useState<{ productId: string; productName: string; brandId: string; name: string; unit: string; salePrice: number }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [brandsData, productsData] = await Promise.all([
        db.brand.findMany({
          include: { specs: { include: { product: true } } },
          orderBy: { name: 'asc' },
        }),
        db.product.findMany({
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
      ]);
      setBrands(brandsData);
      setProducts(productsData);
    } catch (error) {
      console.error('[Brands] 加载失败:', error);
      toast('数据加载失败，请刷新页面重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredBrands = searchTerm
    ? brands.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : brands;

  const handleAddBrand = async () => {
    if (!brandName.trim()) {
      toast('请输入品牌名称', 'warning');
      return;
    }
    try {
      await db.brand.create({
        data: { name: brandName.trim() },
      });
      toast('品牌添加成功', 'success');
      setShowAddDialog(false);
      setBrandName('');
      loadData();
    } catch (error) {
      console.error('[Brands] 添加失败:', error);
      toast('添加失败，请重试', 'error');
    }
  };

  const handleEditBrand = async () => {
    if (!editingBrand || !brandName.trim()) return;
    try {
      await db.brand.update({
        where: { id: editingBrand.id },
        data: { name: brandName.trim() },
      });
      toast('品牌更新成功', 'success');
      setEditingBrand(null);
      setBrandName('');
      loadData();
    } catch (error) {
      console.error('[Brands] 更新失败:', error);
      toast('更新失败，请重试', 'error');
    }
  };

  const handleDeleteBrand = async (brand: Brand) => {
    if (!confirm(`确定要删除品牌 "${brand.name}" 吗？相关规格也会被删除。`)) return;
    try {
      await db.brand.delete({ where: { id: brand.id } });
      toast('品牌删除成功', 'success');
      loadData();
    } catch (error) {
      console.error('[Brands] 删除失败:', error);
      toast('删除失败，请重试', 'error');
    }
  };

  const handleAddSpec = async () => {
    if (!specs.length) {
      toast('请添加至少一个规格', 'warning');
      return;
    }
    try {
      for (const spec of specs) {
        await db.productSpec.create({
          data: {
            productId: spec.productId,
            brandId: spec.brandId,
            name: spec.name,
            unit: spec.unit,
            salePrice: spec.salePrice,
          },
        });
      }
      toast('规格添加成功', 'success');
      setShowSpecDialog(false);
      setSpecs([]);
      loadData();
    } catch (error) {
      console.error('[Brands] 添加规格失败:', error);
      toast('添加规格失败，请重试', 'error');
    }
  };

  const handleDeleteSpec = async (spec: ProductSpec) => {
    if (!confirm(`确定要删除规格 "${spec.name}" 吗？`)) return;
    try {
      await db.productSpec.delete({ where: { id: spec.id } });
      toast('规格删除成功', 'success');
      loadData();
    } catch (error) {
      console.error('[Brands] 删除规格失败:', error);
      toast('删除规格失败，请重试', 'error');
    }
  };

  const openSpecDialog = (brand: Brand) => {
    setEditingBrand(brand);
    setBrandName(brand.name);
    setSpecs([]);
    setShowSpecDialog(true);
  };

  const addSpecItem = () => {
    if (!editingBrand) return;
    if (!specName.trim()) {
      toast('请输入规格名称', 'warning');
      return;
    }
    if (!specPrice.trim() || isNaN(parseFloat(specPrice))) {
      toast('请输入有效的价格', 'warning');
      return;
    }
    setSpecs([...specs, {
      productId: '',
      productName: '',
      brandId: editingBrand.id,
      name: specName.trim(),
      unit: specUnit,
      salePrice: parseFloat(specPrice),
    }]);
    setSpecName('');
    setSpecPrice('');
  };

  const removeSpecItem = (index: number) => {
    setSpecs(specs.filter((_, i) => i !== index));
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
          <h2 className="text-2xl font-bold text-slate-800">品牌管理</h2>
          <p className="text-slate-500 mt-1">管理商品品牌和规格</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => setShowAddDialog(true)}>
          + 添加品牌
        </Button>
      </div>

      <Card>
        <CardHeader>
          <Input
            placeholder="搜索品牌..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-48"
          />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>品牌名称</TableHead>
                <TableHead>规格数量</TableHead>
                <TableHead>规格明细</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBrands.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                    暂无品牌数据
                  </TableCell>
                </TableRow>
              ) : (
                filteredBrands.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell className="font-medium">{brand.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{brand.specs.length} 个规格</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {brand.specs.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {brand.specs.slice(0, 5).map((spec) => (
                            <Badge key={spec.id} variant="outline" className="text-xs">
                              {spec.name} ¥{spec.salePrice}
                            </Badge>
                          ))}
                          {brand.specs.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{brand.specs.length - 5} 更多
                            </Badge>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openSpecDialog(brand)}>
                          添加规格
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingBrand(brand);
                            setBrandName(brand.name);
                            setShowAddDialog(true);
                          }}
                        >
                          编辑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteBrand(brand)}
                        >
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={(open) => {
        setShowAddDialog(open);
        if (!open) {
          setEditingBrand(null);
          setBrandName('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBrand ? '编辑品牌' : '添加品牌'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">品牌名称</label>
              <Input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="如：公牛、正泰、得力"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddDialog(false);
              setEditingBrand(null);
              setBrandName('');
            }}>
              取消
            </Button>
            <Button onClick={editingBrand ? handleEditBrand : handleAddBrand}>
              {editingBrand ? '保存' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSpecDialog} onOpenChange={(open) => {
        setShowSpecDialog(open);
        if (!open) {
          setEditingBrand(null);
          setSpecs([]);
        }
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>添加规格 - {editingBrand?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="border rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-xs text-slate-500">商品</label>
                  <select
                    className="w-full h-8 border rounded px-2 text-sm"
                    id="spec-product-select"
                  >
                    <option value="">选择商品</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500">规格名称</label>
                  <Input
                    value={specName}
                    onChange={(e) => setSpecName(e.target.value)}
                    placeholder="如：10A、16A"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">单位</label>
                  <Input
                    value={specUnit}
                    onChange={(e) => setSpecUnit(e.target.value)}
                    placeholder="个"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">售价</label>
                  <Input
                    value={specPrice}
                    onChange={(e) => setSpecPrice(e.target.value)}
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={addSpecItem}>+ 添加</Button>
              </div>
            </div>

            {specs.length > 0 && (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>商品</TableHead>
                      <TableHead>规格</TableHead>
                      <TableHead>单位</TableHead>
                      <TableHead className="text-right">售价</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {specs.map((spec, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-sm">
                          <select
                            className="w-full h-7 border rounded px-1 text-xs"
                            value={spec.productId}
                            onChange={(e) => {
                              const newSpecs = [...specs];
                              newSpecs[index].productId = e.target.value;
                              newSpecs[index].productName = products.find(p => p.id === e.target.value)?.name || '';
                              setSpecs(newSpecs);
                            }}
                          >
                            <option value="">选择商品</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell className="text-sm">{spec.name}</TableCell>
                        <TableCell className="text-sm">{spec.unit}</TableCell>
                        <TableCell className="text-right text-sm">¥{spec.salePrice.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="text-red-600 h-6" onClick={() => removeSpecItem(index)}>
                            删除
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {editingBrand?.specs && editingBrand.specs.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">现有规格</h4>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>商品</TableHead>
                        <TableHead>规格</TableHead>
                        <TableHead>单位</TableHead>
                        <TableHead className="text-right">售价</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editingBrand.specs.map((spec) => (
                        <TableRow key={spec.id}>
                          <TableCell className="text-sm">{spec.product?.name || '-'}</TableCell>
                          <TableCell className="text-sm">{spec.name}</TableCell>
                          <TableCell className="text-sm">{spec.unit}</TableCell>
                          <TableCell className="text-right text-sm">¥{spec.salePrice.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="text-red-600 h-6" onClick={() => handleDeleteSpec(spec)}>
                              删除
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowSpecDialog(false);
              setEditingBrand(null);
              setSpecs([]);
            }}>
              关闭
            </Button>
            <Button onClick={handleAddSpec} disabled={specs.length === 0}>
              保存规格
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}