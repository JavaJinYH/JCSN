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
import { DataTablePagination, useDataTable } from '@/components/DataTable';
import { db } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/Toast';
import type { Entity, Contact, BizProject } from '@/lib/types';

interface EntityWithStats extends Entity {
  totalSpent: number;
  orderCount: number;
  projectCount: number;
  contact?: Contact | null;
}

export function Entities() {
  const [entities, setEntities] = useState<EntityWithStats[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [editEntity, setEditEntity] = useState<EntityWithStats | null>(null);
  const [deleteEntity, setDeleteEntity] = useState<EntityWithStats | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [entityDetail, setEntityDetail] = useState<EntityWithStats | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    entityType: 'personal',
    contactId: '__none__',
    address: '',
    remark: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [entitiesData, contactsData] = await Promise.all([
        db.entity.findMany({
          include: { contact: true },
          orderBy: { name: 'asc' },
        }),
        db.contact.findMany({ orderBy: { name: 'asc' } }),
      ]);

      const entitiesWithStats: EntityWithStats[] = await Promise.all(
        entitiesData.map(async (entity) => {
          const orders = await db.saleOrder.findMany({
            where: { paymentEntityId: entity.id },
          });
          const totalSpent = orders.reduce((sum, o) => sum + o.paidAmount, 0);
          const projects = await db.bizProject.findMany({
            where: { entityId: entity.id },
          });

          return {
            ...entity,
            totalSpent,
            orderCount: orders.length,
            projectCount: projects.length,
          };
        })
      );

      setEntities(entitiesWithStats);
      setContacts(contactsData);
    } catch (error) {
      console.error('[Entities] 加载主体失败:', error);
      toast('加载主体失败，请刷新页面重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredEntities = entities.filter((e) => {
    const matchesSearch =
      !searchTerm ||
      e.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      entityTypeFilter === 'all' || e.entityType === entityTypeFilter;
    return matchesSearch && matchesType;
  });

  const tableProps = useDataTable<EntityWithStats>({
    data: filteredEntities,
    defaultPageSize: 20,
  });

  const handleAddEntity = async () => {
    if (!formData.name.trim()) {
      toast('请输入主体名称', 'warning');
      return;
    }

    try {
      await db.entity.create({
        data: {
          name: formData.name.trim(),
          entityType: formData.entityType,
          contactId: formData.contactId === '__none__' ? null : formData.contactId,
          address: formData.address.trim() || null,
          remark: formData.remark.trim() || null,
        },
      });

      setShowAddDialog(false);
      setFormData({ name: '', entityType: 'personal', contactId: '__none__', address: '', remark: '' });
      loadData();
      toast('添加成功', 'success');
    } catch (error) {
      console.error('[Entities] 添加主体失败:', error);
      toast('添加失败，请重试', 'error');
    }
  };

  const handleUpdateEntity = async () => {
    if (!editEntity || !formData.name.trim()) {
      toast('请输入主体名称', 'warning');
      return;
    }

    try {
      await db.entity.update({
        where: { id: editEntity.id },
        data: {
          name: formData.name.trim(),
          entityType: formData.entityType,
          contactId: formData.contactId === '__none__' ? null : formData.contactId,
          address: formData.address.trim() || null,
          remark: formData.remark.trim() || null,
        },
      });

      setEditEntity(null);
      loadData();
      toast('更新成功', 'success');
    } catch (error) {
      console.error('[Entities] 更新主体失败:', error);
      toast('更新失败，请重试', 'error');
    }
  };

  const handleDeleteEntity = async () => {
    if (!deleteEntity) return;

    try {
      await db.entity.delete({ where: { id: deleteEntity.id } });
      setDeleteEntity(null);
      loadData();
      toast('删除成功', 'success');
    } catch (error) {
      console.error('[Entities] 删除主体失败:', error);
      toast('删除失败，请重试', 'error');
    }
  };

  const openEditDialog = (entity: EntityWithStats) => {
    setFormData({
      name: entity.name,
      entityType: entity.entityType,
      contactId: entity.contactId || '__none__',
      address: entity.address || '',
      remark: entity.remark || '',
    });
    setEditEntity(entity);
  };

  const handleOpenDetail = async (entity: EntityWithStats) => {
    setDetailLoading(true);
    try {
      const [orders, projects, roles] = await Promise.all([
        db.saleOrder.findMany({
          where: { paymentEntityId: entity.id },
          include: { buyer: true, project: true },
          orderBy: { saleDate: 'desc' },
          take: 10,
        }),
        db.bizProject.findMany({
          where: { entityId: entity.id },
          orderBy: { createdAt: 'desc' },
        }),
        db.contactEntityRole.findMany({
          where: { entityId: entity.id },
          include: { contact: true },
        }),
      ]);

      const totalSpent = orders.reduce((sum, o) => sum + o.paidAmount, 0);

      setEntityDetail({
        ...entity,
        totalSpent,
        orderCount: orders.length,
        projectCount: projects.length,
      });
      (window as any).__entityDetail = { orders, projects, roles };
      setShowDetailDialog(true);
    } catch (error) {
      console.error('[Entities] 加载详情失败:', error);
      toast('加载详情失败', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const getEntityTypeBadge = (type: string) => {
    switch (type) {
      case 'personal':
        return <Badge className="bg-blue-500">个人</Badge>;
      case 'company':
        return <Badge className="bg-purple-500">公司</Badge>;
      case 'government':
        return <Badge className="bg-green-500">政府</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  const entityDetailData = detailLoading ? null : (window as any).__entityDetail;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">结账主体管理</h2>
          <p className="text-slate-500 mt-1">管理付款主体 - 所有账目挂在主体下</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => setShowAddDialog(true)}>
          + 添加主体
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="全部类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="personal">个人</SelectItem>
                <SelectItem value="company">公司</SelectItem>
                <SelectItem value="government">政府</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="搜索主体名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48 h-8"
            />

            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm('')}
                className="h-8 text-slate-500"
              >
                清除搜索
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>主体名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>关联人员</TableHead>
                <TableHead>累计消费</TableHead>
                <TableHead>订单数</TableHead>
                <TableHead>项目数</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableProps.total === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    暂无主体数据
                  </TableCell>
                </TableRow>
              ) : (
                tableProps.data.map((entity) => (
                  <TableRow key={entity.id}>
                    <TableCell className="font-medium">{entity.name}</TableCell>
                    <TableCell>{getEntityTypeBadge(entity.entityType)}</TableCell>
                    <TableCell className="text-slate-500">
                      {entity.contact ? entity.contact.name : '-'}
                    </TableCell>
                    <TableCell className="font-mono text-orange-600">
                      {formatCurrency(entity.totalSpent)}
                    </TableCell>
                    <TableCell>{entity.orderCount}</TableCell>
                    <TableCell>{entity.projectCount}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDetail(entity)}>
                          详情
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(entity)}>
                          编辑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteEntity(entity)}
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
          <DataTablePagination
            pagination={{
              page: tableProps.page,
              pageSize: tableProps.pageSize,
              total: tableProps.total,
            }}
            onPageChange={tableProps.setPage}
            onPageSizeChange={tableProps.setPageSize}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-800">{entities.length}</div>
            <div className="text-sm text-slate-500">主体总数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {entities.filter(e => e.entityType === 'personal').length}
            </div>
            <div className="text-sm text-slate-500">个人主体</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">
              {entities.filter(e => e.entityType === 'company').length}
            </div>
            <div className="text-sm text-slate-500">公司主体</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(entities.reduce((sum, e) => sum + e.totalSpent, 0))}
            </div>
            <div className="text-sm text-slate-500">累计消费总额</div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加新主体</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                主体名称 <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入主体名称"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">主体类型</label>
              <Select
                value={formData.entityType}
                onValueChange={(v) => setFormData({ ...formData, entityType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">个人</SelectItem>
                  <SelectItem value="company">公司</SelectItem>
                  <SelectItem value="government">政府</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">关联人员（可选）</label>
              <Select
                value={formData.contactId}
                onValueChange={(v) => setFormData({ ...formData, contactId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择关联人员（可选）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">无</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.primaryPhone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">地址</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="输入地址"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">备注</label>
              <Input
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                placeholder="输入备注"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddEntity}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editEntity} onOpenChange={() => setEditEntity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑主体</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                主体名称 <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">主体类型</label>
              <Select
                value={formData.entityType}
                onValueChange={(v) => setFormData({ ...formData, entityType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">个人</SelectItem>
                  <SelectItem value="company">公司</SelectItem>
                  <SelectItem value="government">政府</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">关联人员（可选）</label>
              <Select
                value={formData.contactId}
                onValueChange={(v) => setFormData({ ...formData, contactId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择关联人员（可选）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">无</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.primaryPhone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">地址</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">备注</label>
              <Input
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEntity(null)}>
              取消
            </Button>
            <Button onClick={handleUpdateEntity}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteEntity} onOpenChange={() => setDeleteEntity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              确定要删除主体 <strong>{deleteEntity?.name}</strong> 吗？
            </p>
            <p className="text-sm text-red-500 mt-2">此操作不可恢复。</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteEntity(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDeleteEntity}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>主体详情 - {entityDetail?.name}</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-slate-500">加载中...</div>
            </div>
          ) : entityDetail && entityDetailData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-slate-500">累计消费</div>
                  <div className="text-xl font-bold text-blue-600">{formatCurrency(entityDetail.totalSpent)}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-slate-500">订单数</div>
                  <div className="text-xl font-bold text-green-600">{entityDetail.orderCount} 笔</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-slate-500">项目数</div>
                  <div className="text-xl font-bold text-purple-600">{entityDetail.projectCount} 个</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-sm text-slate-500">信用额度</div>
                  <div className="text-xl font-bold text-orange-600">{formatCurrency(entityDetail.creditLimit)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium mb-3">基本信息</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">主体类型:</span>
                      <span>{getEntityTypeBadge(entityDetail.entityType)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">关联人员:</span>
                      <span>{entityDetail.contact?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">地址:</span>
                      <span>{entityDetail.address || '-'}</span>
                    </div>
                    {entityDetail.remark && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">备注:</span>
                        <span>{entityDetail.remark}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium mb-3">信用信息</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">信用额度:</span>
                      <span>{formatCurrency(entityDetail.creditLimit)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">已用额度:</span>
                      <span className="text-orange-600">{formatCurrency(entityDetail.creditUsed)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">可用额度:</span>
                      <span className="text-green-600">{formatCurrency(entityDetail.creditLimit - entityDetail.creditUsed)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {entityDetailData.roles && entityDetailData.roles.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">关联人员及角色</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>人员</TableHead>
                        <TableHead>角色</TableHead>
                        <TableHead>是否默认</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entityDetailData.roles.map((role: any) => (
                        <TableRow key={role.id}>
                          <TableCell>{role.contact?.name || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{role.role}</Badge>
                          </TableCell>
                          <TableCell>{role.isDefault ? '是' : '否'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {entityDetailData.projects && entityDetailData.projects.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">关联项目</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>项目名称</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>开始日期</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entityDetailData.projects.slice(0, 5).map((project: BizProject) => (
                        <TableRow key={project.id}>
                          <TableCell className="font-medium">{project.name}</TableCell>
                          <TableCell>
                            <Badge className={
                              project.status === '进行中' ? 'bg-blue-500' :
                              project.status === '已完成' ? 'bg-green-500' :
                              'bg-slate-500'
                            }>
                              {project.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-500">
                            {project.startDate ? new Date(project.startDate).toLocaleDateString('zh-CN') : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {entityDetailData.orders && entityDetailData.orders.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">最近订单</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>单号</TableHead>
                        <TableHead>日期</TableHead>
                        <TableHead>购货人</TableHead>
                        <TableHead className="text-right">金额</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entityDetailData.orders.slice(0, 5).map((order: any) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-sm">
                            {order.invoiceNo || order.id.substring(0, 8)}
                          </TableCell>
                          <TableCell className="text-slate-500">
                            {new Date(order.saleDate).toLocaleDateString('zh-CN')}
                          </TableCell>
                          <TableCell className="text-slate-500">
                            {order.buyer?.name || '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(order.totalAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                  关闭
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}