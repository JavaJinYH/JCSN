import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LegacyBillService } from '@/services/LegacyBillService';
import { ProjectService } from '@/services/ProjectService';
import { EntityService } from '@/services/EntityService';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/Toast';
import type { LegacyBill as LegacyBillType, Entity, BizProject } from '@/lib/types';

export function LegacyBills() {
  const navigate = useNavigate();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [projects, setProjects] = useState<BizProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingBill, setEditingBill] = useState<LegacyBillType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMode, setActiveMode] = useState<'simple' | 'order'>('simple');
  const [expandedEntityId, setExpandedEntityId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    entityId: '',
    projectId: '__none__',
    billDate: '',
    originalAmount: '',
    paidAmount: '0',
    remark: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [entitiesData, projectsData] = await Promise.all([
        EntityService.getEntities(),
        ProjectService.getProjects(),
      ]);
      setEntities(entitiesData);
      setProjects(projectsData);
    } catch (error) {
      console.error('[LegacyBills] 加载失败:', error);
      toast('数据加载失败，请刷新页面重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredEntities = searchTerm
    ? entities.filter(
      (e) =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : entities;

  const handleAddBill = async () => {
    if (!formData.entityId) {
      toast('请选择挂靠主体', 'warning');
      return;
    }
    if (!formData.billDate) {
      toast('请选择账单日期', 'warning');
      return;
    }
    if (!formData.originalAmount || parseFloat(formData.originalAmount) <= 0) {
      toast('请输入正确的账单金额', 'warning');
      return;
    }

    try {
      const originalAmount = parseFloat(formData.originalAmount);
      const paidAmount = parseFloat(formData.paidAmount) || 0;
      const projectId = formData.projectId === '__none__' ? undefined : formData.projectId;

      await LegacyBillService.createLegacyBill({
        entityId: formData.entityId,
        projectId,
        billDate: new Date(formData.billDate),
        originalAmount,
        paidAmount,
        remark: formData.remark || undefined,
      });

      toast('历史账单添加成功', 'success');
      resetForm();
      loadData();
    } catch (error) {
      console.error('[LegacyBills] 添加失败:', error);
      toast('添加失败，请重试', 'error');
    }
  };

  const handleUpdateBill = async () => {
    if (!editingBill) return;

    try {
      const originalAmount = parseFloat(formData.originalAmount);
      const paidAmount = parseFloat(formData.paidAmount) || 0;
      const projectId = formData.projectId === '__none__' ? undefined : formData.projectId;

      await LegacyBillService.updateLegacyBill(editingBill.id, {
        projectId,
        billDate: new Date(formData.billDate),
        originalAmount,
        paidAmount,
        remark: formData.remark || undefined,
      });

      toast('账单更新成功', 'success');
      resetForm();
      loadData();
    } catch (error) {
      console.error('[LegacyBills] 更新失败:', error);
      toast('更新失败，请重试', 'error');
    }
  };

  const handleDeleteBill = async (bill: LegacyBillType) => {
    try {
      await LegacyBillService.deleteLegacyBill(bill.id);
      toast('账单删除成功', 'success');
      loadData();
    } catch (error) {
      console.error('[LegacyBills] 删除失败:', error);
      toast('删除失败，请重试', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      entityId: '',
      projectId: '__none__',
      billDate: '',
      originalAmount: '',
      paidAmount: '0',
      remark: '',
    });
    setEditingBill(null);
    setShowAddDialog(false);
  };

  const openEditDialog = (bill: LegacyBillType) => {
    setFormData({
      entityId: bill.entityId,
      projectId: bill.projectId || '__none__',
      billDate: new Date(bill.billDate).toISOString().split('T')[0],
      originalAmount: bill.originalAmount.toString(),
      paidAmount: bill.paidAmount.toString(),
      remark: bill.remark || '',
    });
    setEditingBill(bill);
    setShowAddDialog(true);
  };

  const goToNewSale = () => {
    navigate('/sales/new?isHistorical=true');
  };

  const formatCurrencyFn = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(amount);
  };

  const toggleEntity = (entityId: string) => {
    if (expandedEntityId === entityId) {
      setExpandedEntityId(null);
    } else {
      setExpandedEntityId(entityId);
    }
  };

  const getProjectsByEntity = (entityId: string) => {
    return projects.filter(p => p.entityId === entityId);
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
          <h2 className="text-2xl font-bold text-slate-800">历史账单迁移</h2>
          <p className="text-slate-500 mt-1">老账目录入历史账单和简易销售单双模式，灵活录入</p>
        </div>
      </div>

      <Tabs defaultValue="simple" onValueChange={(v) => setActiveMode(v as 'simple' | 'order')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="simple">📝 极简历史账单</TabsTrigger>
          <TabsTrigger value="order">🧾 简易销售单</TabsTrigger>
        </TabsList>

        <TabsContent value="simple" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap gap-4 items-center">
                <Input
                  placeholder="搜索挂靠主体..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
                <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => setShowAddDialog(true)}>
                  + 添加历史账单
                </Button>
                <p className="text-sm text-slate-500 ml-auto">
                  提示：极简模式只记核心信息，适合记不清详情的老账
                </p>
              </div>
            </CardHeader>
            <CardContent>
              {filteredEntities.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  暂无挂靠主体数据
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredEntities.map((entity) => {
                    const entityProjects = getProjectsByEntity(entity.id);
                    const isExpanded = expandedEntityId === entity.id;

                    return (
                      <div key={entity.id} className="border rounded-lg overflow-hidden">
                        <div
                          className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 cursor-pointer"
                          onClick={() => toggleEntity(entity.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-lg">
                              {isExpanded ? '▼' : '▶'}
                            </div>
                            <div className="font-medium text-lg">{entity.name}</div>
                            <Badge variant="outline">{entity.entityType}</Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormData({
                                  ...formData,
                                  entityId: entity.id,
                                });
                                setShowAddDialog(true);
                              }}
                            >
                              + 添加账单
                            </Button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-4 border-t">
                            {entityProjects.length === 0 ? (
                              <div className="text-slate-500 text-sm mb-4">
                                暂无项目，直接查看历史账单
                              </div>
                            ) : (
                              <div className="mb-6">
                                <div className="text-sm font-medium text-slate-600 mb-2">
                                  该挂靠主体的项目：
                                </div>
                                {entityProjects.map((project) => (
                                  <div key={project.id} className="mb-6">
                                    <div className="flex items-center justify-between bg-blue-50 p-3 rounded mb-2">
                                      <div className="font-medium">{project.name}</div>
                                      <Badge variant="outline">{project.status}</Badge>
                                    </div>
                                    <LegacyBillList
                                      entityId={entity.id}
                                      projectId={project.id}
                                      onEdit={openEditDialog}
                                      onDelete={handleDeleteBill}
                                      formatCurrency={formatCurrencyFn}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}

                            <div>
                              <div className="text-sm font-medium text-slate-600 mb-2">
                                未分类的历史账单：
                              </div>
                              <LegacyBillList
                                entityId={entity.id}
                                projectId={null}
                                onEdit={openEditDialog}
                                onDelete={handleDeleteBill}
                                formatCurrency={formatCurrencyFn}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="order" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>简易销售单模式</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8">
                <p className="text-slate-600 mb-4">
                  记得商品详情的老账，用正常的「新增销售单」来录入
                </p>
                <p className="text-sm text-slate-400 mb-6">
                  可以正常计算利润，所有功能都能用
                </p>
                <Button size="lg" onClick={goToNewSale}>
                  去新增销售单 →
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showAddDialog} onOpenChange={(open) => {
        if (!open) resetForm();
        setShowAddDialog(open);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBill ? '编辑历史账单' : '添加历史账单'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                挂靠主体 <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.entityId}
                onValueChange={(v) => setFormData({ ...formData, entityId: v })}
                disabled={!!editingBill}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择挂靠主体" />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} ({e.entityType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                项目（可选）
              </label>
              <Select
                value={formData.projectId}
                onValueChange={(v) => setFormData({ ...formData, projectId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择项目" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">无项目</SelectItem>
                  {formData.entityId
                    ? projects
                        .filter(p => p.entityId === formData.entityId)
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))
                    : []}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  账单日期 <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.billDate}
                  onChange={(e) => setFormData({ ...formData, billDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  总金额 <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.originalAmount}
                  onChange={(e) => setFormData({ ...formData, originalAmount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                已付金额
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.paidAmount}
                onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                placeholder="0.00"
              />
              <p className="text-xs text-slate-500 mt-1">
                剩余未付：{formatCurrencyFn((parseFloat(formData.originalAmount) || 0) - (parseFloat(formData.paidAmount) || 0))}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                备注
              </label>
              <Input
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                placeholder="可选备注信息"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              取消
            </Button>
            <Button onClick={editingBill ? handleUpdateBill : handleAddBill}>
              {editingBill ? '保存' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LegacyBillList({
  entityId,
  projectId,
  onEdit,
  onDelete,
  formatCurrency,
}: {
  entityId: string;
  projectId: string | null;
  onEdit: (bill: LegacyBillType) => void;
  onDelete: (bill: LegacyBillType) => void;
  formatCurrency: (amount: number) => string;
}) {
  const [bills, setBills] = useState<LegacyBillType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBills();
  }, [entityId]);

  const loadBills = async () => {
    try {
      setLoading(true);
      const data = await LegacyBillService.getLegacyBillsByEntity(entityId);

      if (projectId === null) {
        setBills(data.filter(b => !b.projectId));
      } else {
        setBills(data.filter(b => b.projectId === projectId));
      }
    } catch (error) {
      console.error('[LegacyBillList] 加载失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-slate-400">加载中...</div>;
  }

  if (bills.length === 0) {
    return <div className="text-sm text-slate-400">暂无历史账单</div>;
  }

  const totalRemaining = bills.reduce((sum, b) => sum + b.remainingAmount, 0);

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>日期</TableHead>
            <TableHead className="text-right">总金额</TableHead>
            <TableHead className="text-right">已付</TableHead>
            <TableHead className="text-right">未付</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>备注</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bills.map((bill) => (
            <TableRow key={bill.id}>
              <TableCell className="text-sm">
                {new Date(bill.billDate).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(bill.originalAmount)}
              </TableCell>
              <TableCell className="text-right font-mono text-green-600">
                {formatCurrency(bill.paidAmount)}
              </TableCell>
              <TableCell className="text-right font-mono text-orange-600">
                {formatCurrency(bill.remainingAmount)}
              </TableCell>
              <TableCell>
                <Badge
                  variant={bill.status === 'settled' ? 'default' : 'destructive'}
                  className={bill.status === 'settled' ? 'bg-green-100 text-green-800' : ''}
                >
                  {bill.status === 'settled' ? '已结清' : '未结清'}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-slate-500">
                {bill.remark || '-'}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(bill)}>
                    编辑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => onDelete(bill)}
                  >
                    删除
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-2 text-right text-sm">
        <span className="text-slate-500">本类账单累计未付：</span>
        <span className="font-bold text-orange-600 ml-2">{formatCurrency(totalRemaining)}</span>
      </div>
    </div>
  );
}
