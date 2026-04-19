import { useEffect, useState, useMemo } from 'react';
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
import { DataTableFilters, DataTablePagination, useDataTable } from '@/components/DataTable';
import { db } from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/utils';
import { EntityService } from '@/services/EntityService';
import { toast } from '@/components/Toast';
import type { Entity, Contact, BizProject, SaleOrder } from '@/lib/types';

type EntityWithRelations = Entity & {
  contact: Contact | null;
  projects?: BizProject[];
  orders?: SaleOrder[];
};

const entityTypeOptions = [
  { value: 'company', label: '公司/企业' },
  { value: 'government', label: '政府/事业单位' },
  { value: 'personal', label: '个人' },
];

const filters = [
  { key: 'entityType', label: '主体类型', type: 'select' as const, options: entityTypeOptions },
  { key: 'search', label: '关键词', type: 'text' as const, placeholder: '主体名称/联系人/地址...' },
];

export function Entities() {
  const [entities, setEntities] = useState<EntityWithRelations[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<EntityWithRelations | null>(null);
  const [entityProjects, setEntityProjects] = useState<BizProject[]>([]);
  const [entityOrders, setEntityOrders] = useState<SaleOrder[]>([]);
  const [entityStats, setEntityStats] = useState<Record<string, { total: number; paid: number; count: number }>>({});
  const [viewLoading, setViewLoading] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});

  const [formData, setFormData] = useState({
    name: '',
    entityType: 'company' as 'company' | 'government' | 'personal',
    contactId: '',
    address: '',
    remark: '',
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    entityType: 'company' as 'company' | 'government' | 'personal',
    contactId: '',
    address: '',
    remark: '',
  });

  useEffect(() => {
    loadContacts();
    loadData();
  }, []);

  useEffect(() => {
    if (showAddDialog) {
      loadContacts();
    }
  }, [showAddDialog]);

  useEffect(() => {
    if (!showAddDialog) {
      setFormData({
        name: '',
        entityType: 'company',
        contactId: '',
        address: '',
        remark: '',
      });
    }
  }, [showAddDialog]);

  const loadContacts = async () => {
    try {
      const contactsData = await EntityService.getContacts();
      setContacts(contactsData.filter(c => c.contactType === 'customer' || c.contactType === 'company'));
    } catch (error) {
      console.error('[Entities] 加载联系人失败:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const { entities: entitiesData, stats } = await EntityService.getAllEntitiesStats();

      setEntities(entitiesData);
      setEntityStats(stats);
    } catch (error) {
      console.error('[Entities] 加载主体失败:', error);
      toast('加载数据失败，请刷新页面重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilterValues({});
  };

  const filteredEntities = useMemo(() => {
    return entities.filter((entity) => {
      if (filterValues.entityType && entity.entityType !== filterValues.entityType) {
        return false;
      }
      if (filterValues.search) {
        const search = filterValues.search.toLowerCase();
        const matchName = entity.name.toLowerCase().includes(search);
        const matchContact = entity.contact?.name.toLowerCase().includes(search);
        const matchAddress = entity.address?.toLowerCase().includes(search);
        if (!matchName && !matchContact && !matchAddress) {
          return false;
        }
      }
      return true;
    });
  }, [entities, filterValues]);

  const tableProps = useDataTable<EntityWithRelations>({
    data: filteredEntities,
    defaultPageSize: 20,
  });

  const handleViewEntity = async (entity: EntityWithRelations) => {
    setViewLoading(true);
    setSelectedEntity(entity);
    try {
      const [projectsData, ordersData] = await Promise.all([
        EntityService.getProjectsByEntity(entity.id),
        EntityService.getEntityOrders(entity.id),
      ]);
      setEntityProjects(projectsData);
      setEntityOrders(ordersData);
      setShowDetailDialog(true);
    } catch (error) {
      console.error('[Entities] 加载主体详情失败:', error);
      toast('加载主体详情失败，请重试', 'error');
    } finally {
      setViewLoading(false);
    }
  };

  const handleAddEntity = async () => {
    if (!formData.name) {
      toast('请填写必填项（主体名称）', 'warning');
      return;
    }

    try {
      await EntityService.createEntity({
        name: formData.name,
        entityType: formData.entityType,
        contactId: formData.contactId || undefined,
        address: formData.address || undefined,
        remark: formData.remark || undefined,
      });

      setShowAddDialog(false);
      setFormData({
        name: '',
        entityType: 'company',
        contactId: '',
        address: '',
        remark: '',
      });
      loadData();
      toast('主体添加成功', 'success');
    } catch (error) {
      console.error('[Entities] 添加主体失败:', error);
      toast('添加失败，请重试', 'error');
    }
  };

  const handleEditEntity = async () => {
    if (!editFormData.name) {
      toast('请填写必填项（主体名称）', 'warning');
      return;
    }

    if (!selectedEntity) {
      toast('未选择要编辑的主体', 'error');
      return;
    }

    try {
      await EntityService.updateEntity(selectedEntity.id, {
        name: editFormData.name,
        entityType: editFormData.entityType,
        contactId: editFormData.contactId || undefined,
        address: editFormData.address || undefined,
        remark: editFormData.remark || undefined,
      });

      setShowEditDialog(false);
      setEditFormData({
        name: '',
        entityType: 'company',
        contactId: '',
        address: '',
        remark: '',
      });
      loadData();
      toast('主体修改成功', 'success');
    } catch (error) {
      console.error('[Entities] 修改主体失败:', error);
      toast('修改失败，请重试', 'error');
    }
  };

  const openEditDialog = (entity: EntityWithRelations) => {
    setSelectedEntity(entity);
    setEditFormData({
      name: entity.name,
      entityType: entity.entityType as 'company' | 'government' | 'personal',
      contactId: entity.contact?.id || '',
      address: entity.address || '',
      remark: entity.remark || '',
    });
    setShowEditDialog(true);
  };

  const handleDeleteEntity = async (entityId: string) => {
    try {
      const stats = entityStats[entityId];
      if (stats && stats.count > 0) {
        toast(`该主体已关联 ${stats.count} 笔销售订单，无法删除`, 'warning');
        return;
      }

      await EntityService.deleteEntity(entityId);
      loadData();
      toast('主体删除成功', 'success');
    } catch (error) {
      console.error('[Entities] 删除主体失败:', error);
      toast('删除失败，请重试', 'error');
    }
  };

  const getEntityTypeBadge = (type: string) => {
    switch (type) {
      case 'company':
        return <Badge className="bg-blue-500 hover:bg-blue-600">公司</Badge>;
      case 'government':
        return <Badge className="bg-purple-500 hover:bg-purple-600">政府/事业单位</Badge>;
      case 'personal':
        return <Badge variant="secondary">个人</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const totalEntityAmount = filteredEntities.reduce((sum, e) => sum + (entityStats[e.id]?.total || 0), 0);
  const totalPaidAmount = filteredEntities.reduce((sum, e) => sum + (entityStats[e.id]?.paid || 0), 0);

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
          <h2 className="text-2xl font-bold text-slate-800">挂靠主体管理</h2>
          <p className="text-slate-500 mt-1">管理公司/施工队等挂靠主体及其销售订单</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => setShowAddDialog(true)}>
          + 添加主体
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-800">{filteredEntities.length}</div>
            <div className="text-sm text-slate-500">主体总数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {filteredEntities.filter((e) => e.entityType === 'company').length}
            </div>
            <div className="text-sm text-slate-500">公司</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalEntityAmount)}</div>
            <div className="text-sm text-slate-500">主体销售额</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaidAmount)}</div>
            <div className="text-sm text-slate-500">已收款</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <DataTableFilters
            filters={filters}
            values={filterValues}
            onChange={handleFilterChange}
            onReset={handleResetFilters}
          />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>主体名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>联系人</TableHead>
                <TableHead>联系电话</TableHead>
                <TableHead>订单数</TableHead>
                <TableHead className="text-right">销售总额</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableProps.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    暂无主体数据
                  </TableCell>
                </TableRow>
              ) : (
                tableProps.data.map((entity) => (
                  <TableRow key={entity.id} className="cursor-pointer hover:bg-slate-50" onClick={() => handleViewEntity(entity)}>
                    <TableCell className="font-medium">{entity.name}</TableCell>
                    <TableCell>{getEntityTypeBadge(entity.entityType)}</TableCell>
                    <TableCell>{entity.contact?.name || '-'}</TableCell>
                    <TableCell className="text-slate-500">
                      {entity.contact?.primaryPhone || entity.contact?.phones || '-'}
                    </TableCell>
                    <TableCell className="font-mono">{entityStats[entity.id]?.count || 0}</TableCell>
                    <TableCell className="text-right font-mono text-orange-600">
                      {formatCurrency(entityStats[entity.id]?.total || 0)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleViewEntity(entity)}>
                          详情
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleDeleteEntity(entity.id)}
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

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>添加挂靠主体</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                主体名称 <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如: 江城装饰工程有限公司"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">主体类型</label>
              <Select
                value={formData.entityType}
                onValueChange={(v) => setFormData({ ...formData, entityType: v as 'company' | 'government' | 'personal' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {entityTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">关联联系人</label>
              <Select
                value={formData.contactId || '__none__'}
                onValueChange={(v) => setFormData({ ...formData, contactId: v === '__none__' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择联系人（可选）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">无</SelectItem>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name} ({contact.contactType === 'plumber' ? '水电工' : '客户'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">主体地址</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="例如: XX市XX区XX路XX号"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">备注</label>
              <Input
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                placeholder="可选"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
            <Button onClick={handleAddEntity} className="bg-orange-500 hover:bg-orange-600">保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑挂靠主体</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                主体名称 <span className="text-red-500">*</span>
              </label>
              <Input
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="例如: 江城装饰工程有限公司"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">主体类型</label>
              <Select
                value={editFormData.entityType}
                onValueChange={(v) => setEditFormData({ ...editFormData, entityType: v as 'company' | 'government' | 'personal' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {entityTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">关联联系人</label>
              <Select
                value={editFormData.contactId || '__none__'}
                onValueChange={(v) => setEditFormData({ ...editFormData, contactId: v === '__none__' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择联系人（可选）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">无</SelectItem>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name} ({contact.contactType === 'plumber' ? '水电工' : '客户'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">主体地址</label>
              <Input
                value={editFormData.address}
                onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                placeholder="例如: XX市XX区XX路XX号"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">备注</label>
              <Input
                value={editFormData.remark}
                onChange={(e) => setEditFormData({ ...editFormData, remark: e.target.value })}
                placeholder="可选"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>取消</Button>
            <Button onClick={handleEditEntity} className="bg-blue-500 hover:bg-blue-600">保存修改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>主体详情</DialogTitle>
          </DialogHeader>

          {selectedEntity && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium mb-3">基本信息</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">主体名称:</span>
                      <span className="font-medium">{selectedEntity.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">主体类型:</span>
                      <span>{getEntityTypeBadge(selectedEntity.entityType)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">联系人:</span>
                      <span>{selectedEntity.contact?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">联系电话:</span>
                      <span>{selectedEntity.contact?.primaryPhone || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">主体地址:</span>
                      <span>{selectedEntity.address || '-'}</span>
                    </div>
                    {selectedEntity.remark && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">备注:</span>
                        <span>{selectedEntity.remark}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium mb-3">销售统计</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">关联订单:</span>
                      <span className="font-bold text-orange-600">{entityStats[selectedEntity.id]?.count || 0} 笔</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">销售总额:</span>
                      <span className="font-bold">{formatCurrency(entityStats[selectedEntity.id]?.total || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">已收款:</span>
                      <span className="text-green-600">{formatCurrency(entityStats[selectedEntity.id]?.paid || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">待收款:</span>
                      <span className="text-red-600 font-bold">
                        {formatCurrency((entityStats[selectedEntity.id]?.total || 0) - (entityStats[selectedEntity.id]?.paid || 0))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">关联项目:</span>
                      <span>{entityProjects.length} 个</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">关联项目 ({entityProjects.length})</h4>
                {entityProjects.length === 0 ? (
                  <div className="text-center py-4 text-slate-500 bg-slate-50 rounded-lg">
                    暂无关联项目
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden mb-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>项目名称</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>开始日期</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entityProjects.map((project) => (
                          <TableRow key={project.id}>
                            <TableCell className="font-medium">{project.name}</TableCell>
                            <TableCell>
                              <Badge variant={project.status === '进行中' ? 'default' : 'secondary'}>
                                {project.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-500 text-sm">
                              {project.startDate ? formatDate(project.startDate) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-3">关联销售订单 ({entityOrders.length})</h4>
                {entityOrders.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
                    暂无关联销售订单
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>单据号</TableHead>
                          <TableHead>日期</TableHead>
                          <TableHead>购货人</TableHead>
                          <TableHead>项目</TableHead>
                          <TableHead className="text-right">金额</TableHead>
                          <TableHead className="text-right">已付</TableHead>
                          <TableHead>状态</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entityOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-sm">
                              {order.invoiceNo || order.writtenInvoiceNo || order.id.substring(0, 8)}
                            </TableCell>
                            <TableCell className="text-slate-500 text-sm">
                              {formatDate(order.saleDate)}
                            </TableCell>
                            <TableCell>{order.buyer?.name || '-'}</TableCell>
                            <TableCell>{order.project?.name || '-'}</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(order.totalAmount)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-green-600">
                              {formatCurrency(order.paidAmount)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                                {order.status === 'completed' ? '已完成' : order.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                  关闭
                </Button>
                <Button onClick={() => { setShowDetailDialog(false); openEditDialog(selectedEntity); }} className="bg-blue-500 hover:bg-blue-600">
                  编辑
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {viewLoading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg">
            <div className="text-slate-500">加载中...</div>
          </div>
        </div>
      )}
    </div>
  );
}